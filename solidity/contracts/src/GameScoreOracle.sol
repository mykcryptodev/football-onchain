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

    string public constant WEEK_GAMES_SOURCE =
        "const y=args[0],s=args[1],w=args[2];"
        "const r=await Functions.makeHttpRequest({url:`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${y}&seasontype=${s}&week=${w}`});"
        "const e=r.data?.events||[];let p=[BigInt(e.length)];"
        "for(let i=0;i<e.length;i+=3){"
        "let v=0n;"
        "if(i<e.length)v|=BigInt(e[i].id)<<170n;"
        "if(i+1<e.length)v|=BigInt(e[i+1].id)<<85n;"
        "if(i+2<e.length)v|=BigInt(e[i+2].id);"
        "p.push(v);}"
        "const x='0x'+p.map(n=>n.toString(16).padStart(64,'0')).join('');"
        "const b=new Uint8Array(x.length/2-1);for(let i=2;i<x.length;i+=2)b[i/2-1]=parseInt(x.substr(i,2),16);return b;";

    string public constant WEEK_RESULTS_SOURCE =
        "const y=args[0],s=args[1],w=args[2];"
        "const r=await Functions.makeHttpRequest({url:`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${y}&seasontype=${s}&week=${w}`});"
        "const e=r.data?.events||[];let p=0n,c=0,latestGame=null,latestDate=0;"
        "for(let i=0;i<e.length;i++){const v=e[i],m=v.competitions[0].competitors;"
        "const h=m.find(t=>t.homeAway==='home'),a=m.find(t=>t.homeAway==='away');"
        "if(v.status.type.completed&&h&&a){if(+h.score>+a.score)p|=(1n<<BigInt(i));c++;}"
        "const d=new Date(v.date).getTime();if(d>latestDate){latestDate=d;latestGame=v.id;}}"
        "let totalPoints=0n,tiebreakerGameId=0n;"
        "if(latestGame){tiebreakerGameId=BigInt(latestGame);const g=await Functions.makeHttpRequest({url:`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${latestGame}`});"
        "const comp=g.data?.header?.competitions?.[0]?.competitors||[];"
        "for(let i=0;i<comp.length;i++){totalPoints+=BigInt(parseInt(comp[i].score||'0'));}}"
        "const allComplete=c===e.length?1n:0n;"
        "const x='0x'+[allComplete,BigInt(c),p,totalPoints,tiebreakerGameId].map(n=>n.toString(16).padStart(64,'0')).join('');"
        "const b=new Uint8Array(x.length/2-1);for(let i=2;i<x.length;i+=2)b[i/2-1]=parseInt(x.substr(i,2),16);return b;";

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

    struct WeekGames {
        uint8 seasonType;       // 1=preseason, 2=regular, 3=postseason
        uint8 weekNumber;
        uint256 year;
        uint256[] packedGameIds; // Packed game IDs (3 per uint256)
        uint8 gamesCount;       // Number of games
        bool isFinalized;       // True when data has been fetched
    }

    struct WeekResults {
        uint256 weekId;         // Composite key: (year << 16) | (seasonType << 8) | weekNumber
        uint256 packedResults;  // Packed winner data: bit 0 = game 0 winner (0=away, 1=home), etc
        uint8 gamesCount;       // Number of games with results
        bool isFinalized;       // True when all games are complete
        uint256 tiebreakerTotalPoints; // Total points scored in the latest game (for tiebreaker)
        uint256 tiebreakerGameId; // ESPN game ID of the latest game used for tiebreaker
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
        SCORE_CHANGES,
        WEEK_GAMES,
        WEEK_RESULTS
    }
    // chainlink requestId => request type
    mapping (bytes32 requestId => RequestType requestType) public requestTypes;
    // errors for games returned by oracle
    mapping (uint256 gameId => bytes error) public gameScoreErrors;
    // map the last time a gameId had a request
    mapping (uint256 gameId => uint256 lastUpdatedTimestamp) public quarterScoresLastRequestTime;
    mapping (uint256 gameId => uint256 lastUpdatedTimestamp) public scoreChangesLastRequestTime;

    // Week game data storage
    mapping (uint256 weekId => WeekGames) public weekGames; // weekId = (year << 16) | (seasonType << 8) | weekNumber
    mapping (uint256 weekId => WeekResults) public weekResults;
    mapping (bytes32 requestId => uint256 weekId) public weekRequests;

    ////////////////////////////////////
    ///////////    EVENTS    ///////////
    ////////////////////////////////////
    event GameScoresRequested(uint256 indexed gameId, bytes32 requestId); // someone requested game scores from the real world
    event GameScoresUpdated(uint256 indexed gameId, bytes32 requestId); // game scores were updated
    event ScoreChangesRequested(uint256 indexed gameId, bytes32 requestId); // a request was made to fetch score changes
    event ScoreChangesUpdated(uint256 indexed gameId, bytes32 requestId); // score changes were updated
    event GameScoreError(uint256 indexed gameId, bytes error); // there was an error fetching game scores
    event WeekGamesRequested(uint256 indexed weekId, bytes32 requestId); // someone requested games for a week
    event WeekGamesUpdated(uint256 indexed weekId, uint8 gameCount); // week games were updated
    event WeekResultsRequested(uint256 indexed weekId, bytes32 requestId); // someone requested results for a week
    event WeekResultsUpdated(uint256 indexed weekId, uint8 gameCount, bool allGamesCompleted); // week results were updated

    ////////////////////////////////////
    ///////////    ERRORS    ///////////
    ////////////////////////////////////
    error ScoreChangeIndexOutOfBounds();
    error CooldownNotMet();
    error GameNotCompleted();
    error ScoreChangesAlreadyStored();
    error WeekResultsAlreadyFinalized();
    error WeekGamesAlreadyFinalized();

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
        RequestType requestType = requestTypes[requestId];

        // Handle week requests differently
        if (requestType == RequestType.WEEK_GAMES || requestType == RequestType.WEEK_RESULTS) {
            uint256 weekId = weekRequests[requestId];

            // Store error if exists
            if (err.length > 0) {
                // For week requests, we don't have a specific error storage yet
                // Could add weekErrors mapping if needed
                return;
            }

            if (requestType == RequestType.WEEK_GAMES) {
                _fulfillWeekGamesRequest(weekId, response);
            } else if (requestType == RequestType.WEEK_RESULTS) {
                _fulfillWeekResultsRequest(weekId, response);
            }
            return;
        }

        // Original game request handling
        uint256 gameId = gameScoreRequests[requestId];

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

    /**
     * @notice Fulfill week games request (ultra gas optimized)
     */
    function _fulfillWeekGamesRequest(
        uint256 weekId,
        bytes memory response
    ) internal {
        // Extract data: [gameCount, packed3GameIds, packed3GameIds, ...]
        uint256 gameCount = _bytesToUint256(response, 0);

        // Create storage reference for gas efficiency
        WeekGames storage wg = weekGames[weekId];

        // Extract year, season, week from weekId for storage
        wg.year = weekId >> 16;
        wg.seasonType = uint8((weekId >> 8) & 0xFF);
        wg.weekNumber = uint8(weekId & 0xFF);
        wg.gamesCount = uint8(gameCount);
        wg.isFinalized = true;

        // Store packed game IDs directly (much more gas efficient!)
        delete wg.packedGameIds; // Clear existing array

        uint256 packedIndex = 1;
        uint256 packedCount = 0;

        // Process packed uint256s, each containing up to 3 game IDs
        while (packedIndex <= 7 && packedCount < 7) { // Max 7 packed uint256s in 256 bytes
            uint256 packed = _bytesToUint256(response, uint8(packedIndex));
            packedIndex++;

            // Only store non-zero packed values
            if (packed > 0) {
                wg.packedGameIds.push(packed);
                packedCount++;
            }
        }

        emit WeekGamesUpdated(weekId, uint8(gameCount));
    }

    /**
     * @notice Fulfill week results request (ultra gas optimized)
     */
    function _fulfillWeekResultsRequest(
        uint256 weekId,
        bytes memory response
    ) internal {
        // Extract data: [allCompleted, gameCount, packedResults, tiebreakerTotalPoints, tiebreakerGameId]
        uint256 allCompleted = _bytesToUint256(response, 0);

        // If not all games are completed, exit early without storing
        if (allCompleted == 0) {
            emit WeekResultsUpdated(weekId, uint8(0), false);
            return;
        }

        uint256 gameCount = _bytesToUint256(response, 1);
        uint256 packedResults = _bytesToUint256(response, 2);
        uint256 tiebreakerTotalPoints = _bytesToUint256(response, 3);
        uint256 tiebreakerGameId = _bytesToUint256(response, 4);

        // Store results in single operation
        WeekResults storage wr = weekResults[weekId];
        wr.weekId = weekId;
        wr.gamesCount = uint8(gameCount);
        wr.packedResults = packedResults;
        wr.tiebreakerTotalPoints = tiebreakerTotalPoints;
        wr.tiebreakerGameId = tiebreakerGameId;
        wr.isFinalized = true;

        emit WeekResultsUpdated(weekId, uint8(gameCount), true);
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

    /**
     * @notice Calculate week ID from year, season type, and week number
     * @param year The year (e.g., 2024)
     * @param seasonType 1=preseason, 2=regular, 3=postseason
     * @param weekNumber Week number
     * @return weekId The composite week identifier
     */
    function calculateWeekId(
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) public pure returns (uint256 weekId) {
        return (year << 16) | (uint256(seasonType) << 8) | uint256(weekNumber);
    }

    /**
     * @notice Fetch all games for a specific NFL week
     * @param subscriptionId Billing ID
     * @param gasLimit Gas limit for the request
     * @param jobId bytes32 representation of donId
     * @param year The year (e.g., 2024)
     * @param seasonType 1=preseason, 2=regular, 3=postseason
     * @param weekNumber Week number
     */
    function fetchWeekGames(
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 jobId,
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external returns (bytes32 requestId) {
        // Create week ID
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);

        // Revert if games for this week have already been finalized
        if (weekGames[weekId].isFinalized) {
            revert WeekGamesAlreadyFinalized();
        }

        // Create a chainlink request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(WEEK_GAMES_SOURCE);

        // Create args array
        string[] memory args = new string[](3);
        args[0] = year.toString();
        args[1] = uint256(seasonType).toString();
        args[2] = uint256(weekNumber).toString();
        req.setArgs(args);

        // Send request
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            jobId
        );

        weekRequests[requestId] = weekId;
        requestTypes[requestId] = RequestType.WEEK_GAMES;

        emit WeekGamesRequested(weekId, requestId);
    }

    /**
     * @notice Fetch results for all games in a specific NFL week
     * @param subscriptionId Billing ID
     * @param gasLimit Gas limit for the request
     * @param jobId bytes32 representation of donId
     * @param year The year (e.g., 2024)
     * @param seasonType 1=preseason, 2=regular, 3=postseason
     * @param weekNumber Week number
     */
    function fetchWeekResults(
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 jobId,
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external returns (bytes32 requestId) {
        // Create week ID
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);

        // Revert if results for this week have already been finalized
        if (weekResults[weekId].isFinalized) {
            revert WeekResultsAlreadyFinalized();
        }

        // Create a chainlink request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(WEEK_RESULTS_SOURCE);

        // Create args array
        string[] memory args = new string[](3);
        args[0] = year.toString();
        args[1] = uint256(seasonType).toString();
        args[2] = uint256(weekNumber).toString();
        req.setArgs(args);

        // Send request
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            jobId
        );

        weekRequests[requestId] = weekId;
        requestTypes[requestId] = RequestType.WEEK_RESULTS;

        emit WeekResultsRequested(weekId, requestId);
    }

    /**
     * @notice Get games for a specific week
     * @param year The year
     * @param seasonType The season type
     * @param weekNumber The week number
     * @return gameIds Array of ESPN game IDs
     * @return submissionDeadline Default submission deadline (current time + 7 days)
     */
    function getWeekGames(
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external view returns (uint256[] memory gameIds, uint256 submissionDeadline) {
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);
        WeekGames memory wg = weekGames[weekId];

        // If games haven't been fetched yet, return empty
        if (!wg.isFinalized) {
            return (new uint256[](0), 0);
        }

        // Unpack game IDs from packed storage
        gameIds = new uint256[](wg.gamesCount);
        uint256 gameIndex = 0;

        for (uint256 i = 0; i < wg.packedGameIds.length && gameIndex < wg.gamesCount; i++) {
            uint256 packed = wg.packedGameIds[i];

            // Extract first ID (bits 170-254, 85 bits)
            uint256 gameId = (packed >> 170) & ((1 << 85) - 1);
            if (gameId > 0 && gameIndex < wg.gamesCount) {
                gameIds[gameIndex] = gameId;
                gameIndex++;
            }

            // Extract second ID (bits 85-169, 85 bits)
            gameId = (packed >> 85) & ((1 << 85) - 1);
            if (gameId > 0 && gameIndex < wg.gamesCount) {
                gameIds[gameIndex] = gameId;
                gameIndex++;
            }

            // Extract third ID (bits 0-84, 85 bits)
            gameId = packed & ((1 << 85) - 1);
            if (gameId > 0 && gameIndex < wg.gamesCount) {
                gameIds[gameIndex] = gameId;
                gameIndex++;
            }
        }

        // Return games and a default submission deadline (7 days from now)
        // Contest creators can override this if needed
        submissionDeadline = block.timestamp + 7 days;
        return (gameIds, submissionDeadline);
    }

    /**
     * @notice Get results for a specific week
     * @param year The year
     * @param seasonType The season type
     * @param weekNumber The week number
     * @return winners Array where each element is 0 (away) or 1 (home)
     */
    function getWeekResults(
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external view returns (uint8[] memory winners) {
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);
        WeekResults memory wr = weekResults[weekId];
        WeekGames memory wg = weekGames[weekId];

        winners = new uint8[](wg.gamesCount);

        // Unpack results from bit field
        for (uint256 i = 0; i < wg.gamesCount; i++) {
            winners[i] = (wr.packedResults & (1 << i)) != 0 ? 1 : 0;
        }

        return winners;
    }
}

function _bytesToUint256(bytes memory input, uint8 index) pure returns (uint256 result) {
    uint256 offset = uint256(index) * 32;
    assembly {
        result := mload(add(add(input, 0x20), offset))
    }
}
