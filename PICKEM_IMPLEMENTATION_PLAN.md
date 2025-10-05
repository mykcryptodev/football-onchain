# NFL Pick'em Smart Contract Implementation Plan

## Overview

Create a decentralized NFL Pick'em game where users predict winners for all games in a specific week, with predictions stored as NFTs and prizes distributed to winners based on accuracy.

## Core Features

### 1. Pick'em Contest Creation

- **Season & Week Selection**: Contest creators select NFL season type (preseason/regular/postseason) and week number
- **Entry Fee Configuration**: Creators set the cost to submit predictions (similar to box cost in Contests.sol)
- **Prize Pool Management**: All entry fees collected form the prize pool
- **Treasury Fee**: 2% fee on prize pools (matching Contests.sol structure)

### 2. Game Data Management

- **Weekly Game Fetching**: Oracle fetches all games for specified week from ESPN API
- **Game Storage**: Store game IDs, teams, and kickoff times for each week
- **Dynamic Game Count**: Handle varying numbers of games per week (Thursday to Monday)

### 3. NFT-Based Predictions

- **Prediction NFT**: Each user's weekly picks are minted as a unique NFT
- **Metadata Structure**: NFT contains:
  - Week identifier (season type + week number + year)
  - Array of game predictions (game ID + predicted winner)
  - Submission timestamp
  - Entry fee paid
  - User address

### 4. Oracle Integration

- **Dual-Purpose Oracle**:
  1. Fetch all games for a week during contest creation
  2. Fetch final scores after games complete
- **Batch Processing**: Efficient handling of multiple games in single oracle request

### 5. Scoring & Payouts

- **Scoring System**: 1 point per correct prediction
- **Tiebreaker Options**:
  - Total points scored in Monday Night Football
  - Submission timestamp (earlier submission wins)
- **Payout Distribution**:
  - Winner-take-all (default)
  - Top 3 places (60%, 30%, 10%)
  - Configurable by creator

## Technical Architecture

### Smart Contracts

#### 1. `Pickem.sol` (Main Contract)

```solidity
contract Pickem {
    struct PickemContest {
        uint256 id;
        address creator;
        uint8 seasonType; // 1=preseason, 2=regular, 3=postseason
        uint8 weekNumber;
        uint256 year;
        uint256[] gameIds; // ESPN game IDs for the week
        uint256 entryFee;
        address currency; // Payment token (address(0) for ETH)
        uint256 totalPrizePool;
        uint256 submissionDeadline; // First game kickoff time
        bool scoresFinalized;
        mapping(address => uint256) userPredictions; // NFT token IDs
        mapping(uint256 => uint8) gameResults; // gameId => 0=away, 1=home
    }

    struct Prediction {
        uint256 contestId;
        address predictor;
        mapping(uint256 => uint8) picks; // gameId => 0=away, 1=home
        uint256 totalPointsTiebreaker; // MNF total points prediction
        uint256 submissionTime;
        uint8 correctPicks; // Calculated after games complete
    }
}
```

#### 2. `PickemNFT.sol` (NFT Contract)

```solidity
contract PickemNFT is ERC721Enumerable {
    mapping(uint256 => Prediction) public predictions;

    function mintPrediction(
        address to,
        uint256 contestId,
        uint256[] memory gameIds,
        uint8[] memory picks,
        uint256 tiebreaker
    ) external returns (uint256);
}
```

#### 3. `PickemOracle.sol` (Oracle Extension)

```solidity
contract PickemOracle {
    // Fetch all games for a week
    function fetchWeeklyGames(
        uint8 seasonType,
        uint8 weekNumber,
        uint256 year
    ) external returns (bytes32 requestId);

    // Fetch results for multiple games
    function fetchGameResults(
        uint256[] memory gameIds
    ) external returns (bytes32 requestId);
}
```

### Data Flow

1. **Contest Creation**

   ```
   User → Pickem.createContest() → Oracle.fetchWeeklyGames() → Store game IDs
   ```

2. **Submission Flow**

   ```
   User → Pickem.submitPredictions() → Validate → Mint NFT → Store mapping
   ```

3. **Results & Payout**
   ```
   Oracle.fetchGameResults() → Calculate scores → Determine winners → Distribute prizes
   ```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

- [ ] Create `Pickem.sol` base contract structure
- [ ] Implement contest creation logic
- [ ] Set up game ID storage and management
- [ ] Create basic getter functions

