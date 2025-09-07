// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

contract GameScoreOracle is ConfirmedOwner, FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    string public constant SOURCE =
        "const eventId=args[0];"
        "const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';"
        "const sportsApiRequest=Functions.makeHttpRequest({url:url+'?event='+eventId,headers:{\"Content-Type\":\"application/json\",}});"
        "const sportsApiResponse=await sportsApiRequest;"
        "if(sportsApiResponse.error){console.error(JSON.stringify(sportsApiResponse));console.error(sportsApiResponse.error);throw Error(\"Request failed\")}"
        "const data=sportsApiResponse.data;if(data.Response===\"Error\"){console.error(data.Message);throw Error('Functional error. Read message: '+data.Message)}"
        "const teams=data.header.competitions[0].competitors;const homeTeam=teams.find(team=>team.homeAway===\"home\");const awayTeam=teams.find(team=>team.homeAway===\"away\");if(!homeTeam||!awayTeam){throw Error(\"Unable to find home or away team\")}"
        "const qComplete=data.header.competitions[0].status.type.completed?100:data.header.competitions[0].status.period-1;const homeTeamScores=homeTeam.linescores;const homeQ1=qComplete<1?0:parseInt(homeTeamScores[0]?.[\"displayValue\"]||0);const homeQ2=qComplete<2?0:parseInt(homeTeamScores[1]?.[\"displayValue\"]||0);const homeQ3=qComplete<3?0:parseInt(homeTeamScores[2]?.[\"displayValue\"]||0);const homeF=qComplete<100?0:parseInt(homeTeam.score?.slice(-1)||0);const homeQ1LastDigit=qComplete<1?0:parseInt(homeQ1.toString().slice(-1));const homeQ2LastDigit=qComplete<2?0:parseInt((homeQ1+homeQ2).toString().slice(-1));const homeQ3LastDigit=qComplete<3?0:parseInt((homeQ1+homeQ2+homeQ3).toString().slice(-1));const homeFLastDigit=parseInt(homeF);"
        "const awayTeamScores=awayTeam.linescores;const awayQ1=qComplete<1?0:parseInt(awayTeamScores[0]?.[\"displayValue\"]||0);const awayQ2=qComplete<2?0:parseInt(awayTeamScores[1]?.[\"displayValue\"]||0);const awayQ3=qComplete<3?0:parseInt(awayTeamScores[2]?.[\"displayValue\"]||0);const awayF=qComplete<100?0:parseInt(awayTeam.score?.slice(-1)||0);const awayQ1LastDigit=qComplete<1?0:parseInt(awayQ1.toString().slice(-1));const awayQ2LastDigit=qComplete<2?0:parseInt((awayQ1+awayQ2).toString().slice(-1));const awayQ3LastDigit=qComplete<3?0:parseInt((awayQ1+awayQ2+awayQ3).toString().slice(-1));const awayFLastDigit=parseInt(awayF);"
        "function numberToUint256(num){const hex=BigInt(num).toString(16);return hex.padStart(64,'0')}"
        "function packDigits(...digits){return digits.reduce((acc,val)=>acc*10+val,0)}"
        "const digits=packDigits(homeQ1LastDigit,homeQ2LastDigit,homeQ3LastDigit,homeFLastDigit,awayQ1LastDigit,awayQ2LastDigit,awayQ3LastDigit,awayFLastDigit);const packedResult=[digits,qComplete,];"
        "const encodedResult='0x'+packedResult.map(numberToUint256).join('');"
        "function hexToUint8Array(hexString){if(hexString.startsWith('0x')){hexString=hexString.slice(2)}"
        "const byteArray=new Uint8Array(hexString.length/2);for(let i=0;i<byteArray.length;i++){byteArray[i]=parseInt(hexString.substr(i*2,2),16)}"
        "return byteArray}"
        "const uint8ArrayResult=hexToUint8Array(encodedResult);"
        "return uint8ArrayResult";

    struct GameScore {
        uint256 id; // a unique id for this game determined by the outside world data set
        uint8 homeQ1LastDigit; // last digit of the home teams score at the end of q2
        uint8 homeQ2LastDigit; // last digit of the home team's cumulative score at the end of q1
        uint8 homeQ3LastDigit; 
        uint8 homeFLastDigit; // last digit of the home team's cumulative score at the end of the final period including OT
        uint8 awayQ1LastDigit; 
        uint8 awayQ2LastDigit; 
        uint8 awayQ3LastDigit; 
        uint8 awayFLastDigit;
        uint8 qComplete; // the number of the last period that has been completed including OT. expect 100 for the game to be considered final.
        bool requestInProgress; // true if there is a pending oracle request
    }

    // cooldown before a game can be requested again
    uint256 public constant GAME_SCORE_REQUEST_COOLDOWN = 10 minutes;
    // gameId => GameScore object
    mapping (uint256 gameId => GameScore gameScore) public gameScores;
    // chainlink requestId => gameId
    mapping (bytes32 requestId => uint256 gameId) public gameScoreRequests;
    // errors for games returned by oracle
    mapping (uint256 gameId => bytes error) public gameScoreErrors;
    // map the last time a gameId had a request
    mapping (uint256 gameId => uint256 lastUpdatedTimestamp) public gameScoreLastRequestTime;

    ////////////////////////////////////
    ///////////    EVENTS    ///////////
    ////////////////////////////////////
    event GameScoresRequested(uint256 indexed gameId, bytes32 requestId); // someone requested game scores from the real world
    event GameScoresUpdated(uint256 indexed gameId, bytes32 requestId); // game scores were updated
    event GameScoreError(uint256 indexed gameId, bytes error); // there was an error fetching game scores

    constructor(
        address router_
    )
    FunctionsClient(router_)
    ConfirmedOwner(msg.sender) {}

    function getGameScores(uint256 gameId) external view returns (
        uint8 homeQ1LastDigit,
        uint8 homeQ2LastDigit,
        uint8 homeQ3LastDigit,
        uint8 homeFLastDigit,
        uint8 awayQ1LastDigit,
        uint8 awayQ2LastDigit,
        uint8 awayQ3LastDigit,
        uint8 awayFLastDigit,
        uint8 qComplete,
        bool requestInProgress
    ) {
        GameScore memory gameScore = gameScores[gameId];
        return (
            gameScore.homeQ1LastDigit,
            gameScore.homeQ2LastDigit,
            gameScore.homeQ3LastDigit,
            gameScore.homeFLastDigit,
            gameScore.awayQ1LastDigit,
            gameScore.awayQ2LastDigit,
            gameScore.awayQ3LastDigit,
            gameScore.awayFLastDigit,
            gameScore.qComplete,
            gameScore.requestInProgress
        );
    }

    /**
     * @notice Send a simple request
     * @param args List of arguments accessible from within the source code
     * @param subscriptionId Billing ID
     * @param gasLimit Gas limit for the request
     * @param jobId bytes32 representation of donId
     * @param gameId The unique id of the game to fetch scores for
     */
    function fetchGameScores(
        string[] memory args,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 jobId,
        uint256 gameId
    ) external returns (bytes32 requestId) {
        // check to make sure that we haven't requested this game in the last 10 minutes
        require(
            block.timestamp - gameScoreLastRequestTime[gameId] > GAME_SCORE_REQUEST_COOLDOWN,
            "Cooldown not met"
        );
        // update the last request time
        gameScoreLastRequestTime[gameId] = block.timestamp;

        // create a chainlink request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);
        if (args.length > 0) req.setArgs(args);
        // store the requestId so we can map it back to the game when fulfilled
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            jobId
        );
        gameScoreRequests[requestId] = gameId;
        // let users know that there is a pending request to update scores
        GameScore storage gameScore = gameScores[gameId];
        gameScore.requestInProgress = true;
        emit GameScoresRequested(gameId, requestId);
    }

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        uint256 gameId = gameScoreRequests[requestId];
        // store an error if one exists
        if (err.length > 0) {
            gameScoreErrors[gameId] = err;
            emit GameScoreError(gameId, err);
        }
        // Extract values from the bytes response
        uint256 packedDigitsValue = _bytesToUint256(response, 0);
        
        // overwrite the gamescore with the newly fetched gamescore
        GameScore memory gameScore = GameScore(
            gameId, // gameId stored when 
            uint8(packedDigitsValue / 10**7), // homeQ1LastDigit
            uint8((packedDigitsValue / 10**6) % 10), // homeQ2LastDigit
            uint8((packedDigitsValue / 10**5) % 10), // homeQ3LastDigit
            uint8((packedDigitsValue / 10**4) % 10), // homeFLastDigit
            uint8((packedDigitsValue / 10**3) % 10), // awayQ1LastDigit
            uint8((packedDigitsValue / 10**2) % 10), // awayQ2LastDigit
            uint8((packedDigitsValue / 10**1) % 10), // awayQ3LastDigit
            uint8(packedDigitsValue % 10), // awayFLastDigit
            uint8(_bytesToUint256(response, 1)), // qComplete
            false // request is no longer in progress
        );
        gameScores[gameId] = gameScore;
        emit GameScoresUpdated(gameId, requestId);
    }

    function timeUntilCooldownExpires (uint256 gameId) external view returns (uint256) {
        uint256 timeSinceLastRequest = block.timestamp - gameScoreLastRequestTime[gameId];
        if (timeSinceLastRequest > GAME_SCORE_REQUEST_COOLDOWN) {
            return 0;
        } else {
            return GAME_SCORE_REQUEST_COOLDOWN - timeSinceLastRequest;
        }
    }
}

function _bytesToUint256(bytes memory input, uint8 index) pure returns (uint256 result) {
    for (uint8 i = 0; i < 32; i++) {
        result |= uint256(uint8(input[index * 32 + i])) << (8 * (31 - i));
    }
}

