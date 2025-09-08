import hre from "hardhat";
import { Boxes, Contests, GameScoreOracle, RandomNumbers } from "../typechain-types";
// Colour codes for terminal prints
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FUNCTIONS_ROUTER = {
  "84532": "0xf9B8fc078197181C841c296C876945aaa425B278",
  "8453": "0xf9b8fc078197181c841c296c876945aaa425b278",
}

const VRF_WRAPPER = {
  "84532": "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
  "8453": "0xb0407dbe851f8318bd31404A49e658143C982F23",
}

const FUNCTIONS_SUBSCRIPTION_ID = {
  "84532": 208,
  "8453": 6,
}

const FUNCTIONS_SUBSCRIPTIONS_REGISTRY = {
  "84532": "0xf9B8fc078197181C841c296C876945aaa425B278",
  "8453": "0xf9B8fc078197181C841c296C876945aaa425B278",
}

const FUNCTION_SUBSCRIPTION_ABI = [{
  "inputs":[{"internalType":"uint64","name":"subscriptionId","type":"uint64"},{"internalType":"address","name":"consumer","type":"address"}],
  "name":"addConsumer",
  "outputs":[],
  "stateMutability":"nonpayable",
  "type":"function"
}];

interface ContractToVerify {
  name: string;
  address: string;
  constructorArguments: unknown[];
}
const contractsToVerify: ContractToVerify[] = [];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await deployer.provider.getNetwork();

  let boxes: Boxes;
  try {
    boxes = await hre.ethers.deployContract("Boxes");
    await boxes.waitForDeployment();
  } catch (e) {
    console.log("Error deploying Boxes contract, waiting 10 seconds before retrying...\n", e);
    await delay(10000); // wait 10 seconds
    boxes = await hre.ethers.deployContract("Boxes");
    await boxes.waitForDeployment();
  }
  const boxesAddress = await boxes.getAddress();
  contractsToVerify.push({
    name: "Boxes",
    address: boxesAddress,
    constructorArguments: [],
  });
  console.log("Boxes deployed to: " + `${GREEN}${boxesAddress}${RESET}\n`);

  const gameScoreOracleArgs = [
    FUNCTIONS_ROUTER[chainId.toString() as keyof typeof FUNCTIONS_ROUTER]
  ];
  let gameScoreOracle: GameScoreOracle;
  try {
    gameScoreOracle = await hre.ethers.deployContract("GameScoreOracle", gameScoreOracleArgs);
    await gameScoreOracle.waitForDeployment();
  } catch (e) {
    console.log("Error deploying GameScoreOracle contract, waiting 10 seconds before retrying...\n", e);
    await delay(10000); // wait 10 seconds
    gameScoreOracle = await hre.ethers.deployContract("GameScoreOracle", gameScoreOracleArgs);
    await gameScoreOracle.waitForDeployment();
  }
  const gameScoreOracleAddress = await gameScoreOracle.getAddress();
  contractsToVerify.push({
    name: "gameScoreOracle",
    address: gameScoreOracleAddress,
    constructorArguments: gameScoreOracleArgs,
  });
  console.log("gameScoreOracle deployed to: " + `${GREEN}${gameScoreOracleAddress}${RESET}\n`);

  let contestsManager: ContestsManager;
  try {
    contestsManager = await hre.ethers.deployContract("ContestsManager");
    await contestsManager.waitForDeployment();
  } catch (e) {
    console.log("Error deploying ContestsManager contract, waiting 10 seconds before retrying...\n", e);
    await delay(10000); // wait 10 seconds
    contestsManager = await hre.ethers.deployContract("ContestsManager");
    await contestsManager.waitForDeployment();
  }
  const contestsManagerAddress = await contestsManager.getAddress();
  console.log("ContestsManager deployed to: " + `${GREEN}${contestsManagerAddress}${RESET}\n`);
  contractsToVerify.push({
    name: "ContestsManager",
    address: contestsManagerAddress,
    constructorArguments: [],
  });

  const randomNumbersArgs = [
    VRF_WRAPPER[chainId.toString() as keyof typeof VRF_WRAPPER],
  ];
  console.log("RandomNumbers args: ", randomNumbersArgs);
  let randomNumbers: RandomNumbers;
  try {
    randomNumbers = await hre.ethers.deployContract("RandomNumbers", randomNumbersArgs);
    await randomNumbers.waitForDeployment();
  } catch (e) {
    console.log("Error deploying RandomNumbers contract, waiting 10 seconds before retrying...\n", e);
    await delay(10000); // wait 10 seconds
    randomNumbers = await hre.ethers.deployContract("RandomNumbers", randomNumbersArgs);
    await randomNumbers.waitForDeployment();
  }
  const randomNumbersAddress = await randomNumbers.getAddress();
  contractsToVerify.push({
    name: "RandomNumbers",
    address: randomNumbersAddress,
    constructorArguments: randomNumbersArgs,
  });
  console.log("RandomNumbers deployed to: " + `${GREEN}${randomNumbersAddress}${RESET}\n`);

  // get the contract deployed at the functions subscription registry
  const functionsSubscriptionRegistry = await hre.ethers.getContractAt(
    FUNCTION_SUBSCRIPTION_ABI,
    FUNCTIONS_SUBSCRIPTIONS_REGISTRY[chainId.toString() as keyof typeof FUNCTIONS_SUBSCRIPTIONS_REGISTRY]
  );
  // call the addConsumer function
  await functionsSubscriptionRegistry.addConsumer(
    FUNCTIONS_SUBSCRIPTION_ID[chainId.toString() as keyof typeof FUNCTIONS_SUBSCRIPTION_ID],
    gameScoreOracleAddress
  );
  console.log("GameScoreOracle added to the Functions Subscription Registry\n");

  const contestsArgs = [
    await deployer.getAddress(),
    boxesAddress,
    gameScoreOracleAddress,
    contestsManagerAddress,
    randomNumbersAddress,
  ];
  let contests: Contests;
  try {
    contests = await hre.ethers.deployContract("Contests", contestsArgs);
    await contests.waitForDeployment();
  } catch (e) {
    console.log("Error deploying Contests contract, waiting 10 seconds before retrying...\n", e);
    await delay(10000); // wait 10 seconds
    contests = await hre.ethers.deployContract("Contests", contestsArgs);
    await contests.waitForDeployment();
  }
  const contestsAddress = await contests.getAddress();
  contractsToVerify.push({
    name: "Contests",
    address: contestsAddress,
    constructorArguments: contestsArgs,
  });
  console.log("Contests deployed to: " + `${GREEN}${contestsAddress}${RESET}\n`);

  // set the contests in the boxes contract
  await boxes.setContests(contestsAddress);
  console.log("Contests set in the Boxes contract\n");
  // set the contests in the contestsManager contract
  await contestsManager.setContestStorage(contestsAddress);
  console.log("Contests set in the ContestsManager contract\n");
  // set contests in the randomNumbers contract
  await randomNumbers.setContests(contestsAddress);
  console.log("Contests set in the RandomNumbers contract\n");

  console.log(
    "Waiting 30 seconds before beginning the contract verification to allow the block explorer to index the contract...\n",
  );
  await delay(30000); // Wait for 30 seconds before verifying the contracts

  for (const contract of contractsToVerify) {
    const { name, address, constructorArguments } = contract;
    console.log(`Verifying ${name} at address: ${GREEN}${address}${RESET}`);
    // if this is the last contract to verify, wait 20 seconds before verifying
    if (address === contractsToVerify[contractsToVerify.length - 1].address) {
      console.log("Waiting 20 seconds before verifying the last contract...\n");
      await delay(20000);
      console.log("Verifying the last contract...\n");
    }
    try {
      await hre.run("verify:verify", {
        address,
        constructorArguments
      });
      console.log(`Successfully verified ${contract.name} at address: ${GREEN}${contract.address}${RESET}\n`);
    } catch (e) {
      console.log("Error verifying contract, waiting 10 seconds before retrying...\n", e);
      await delay(10000); // wait 10 seconds
      try {
        await hre.run("verify:verify", {
          address,
          constructorArguments
        });
        console.log(`Successfully verified ${contract.name} at address: ${GREEN}${contract.address}${RESET}\n`);
      } catch (e) {
        console.log("Error verifying contract, giving up...\n", e);
      }
    }
  }
  console.table(contractsToVerify.reduce((acc: Record<string, string>, contract) => {
    acc[contract.name] = contract.address;
    return acc;
  }, {}));
  // Uncomment if you want to enable the `tenderly` extension
  // await hre.tenderly.verify({
  //   name: "Greeter",
  //   address: contractAddress,
  // });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
