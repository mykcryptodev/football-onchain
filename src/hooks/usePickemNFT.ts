import { getContract, readContract } from "thirdweb";

import { chain, pickemNFT as pickemNFTAddresses } from "@/constants";
import { abi } from "@/constants/abis/pickemNFT";
import { client } from "@/providers/Thirdweb";

export function usePickemNFT() {
  // Create contract instance
  const pickemNFTContract = getContract({
    client,
    chain,
    address: pickemNFTAddresses[chain.id],
    abi,
  });

  // Get the current owner of a token
  const getNFTOwner = async (tokenId: number): Promise<string> => {
    try {
      const owner = await readContract({
        contract: pickemNFTContract,
        method: "ownerOf",
        params: [BigInt(tokenId)],
      });
      return owner;
    } catch (error) {
      console.error("Error getting NFT owner:", error);
      throw error;
    }
  };

  // Get balance of NFTs for an address
  const balanceOf = async (address: string): Promise<bigint> => {
    try {
      const balance = await readContract({
        contract: pickemNFTContract,
        method: "balanceOf",
        params: [address],
      });
      return balance;
    } catch (error) {
      console.error("Error getting NFT balance:", error);
      throw error;
    }
  };

  // Get all token IDs owned by an address
  const tokensOfOwner = async (address: string): Promise<bigint[]> => {
    try {
      const tokens = await readContract({
        contract: pickemNFTContract,
        method: "tokensOfOwner",
        params: [address],
      });
      return tokens as bigint[];
    } catch (error) {
      console.error("Error getting tokens of owner:", error);
      throw error;
    }
  };

  // Get prediction data for a token
  const getPredictionData = async (tokenId: number) => {
    try {
      const data = await readContract({
        contract: pickemNFTContract,
        method: "getPredictionData",
        params: [BigInt(tokenId)],
      });
      return data;
    } catch (error) {
      console.error("Error getting prediction data:", error);
      throw error;
    }
  };

  // Check if a token exists
  const tokenExists = async (tokenId: number): Promise<boolean> => {
    try {
      const exists = await readContract({
        contract: pickemNFTContract,
        method: "exists",
        params: [BigInt(tokenId)],
      });
      return exists;
    } catch (error) {
      console.error("Error checking token exists:", error);
      return false;
    }
  };

  return {
    pickemNFTContract,
    getNFTOwner,
    balanceOf,
    tokensOfOwner,
    getPredictionData,
    tokenExists,
  };
}
