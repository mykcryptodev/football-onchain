// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.26;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract GameScoreOracle is ConfirmedOwner, FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;
    using Strings for uint256;

    string public constant SOURCE =
        "const eventId=args[0];"
        "const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';"
        "const sportsApiRequest=Functions.makeHttpRequest({url:url+'?event='+eventId,headers:{\"Content-Type\":\"application/json\",}});"
        "const sportsApiResponse=await sportsApiRequest;"
        "if(sportsApiResponse.error){console.error(JSON.stringify(sportsApiResponse));console.error(sportsApiResponse.error);throw Error(\"Request failed\")}"
        "const data=sportsApiResponse.data;if(data.Response===\"Error\"){console.error(data.Message);throw Error('Functional error. Read message: '+data.Message)}"
        "const teams=data.header.competitions[0].competitors;const homeTeam=teams.find(team=>team.homeAway===\"home\");const awayTeam=teams.find(team=>team.homeAway===\"away\");if(!homeTeam||!awayTeam){throw Error(\"Unable to find home or away team\")}"
        "const gameCompleted=data.header.competitions[0].status.type.completed||false;const qComplete=gameCompleted?100:data.header.competitions[0].status.period-1;"
        "const homeTeamScores=homeTeam.linescores;const homeQ1=qComplete<1?0:parseInt(homeTeamScores[0]?.[\"displayValue\"]||0);const homeQ2=qComplete<2?0:parseInt(homeTeamScores[1]?.[\"displayValue\"]||0);const homeQ3=qComplete<3?0:parseInt(homeTeamScores[2]?.[\"displayValue\"]||0);const homeF=qComplete<100?0:parseInt(homeTeam.score||0);const homeQ1LastDigit=qComplete<1?0:parseInt(homeQ1.toString().slice(-1));const homeQ2LastDigit=qComplete<2?0:parseInt((homeQ1+homeQ2).toString().slice(-1));const homeQ3LastDigit=qComplete<3?0:parseInt((homeQ1+homeQ2+homeQ3).toString().slice(-1));const homeFLastDigit=parseInt(homeF.toString().slice(-1));"
        "const awayTeamScores=awayTeam.linescores;const awayQ1=qComplete<1?0:parseInt(awayTeamScores[0]?.[\"displayValue\"]||0);const awayQ2=qComplete<2?0:parseInt(awayTeamScores[1]?.[\"displayValue\"]||0);const awayQ3=qComplete<3?0:parseInt(awayTeamScores[2]?.[\"displayValue\"]||0);const awayF=qComplete<100?0:parseInt(awayTeam.score||0);const awayQ1LastDigit=qComplete<1?0:parseInt(awayQ1.toString().slice(-1));const awayQ2LastDigit=qComplete<2?0:parseInt((awayQ1+awayQ2).toString().slice(-1));const awayQ3LastDigit=qComplete<3?0:parseInt((awayQ1+awayQ2+awayQ3).toString().slice(-1));const awayFLastDigit=parseInt(awayF.toString().slice(-1));"
        "const scoringPlays=data.scoringPlays||[];let scoreChanges=[];scoringPlays.forEach(play=>{const homeScore=play.homeScore||0;const awayScore=play.awayScore||0;const quarter=play.period?.number||1;const homeLastDigit=parseInt(homeScore.toString().slice(-1));const awayLastDigit=parseInt(awayScore.toString().slice(-1));scoreChanges.push({homeScore,awayScore,quarter,homeLastDigit,awayLastDigit})});"
        "function numberToUint256(num){const hex=BigInt(num).toString(16);return hex.padStart(64,'0')}"
        "function packDigits(...digits){return digits.reduce((acc,val)=>acc*10+val,0)}"
        "const packedQuarterScores=(BigInt(homeQ1)<<248)|(BigInt(homeQ2)<<240)|(BigInt(homeQ3)<<232)|(BigInt(homeF)<<224)|(BigInt(awayQ1)<<216)|(BigInt(awayQ2)<<208)|(BigInt(awayQ3)<<200)|(BigInt(awayF)<<192);"
        "const packedQuarterDigits=(BigInt(homeQ1LastDigit)<<252)|(BigInt(homeQ2LastDigit)<<248)|(BigInt(homeQ3LastDigit)<<244)|(BigInt(homeFLastDigit)<<240)|(BigInt(awayQ1LastDigit)<<236)|(BigInt(awayQ2LastDigit)<<232)|(BigInt(awayQ3LastDigit)<<228)|(BigInt(awayFLastDigit)<<224);"
        "let packedResult=[qComplete,gameCompleted?1:0,scoreChanges.length,packedQuarterScores,packedQuarterDigits];"
        "for(let i=0;i<Math.min(scoreChanges.length,32);i+=8){let packedUint256=BigInt(0);for(let j=0;j<8&&i+j<scoreChanges.length;j++){const change=scoreChanges[i+j];const packedChange=BigInt((change.homeScore<<20)|(change.awayScore<<8)|(change.quarter<<5)|(change.homeLastDigit<<1)|change.awayLastDigit);packedUint256|=(packedChange<<BigInt(j*32))}packedResult.push(packedUint256)}"
        "const encodedResult='0x'+packedResult.map(numberToUint256).join('');"
        "function hexToUint8Array(hexString){if(hexString.startsWith('0x')){hexString=hexString.slice(2)}"
        "const bytes=new Uint8Array(hexString.length/2);for(let i=0;i<hexString.length;i+=2){bytes[i/2]=parseInt(hexString.substr(i,2),16)}"
        "return bytes}"
        "return hexToUint8Array(encodedResult);";

    string public constant SCORE_CHANGES_SOURCE =
        "const eventId=args[0];"
        "const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';"
        "const response=await Functions.makeHttpRequest({url:`${url}?event=${eventId}`});"
        "if(!response.data)throw new Error('No data received');"
        "const data=response.data;"
        "const scoreChanges=data.scoringPlays||[];"
        "let packedResult=[scoreChanges.length];"
        "for(let i=0;i<Math.min(scoreChanges.length,64);i+=8){"
        "let packedUint256=BigInt(0);"
        "for(let j=0;j<8&&i+j<scoreChanges.length;j++){"
        "const change=scoreChanges[i+j];"
        "const homeLastDigit=change.homeScore%10;"
        "const awayLastDigit=change.awayScore%10;"
        "const packedChange=(homeLastDigit<<1)|awayLastDigit;"
        "packedUint256|=(BigInt(packedChange)<<BigInt(j*32));"
        "}"
        "packedResult.push(packedUint256);"
        "}"
        "const encodedResult='0x'+packedResult.map(numberToUint256).join('');"
        "function hexToUint8Array(hexString){if(hexString.startsWith('0x')){hexString=hexString.slice(2)}"
        "const bytes=new Uint8Array(hexString.length/2);for(let i=0;i<hexString.length;i+=2){bytes[i/2]=parseInt(hexString.substr(i,2),16)}"
        "return bytes}"
        "return hexToUint8Array(encodedResult);";

    struct ScoreChangeEvent {
        uint8 homeLastDigit;   // Last digit of home score for boxes calculation
        uint8 awayLastDigit;   // Last digit of away score for boxes calculation
    }

    struct GameScore {
        uint256 id; // a unique id for this game determined by the outside world data set
        uint8 qComplete; // the number of the last period that has been completed including OT. expect 100 for the game to be considered final.
        bool requestInProgress; // true if there is a pending oracle request
        bool gameCompleted; // true if the game is officially completed (from status.type.completed)
        uint256 packedQuarterScores; // Packed quarter scores: homeQ1(8) + homeQ2(8) + homeQ3(8) + homeF(8) + awayQ1(8) + awayQ2(8) + awayQ3(8) + awayF(8) + padding(192)
        uint256 packedQuarterDigits; // Packed quarter digits: homeQ1(4) + homeQ2(4) + homeQ3(4) + homeF(4) + awayQ1(4) + awayQ2(4) + awayQ3(4) + awayF(4) + padding(224)
        uint8 totalScoreChanges; // Total number of score changes (for reference)
    }
    // cooldown before a game can be requested again for quarter scores
    uint256 public constant QUARTER_SCORES_REQUEST_COOLDOWN = 10 minutes;
    // cooldown before score changes can be requested again for a specific game
    uint256 public constant SCORE_CHANGES_REQUEST_COOLDOWN = 5 minutes;
    // gameId => GameScore object
    mapping (uint256 gameId => GameScore gameScore) public gameScores;
    // gameId => packed score changes (only stored when requested)
    mapping (uint256 gameId => uint256[] packedScoreChanges) public gameScoreChanges;
    // chainlink requestId => gameId
    mapping (bytes32 requestId => uint256 gameId) public gameScoreRequests;
    // Request types enum
    enum RequestType {
        QUARTER_SCORES,
        SCORE_CHANGES
    }
    // chainlink requestId => request type
    mapping (bytes32 requestId => RequestType requestType) public requestTypes;
    // errors for games returned by oracle
    mapping (uint256 gameId => bytes error) public gameScoreErrors;
    // map the last time a gameId had a request
    mapping (uint256 gameId => uint256 lastUpdatedTimestamp) public quarterScoresLastRequestTime;
    mapping (uint256 gameId => uint256 lastUpdatedTimestamp) public scoreChangesLastRequestTime;

    ////////////////////////////////////
    ///////////    EVENTS    ///////////
    ////////////////////////////////////
    event GameScoresRequested(uint256 indexed gameId, bytes32 requestId); // someone requested game scores from the real world
    event GameScoresUpdated(uint256 indexed gameId, bytes32 requestId); // game scores were updated
    event ScoreChangesRequested(uint256 indexed gameId, bytes32 requestId); // a request was made to fetch score changes
    event ScoreChangesUpdated(uint256 indexed gameId, bytes32 requestId); // score changes were updated
    event GameScoreError(uint256 indexed gameId, bytes error); // there was an error fetching game scores

    ////////////////////////////////////
    ///////////    ERRORS    ///////////
    ////////////////////////////////////
    error ScoreChangeIndexOutOfBounds();
    error CooldownNotMet();
    error GameNotCompleted();
    error ScoreChangesAlreadyStored();

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
        uint256 packedQuarterDigits = gameScore.packedQuarterDigits;

        // Unpack quarter digits from packed format
        homeQ1LastDigit = uint8((packedQuarterDigits >> 252) & 0xF);
        homeQ2LastDigit = uint8((packedQuarterDigits >> 248) & 0xF);
        homeQ3LastDigit = uint8((packedQuarterDigits >> 244) & 0xF);
        homeFLastDigit = uint8((packedQuarterDigits >> 240) & 0xF);
        awayQ1LastDigit = uint8((packedQuarterDigits >> 236) & 0xF);
        awayQ2LastDigit = uint8((packedQuarterDigits >> 232) & 0xF);
        awayQ3LastDigit = uint8((packedQuarterDigits >> 228) & 0xF);
        awayFLastDigit = uint8((packedQuarterDigits >> 224) & 0xF);

        return (
            homeQ1LastDigit,
            homeQ2LastDigit,
            homeQ3LastDigit,
            homeFLastDigit,
            awayQ1LastDigit,
            awayQ2LastDigit,
            awayQ3LastDigit,
            awayFLastDigit,
            gameScore.qComplete,
            gameScore.requestInProgress
        );
    }

    /**
     * @notice Get whether a game is officially completed
     * @param gameId The game ID to check
     * @return gameCompleted True if the game is officially completed
     */
    function isGameCompleted(uint256 gameId) external view returns (bool) {
        return gameScores[gameId].gameCompleted;
    }

    /**
     * @notice Get total number of score changes for a specific game
     * @param gameId The unique id of the game
     * @return totalScoreChanges Total number of score changes
     */
    function getTotalScoreChanges(uint256 gameId) external view returns (uint8) {
        return gameScores[gameId].totalScoreChanges;
    }

    /**
     * @notice Get score changes for a specific game
     * @param gameId The unique id of the game
     * @return scoreChanges Array of score change events
     */
    function getScoreChanges(uint256 gameId) external view returns (ScoreChangeEvent[] memory) {
        uint256[] memory packedScoreChanges = gameScoreChanges[gameId];
        uint8 totalScoreChanges = gameScores[gameId].totalScoreChanges;

        ScoreChangeEvent[] memory scoreChanges = new ScoreChangeEvent[](totalScoreChanges);

        for (uint8 i = 0; i < totalScoreChanges; i++) {
            uint8 uint256Index = i / 8;
            uint8 offsetInUint256 = i % 8;

            uint256 packedUint256 = packedScoreChanges[uint256Index];
            uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

            uint8 homeLastDigit = uint8((packedChange >> 1) & 0xF);
            uint8 awayLastDigit = uint8(packedChange & 0xF);

            scoreChanges[i] = ScoreChangeEvent({
                homeLastDigit: homeLastDigit,
                awayLastDigit: awayLastDigit
            });
        }

        return scoreChanges;
    }

    /**
     * @notice Get a specific score change by index
     * @param gameId The game ID
     * @param index The index of the score change (0-based)
     * @return scoreChange The score change event at the specified index
     */
    function getScoreChange(uint256 gameId, uint256 index) external view returns (ScoreChangeEvent memory) {
        uint256[] memory packedScoreChanges = gameScoreChanges[gameId];
        uint8 totalScoreChanges = gameScores[gameId].totalScoreChanges;

        if (index >= totalScoreChanges) revert ScoreChangeIndexOutOfBounds();

        uint8 uint256Index = uint8(index / 8);
        uint8 offsetInUint256 = uint8(index % 8);

        uint256 packedUint256 = packedScoreChanges[uint256Index];
        uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

        uint8 homeLastDigit = uint8((packedChange >> 1) & 0xF);
        uint8 awayLastDigit = uint8(packedChange & 0xF);

        return ScoreChangeEvent({
            homeLastDigit: homeLastDigit,
            awayLastDigit: awayLastDigit
        });
    }

    /**
     * @notice Check if score changes are available for a game
     * @param gameId The game ID
     * @return available True if score changes are stored
     */
    function areScoreChangesAvailable(uint256 gameId) external view returns (bool) {
        return gameScoreChanges[gameId].length > 0;
    }

    /**
     * @notice Get quarter scores for a game
     * @param gameId The game ID
     * @return homeQ1 Home team Q1 score
     * @return homeQ2 Home team Q2 score
     * @return homeQ3 Home team Q3 score
     * @return homeF Home team final score
     * @return awayQ1 Away team Q1 score
     * @return awayQ2 Away team Q2 score
     * @return awayQ3 Away team Q3 score
     * @return awayF Away team final score
     */
    function getQuarterScores(uint256 gameId) external view returns (
        uint8 homeQ1,
        uint8 homeQ2,
        uint8 homeQ3,
        uint8 homeF,
        uint8 awayQ1,
        uint8 awayQ2,
        uint8 awayQ3,
        uint8 awayF
    ) {
        uint256 packedQuarterScores = gameScores[gameId].packedQuarterScores;

        homeQ1 = uint8((packedQuarterScores >> 248) & 0xFF);
        homeQ2 = uint8((packedQuarterScores >> 240) & 0xFF);
        homeQ3 = uint8((packedQuarterScores >> 232) & 0xFF);
        homeF = uint8((packedQuarterScores >> 224) & 0xFF);
        awayQ1 = uint8((packedQuarterScores >> 216) & 0xFF);
        awayQ2 = uint8((packedQuarterScores >> 208) & 0xFF);
        awayQ3 = uint8((packedQuarterScores >> 200) & 0xFF);
        awayF = uint8((packedQuarterScores >> 192) & 0xFF);
    }

    /**
     * @notice Send a simple request for quarter data
     * @param subscriptionId Billing ID
     * @param gasLimit Gas limit for the request
     * @param jobId bytes32 representation of donId
     * @param gameId The unique id of the game to fetch scores for
     */
    function fetchGameScores(
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 jobId,
        uint256 gameId
    ) external returns (bytes32 requestId) {
        // check to make sure that we haven't requested quarter scores for this game in the last 10 minutes
        if (block.timestamp - quarterScoresLastRequestTime[gameId] <= QUARTER_SCORES_REQUEST_COOLDOWN) {
            revert CooldownNotMet();
        }
        // update the last request time for quarter scores
        quarterScoresLastRequestTime[gameId] = block.timestamp;

        // create a chainlink request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);

        // Create args array with gameId
        string[] memory args = new string[](1);
        args[0] = gameId.toString();
        req.setArgs(args);
        // store the requestId so we can map it back to the game when fulfilled
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            jobId
        );
        gameScoreRequests[requestId] = gameId;
        requestTypes[requestId] = RequestType.QUARTER_SCORES;
        // let users know that there is a pending request to update scores
        GameScore storage gameScore = gameScores[gameId];
        gameScore.requestInProgress = true;
        emit GameScoresRequested(gameId, requestId);
    }

    /**
     * @notice Send a request for score changes data (only if game is completed)
     * @param subscriptionId Billing ID
     * @param gasLimit Gas limit for the request
     * @param jobId bytes32 representation of donId
     * @param gameId The unique id of the game to fetch score changes for
     */
    function fetchScoreChanges(
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 jobId,
        uint256 gameId
    ) external returns (bytes32 requestId) {
        // Check if game is completed
        if (!gameScores[gameId].gameCompleted) {
            revert GameNotCompleted();
        }

        // Check if score changes are already stored
        if (gameScoreChanges[gameId].length > 0) {
            revert ScoreChangesAlreadyStored();
        }

        // Check cooldown for score changes requests
        if (block.timestamp - scoreChangesLastRequestTime[gameId] <= SCORE_CHANGES_REQUEST_COOLDOWN) {
            revert CooldownNotMet();
        }

        // Update the last request time for score changes
        scoreChangesLastRequestTime[gameId] = block.timestamp;

        // Create a chainlink request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SCORE_CHANGES_SOURCE);

        // Create args array with gameId
        string[] memory args = new string[](1);
        args[0] = gameId.toString();
        req.setArgs(args);

        // Store the requestId so we can map it back to the game when fulfilled
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            jobId
        );
        gameScoreRequests[requestId] = gameId;
        requestTypes[requestId] = RequestType.SCORE_CHANGES;

        emit ScoreChangesRequested(gameId, requestId);
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
        RequestType requestType = requestTypes[requestId];

        // store an error if one exists
        if (err.length > 0) {
            gameScoreErrors[gameId] = err;
            emit GameScoreError(gameId, err);
            return;
        }

        if (requestType == RequestType.QUARTER_SCORES) {
            _fulfillQuarterScoresRequest(gameId, response, requestId);
        } else if (requestType == RequestType.SCORE_CHANGES) {
            _fulfillScoreChangesRequest(gameId, response, requestId);
        }
    }

    function _fulfillQuarterScoresRequest(
        uint256 gameId,
        bytes memory response,
        bytes32 requestId
    ) internal {
        // Extract quarter-end scores from the bytes response
        uint8 qComplete = uint8(_bytesToUint256(response, 0));
        bool gameCompleted = _bytesToUint256(response, 1) == 1;
        uint8 totalScoreChanges = uint8(_bytesToUint256(response, 2));
        uint256 packedQuarterScores = _bytesToUint256(response, 3);
        uint256 packedQuarterDigits = _bytesToUint256(response, 4);

        // Create GameScore in memory (no score changes processing for gas efficiency)
        GameScore memory newGameScore = GameScore({
            id: gameId,
            qComplete: qComplete,
            requestInProgress: false,
            gameCompleted: gameCompleted,
            packedQuarterScores: packedQuarterScores,
            packedQuarterDigits: packedQuarterDigits,
            totalScoreChanges: totalScoreChanges
        });

        // Write entire GameScore to storage in one operation
        gameScores[gameId] = newGameScore;

        emit GameScoresUpdated(gameId, requestId);
    }

    function _fulfillScoreChangesRequest(
        uint256 gameId,
        bytes memory response,
        bytes32 requestId
    ) internal {
        // Extract score changes from the bytes response
        uint8 totalScoreChanges = uint8(_bytesToUint256(response, 0));

        // Calculate how many uint256s we need to store all score changes
        uint8 numUint256s = (totalScoreChanges + 7) / 8; // Round up to nearest 8
        uint256[] memory packedScoreChanges = new uint256[](numUint256s);

        // Copy packed score changes directly from response (starting at index 1)
        for (uint8 i = 0; i < numUint256s; i++) {
            packedScoreChanges[i] = _bytesToUint256(response, 1 + i);
        }

        // Store packed score changes (much more gas efficient!)
        gameScoreChanges[gameId] = packedScoreChanges;

        emit ScoreChangesUpdated(gameId, requestId);
    }

    function timeUntilQuarterScoresCooldownExpires(uint256 gameId) external view returns (uint256) {
        uint256 timeSinceLastRequest = block.timestamp - quarterScoresLastRequestTime[gameId];
        if (timeSinceLastRequest > QUARTER_SCORES_REQUEST_COOLDOWN) {
            return 0;
        } else {
            return QUARTER_SCORES_REQUEST_COOLDOWN - timeSinceLastRequest;
        }
    }

    function timeUntilScoreChangesCooldownExpires(uint256 gameId) external view returns (uint256) {
        uint256 timeSinceLastRequest = block.timestamp - scoreChangesLastRequestTime[gameId];
        if (timeSinceLastRequest > SCORE_CHANGES_REQUEST_COOLDOWN) {
            return 0;
        } else {
            return SCORE_CHANGES_REQUEST_COOLDOWN - timeSinceLastRequest;
        }
    }
}

function _bytesToUint256(bytes memory input, uint8 index) pure returns (uint256 result) {
    for (uint8 i = 0; i < 32; i++) {
        result |= uint256(uint8(input[index * 32 + i])) << (8 * (31 - i));
    }
}
