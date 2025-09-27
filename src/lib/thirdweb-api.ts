import { BoxOwner } from "@/components/contest/types";
import { chain, multicall } from "@/constants";
import { abi as multicallAbi } from "@/constants/abis/multicall";
import { ZERO_ADDRESS } from "thirdweb";

/**
 * Get NFT ownership data using Multicall for maximum efficiency
 * Reduces 100 individual RPC calls to 1 multicall
 */
export async function getNFTOwnershipFromThirdweb(
  contractAddress: string,
  tokenIds: string[],
): Promise<Map<string, { owner: string }>> {
  const ownersMap = new Map<string, { owner: string }>();

  try {
    console.log(
      `Fetching NFT ownership using multicall for ${tokenIds.length} tokens`,
    );

    const { createThirdwebClient, getContract, readContract } = await import(
      "thirdweb"
    );

    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
    });

    // Get the multicall contract
    const multicallContract = getContract({
      client,
      address: multicall[chain.id],
      abi: multicallAbi,
      chain,
    });

    // Prepare multicall data - encode ownerOf calls for each token
    // TODO: Need to properly encode the ownerOf function calls
    // The multicall expects an array of {target: address, callData: bytes}
    const calls = tokenIds.map(tokenId => {
      // TODO: Encode the ownerOf(uint256) function call
      // This is where you'll need to finish the implementation
      // You need to encode the function selector + tokenId parameter
      return {
        target: contractAddress,
        callData: ("0x" +
          "6352211e" +
          BigInt(tokenId).toString(16).padStart(64, "0")) as `0x${string}`, // Placeholder - needs proper encoding
      };
    });

    console.log(`Executing multicall with ${calls.length} calls`);

    // Execute the multicall
    const result = await readContract({
      contract: multicallContract,
      method:
        "function aggregate((address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)",
      params: [calls],
    });

    const [blockNumber, returnData] = result as [bigint, string[]];

    console.log(`Multicall completed at block ${blockNumber}`);

    // TODO: Decode the results
    // Each returnData[i] contains the encoded address result
    // You need to decode the address from the bytes
    tokenIds.forEach((tokenId, index) => {
      try {
        // TODO: Decode the address from returnData[index]
        // The result should be a 32-byte encoded address
        const encodedOwner = returnData[index];
        // Extract the address from the encoded data (last 20 bytes)
        const owner = "0x" + encodedOwner.slice(-40);

        if (owner && owner !== ZERO_ADDRESS) {
          ownersMap.set(tokenId, {
            owner,
          });
          console.log(`Token ${tokenId} owned by:`, owner);
        }
      } catch (error) {
        console.log(`Error decoding token ${tokenId}:`, error);
        // Token might not exist or be unowned
      }
    });

    console.log(`Found ${ownersMap.size} NFT owners from multicall`);
    return ownersMap;
  } catch (error) {
    console.error("Error fetching NFT ownership from multicall:", error);
    return ownersMap;
  }
}

/**
 * Get box owners using Thirdweb API
 */
export async function getBoxOwnersFromThirdweb(
  contestId: number,
  collectionAddress: string,
): Promise<BoxOwner[]> {
  const boxes: BoxOwner[] = [];

  try {
    // Get all 100 token IDs for this contest
    const tokenIds = Array.from({ length: 100 }, (_, i) => contestId * 100 + i);
    const tokenIdStrings = tokenIds.map(id => id.toString());

    console.log("Fetching NFT ownership from Thirdweb using multicall...");
    const ownersMap = await getNFTOwnershipFromThirdweb(
      collectionAddress,
      tokenIdStrings,
    );

    // Build the boxes array using the results
    const results: BoxOwner[] = tokenIds.map(tokenId => {
      const boxNumber = tokenId % 100;
      const row = Math.floor(boxNumber / 10);
      const col = boxNumber % 10;

      const ownerData = ownersMap.get(tokenId.toString());

      if (ownerData) {
        return {
          tokenId,
          owner: ownerData.owner,
          row,
          col,
        };
      }

      // Return unowned box if no owner data
      return {
        tokenId,
        owner: ZERO_ADDRESS,
        row,
        col,
      };
    });

    console.log(
      `Returning ${results.length} box results from Thirdweb multicall`,
    );
    console.log(
      "Owned boxes:",
      results.filter(box => box.owner !== ZERO_ADDRESS).length,
    );

    return results;
  } catch (error) {
    console.error("Error fetching box owners from Thirdweb multicall:", error);
    throw error;
  }
}
