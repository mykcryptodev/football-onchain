import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Contract addresses on Base chain
const PICKEM_ADDRESS = "0x602b49e4c54724ae53a491ae60cd8ecf5690e5c7";
const NEW_ORACLE_ADDRESS = process.env.NEW_ORACLE_ADDRESS || ""; // Set this after deployment

// Chainlink Functions parameters (you'll need to set these)
const SUBSCRIPTION_ID = process.env.CHAINLINK_SUBSCRIPTION_ID || "0";
const GAS_LIMIT = 300000;
const JOB_ID = process.env.CHAINLINK_JOB_ID || "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
  if (!NEW_ORACLE_ADDRESS) {
    console.error("Please set NEW_ORACLE_ADDRESS in your .env file");
    process.exit(1);
  }

  console.log("Fixing Contest 0 with new oracle...");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);
  
  // Get contract ABIs
  const GameScoreOracle = await ethers.getContractFactory("GameScoreOracle");
  const Pickem = await ethers.getContractFactory("Pickem");
  
  // Connect to contracts
  const oracle = GameScoreOracle.attach(NEW_ORACLE_ADDRESS);
  const pickem = Pickem.attach(PICKEM_ADDRESS);
  
  console.log("\n=== Step 1: Verify Oracle is Set ===");
  const currentOracle = await pickem.gameScoreOracle();
  if (currentOracle.toLowerCase() !== NEW_ORACLE_ADDRESS.toLowerCase()) {
    console.log("Oracle not yet updated. Updating now...");
    const tx = await pickem.setGameScoreOracle(NEW_ORACLE_ADDRESS);
    await tx.wait();
    console.log("Oracle updated successfully");
  } else {
    console.log("Oracle already set to new address");
  }
  
  console.log("\n=== Important: Verify Oracle Consumer Status ===");
  console.log("Make sure the oracle is added as a consumer to your Chainlink subscription!");
  console.log("Oracle address:", NEW_ORACLE_ADDRESS);
  console.log("Check at: https://functions.chain.link/base");
  console.log("If not added, the fetchWeekGames and fetchWeekResults calls will fail.");
  console.log("");
  
  console.log("\n=== Step 2: Fetch Week 6 Games ===");
  const year = 2025;
  const seasonType = 2; // Regular season
  const weekNumber = 6;
  
  // Check if games are already fetched
  const weekId = await oracle.calculateWeekId(year, seasonType, weekNumber);
  const weekGames = await oracle.weekGames(weekId);
  
  if (!weekGames.isFinalized) {
    console.log("Fetching week games from ESPN...");
    const tx = await oracle.fetchWeekGames(
      SUBSCRIPTION_ID,
      GAS_LIMIT,
      JOB_ID,
      year,
      seasonType,
      weekNumber
    );
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for Chainlink to fulfill request...");
    console.log("This may take a few minutes. Check the transaction on BaseScan.");
    await tx.wait();
  } else {
    console.log("Week games already fetched");
  }
  
  console.log("\n=== Step 3: Fetch Week 6 Results ===");
  const weekResults = await oracle.weekResults(weekId);
  
  if (!weekResults.isFinalized) {
    console.log("Fetching week results from ESPN...");
    const tx = await oracle.fetchWeekResults(
      SUBSCRIPTION_ID,
      GAS_LIMIT,
      JOB_ID,
      year,
      seasonType,
      weekNumber
    );
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for Chainlink to fulfill request...");
    console.log("This may take a few minutes. Check the transaction on BaseScan.");
    await tx.wait();
  } else {
    console.log("Week results already fetched");
  }
  
  console.log("\n=== Step 4: Update Contest 0 Results ===");
  const contest = await pickem.contests(0);
  
  if (!contest.gamesFinalized) {
    console.log("Updating contest results...");
    const tx = await pickem.updateContestResults(0);
    await tx.wait();
    console.log("Contest results updated successfully");
  } else {
    console.log("Contest already finalized. May need to reset or create new contest.");
  }
  
  console.log("\n=== Step 5: Recalculate Scores ===");
  const tokenIds = [0, 1, 2, 3, 4]; // All participants in Contest 0
  
  console.log("Recalculating scores for all participants...");
  const tx = await pickem.calculateScoresBatch(tokenIds);
  await tx.wait();
  console.log("Scores recalculated successfully");
  
  console.log("\n=== Verification ===");
  console.log("Fetching updated leaderboard...");
  const leaderboard = await pickem.getContestLeaderboard(0);
  
  console.log("\nUpdated Leaderboard:");
  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    console.log(`${i + 1}. Token ID ${entry.tokenId}: ${entry.score} correct picks`);
  }
  
  console.log("\n=== Complete ===");
  console.log("Contest 0 has been updated with the fixed oracle!");
  console.log("Please verify the results match the ESPN data.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