### Phase 2: NFT Integration (Week 1-2)

- [ ] Develop `PickemNFT.sol` contract
- [ ] Implement prediction submission and minting
- [ ] Create metadata generation for NFTs
- [ ] Add validation for duplicate submissions

### Phase 3: Oracle Development (Week 2)

- [ ] Extend `GameScoreOracle.sol` for weekly game fetching
- [ ] Create batch result fetching functionality
- [ ] Implement score calculation logic
- [ ] Add error handling for incomplete games

### Phase 4: Scoring & Payouts (Week 2-3)

- [ ] Implement scoring algorithm
- [ ] Create tiebreaker logic
- [ ] Develop payout distribution system
- [ ] Add configurable payout strategies

### Phase 5: Frontend Integration (Week 3)

- [ ] Create Pick'em creation form component
- [ ] Build game selection interface
- [ ] Develop leaderboard display
- [ ] Add NFT viewing functionality

### Phase 6: Testing & Optimization (Week 3-4)

- [ ] Unit tests for all contracts
- [ ] Integration testing with oracle
- [ ] Gas optimization
- [ ] Security audit preparation

## Key Differences from Contests.sol

| Feature              | Contests.sol       | Pickem.sol               |
| -------------------- | ------------------ | ------------------------ |
| Game Selection       | Single game        | All games in a week      |
| User Action          | Pick squares       | Predict winners          |
| NFT Content          | Box position       | Full week predictions    |
| Winner Determination | Score digits match | Most correct predictions |
| Payout Timing        | Per quarter        | After all games complete |

## API Integration Requirements

### ESPN API Endpoints

1. **Weekly Games**: `/apis/site/v2/sports/football/nfl/scoreboard?dates={YYYYMMDD}&seasontype={type}&week={number}`
2. **Game Results**: Same as current `GameScoreOracle` implementation

### Data Format

```javascript
{
  contestId: 1,
  week: {
    season: 2,
    week: 10,
    year: 2024,
    games: [
      {
        gameId: "401671776",
        homeTeam: "KC",
        awayTeam: "BUF",
        kickoff: 1699920000,
        homeScore: null,
        awayScore: null
      }
      // ... more games
    ]
  },
  predictions: {
    "401671776": 1, // 1 = home team wins
    "401671777": 0, // 0 = away team wins
    // ...
  }
}
```

## Security Considerations

1. **Submission Deadline**: Enforce submission cutoff before first game kickoff
2. **Oracle Trust**: Multiple oracle confirmations for final scores
3. **Duplicate Prevention**: One NFT per user per contest
4. **Result Immutability**: Scores cannot be changed after finalization

## Gas Optimization Strategies

1. **Batch Operations**: Process multiple predictions in single transaction
2. **Packed Storage**: Store predictions as packed uint256 values

## Testing Strategy

### Unit Tests

- Contest creation with various parameters
- Prediction submission edge cases
- Score calculation accuracy
- Payout distribution correctness

### Integration Tests

- Oracle data flow
- NFT minting and metadata
- Multi-week contest management
- Gas consumption analysis

### Testnet Deployment

1. Deploy to Base Sepolia
2. Run week-long test contests
3. Stress test with multiple users
4. Verify oracle reliability

## Deployment Checklist

- [ ] Contracts compiled and optimized
- [ ] Unit tests passing (100% coverage)
- [ ] Integration tests complete
- [ ] Gas costs acceptable
- [ ] Security audit completed
- [ ] Frontend fully integrated
- [ ] Documentation complete
- [ ] Mainnet deployment script ready
- [ ] Emergency procedures documented
- [ ] Monitoring setup complete

## Timeline Estimate

- **Week 1**: Core contract development
- **Week 2**: Oracle integration & NFT implementation
- **Week 3**: Frontend development & testing
- **Week 4**: Audit, optimization, and deployment

Total estimated development time: **4 weeks**

## Dependencies

- Existing `GameScoreOracle.sol` functionality
- Chainlink Functions for oracle requests
- OpenZeppelin contracts (ERC721, SafeERC20)
- ESPN API access
- Base network deployment setup

## Success Metrics

1. **User Adoption**: 100+ active weekly participants
2. **Transaction Volume**: $10k+ weekly prize pools
3. **Oracle Reliability**: 99.9% uptime
4. **Gas Efficiency**: < $5 per submission
5. **User Retention**: 60%+ weekly return rate
