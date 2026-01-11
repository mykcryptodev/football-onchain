"use client";

import { useMutation } from "@tanstack/react-query";
import { getContract, readContract, toUnits, waitForReceipt } from "thirdweb";
import { airdropERC20, airdropERC721 } from "thirdweb/extensions/airdrop";
import { owner } from "thirdweb/extensions/common";
import { allowance, approve } from "thirdweb/extensions/erc20";
import {
  isApprovedForAll,
  setApprovalForAll,
} from "thirdweb/extensions/erc721";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

import { airdrop as airdropAddress,chain } from "@/constants";
import { client } from "@/providers/Thirdweb";

type AirdropRecipient = {
  address: string;
  amount?: string; // For ERC-20: human-readable amount (e.g., "1" = 1 token)
  tokenId?: string; // For ERC-721: token ID
};

type AirdropParams = {
  tokenAddress: string;
  tokenType: "ERC20" | "ERC721";
  recipients: AirdropRecipient[];
  tokenDecimals?: number; // For ERC-20, defaults to 18
};

export function useAirdrop() {
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const airdropContract = getContract({
    client,
    chain,
    address: airdropAddress[chain.id],
  });

  const {
    mutateAsync: airdrop,
    isPending: isAirdropping,
    error,
  } = useMutation({
    mutationFn: async (params: AirdropParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      const {
        tokenAddress,
        tokenType,
        recipients,
        tokenDecimals = 18,
      } = params;

      if (recipients.length === 0) {
        throw new Error("No recipients provided");
      }

      if (recipients.length > 100) {
        throw new Error("Maximum 100 recipients per airdrop");
      }

      // Check if the connected wallet is the owner of the airdrop contract
      try {
        const contractOwner = await owner({ contract: airdropContract });
        if (contractOwner.toLowerCase() !== account.address.toLowerCase()) {
          throw new Error(
            `Only the contract owner can perform airdrops. Contract owner: ${contractOwner}, Your address: ${account.address}. Please connect with the owner wallet.`,
          );
        }
      } catch (error) {
        // If owner() function doesn't exist or fails, try reading it directly
        try {
          const contractOwner = await readContract({
            contract: airdropContract,
            method: "function owner() view returns (address)",
            params: [],
          });
          if (contractOwner.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error(
              `Only the contract owner can perform airdrops. Contract owner: ${contractOwner}, Your address: ${account.address}. Please connect with the owner wallet.`,
            );
          }
        } catch (readError) {
          // If we can't read the owner, continue and let the transaction fail with a clearer error
          console.warn("Could not verify contract ownership:", readError);
        }
      }

      if (tokenType === "ERC721") {
        console.log("Processing ERC-721 airdrop");
        // For ERC-721, format contents array with recipient and tokenId
        const contents = recipients.map(r => {
          if (!r.tokenId) {
            throw new Error(`Missing tokenId for recipient ${r.address}`);
          }
          return {
            recipient: r.address as `0x${string}`,
            tokenId: BigInt(r.tokenId),
          };
        });

        const transaction = airdropERC721({
          contract: airdropContract,
          tokenAddress: tokenAddress as `0x${string}`,
          contents,
        });

        // Check if approval is needed for ERC-721 NFTs
        // We need to check if the airdrop contract is approved for all NFTs
        const nftContract = getContract({
          client,
          chain,
          address: tokenAddress as `0x${string}`,
        });

        const isApproved = await isApprovedForAll({
          contract: nftContract,
          owner: account.address,
          operator: airdropAddress[chain.id],
        });

        // If not approved, request approval for all NFTs
        if (!isApproved) {
          console.log("ERC-721 approval needed");
          const approveTx = setApprovalForAll({
            contract: nftContract,
            operator: airdropAddress[chain.id],
            approved: true,
          });

          const approvalResult = await sendTransaction(approveTx);
          await waitForReceipt({
            client,
            chain,
            transactionHash: approvalResult.transactionHash,
          });
        }

        // Send the airdrop transaction and wait for receipt
        const result = await sendTransaction(transaction);
        await waitForReceipt({
          client,
          chain,
          transactionHash: result.transactionHash,
        });
        return {
          success: true,
          transactionHash: result.transactionHash,
          message: `Successfully airdropped ${recipients.length} NFTs`,
        };
      } else if (tokenType === "ERC20") {
        console.log("Processing ERC-20 airdrop");
        // For ERC-20, format contents array with recipient and amount (in wei)
        const contents = recipients.map(r => {
          if (!r.amount) {
            throw new Error(`Missing amount for recipient ${r.address}`);
          }
          // Convert human-readable amount to wei/smallest unit
          const amountInWei = toUnits(r.amount, tokenDecimals);
          return {
            recipient: r.address as `0x${string}`,
            amount: amountInWei,
          };
        });

        // Calculate total amount needed for the airdrop
        const totalAmount = contents.reduce(
          (sum, item) => sum + item.amount,
          BigInt(0),
        );

        // Get the token contract to check allowance
        const tokenContract = getContract({
          client,
          chain,
          address: tokenAddress as `0x${string}`,
        });

        // Check current allowance
        const currentAllowance = await allowance({
          contract: tokenContract,
          owner: account.address,
          spender: airdropAddress[chain.id],
        });

        // If allowance is insufficient, approve the airdrop contract
        if (currentAllowance < totalAmount) {
          console.log(
            `Approval needed! Approving ${totalAmount.toString()} tokens to airdrop contract`,
          );

          const approveTx = approve({
            contract: tokenContract,
            spender: airdropAddress[chain.id],
            amountWei: totalAmount,
          });

          const approvalResult = await sendTransaction(approveTx);
          await waitForReceipt({
            client,
            chain,
            transactionHash: approvalResult.transactionHash,
          });

          console.log("Approval transaction confirmed");
        } else {
          console.log("Sufficient allowance already exists");
        }

        // Prepare and send the airdrop transaction
        const transaction = airdropERC20({
          contract: airdropContract,
          tokenAddress: tokenAddress as `0x${string}`,
          contents,
        });

        const result = await sendTransaction(transaction);
        await waitForReceipt({
          client,
          chain,
          transactionHash: result.transactionHash,
        });
        return {
          success: true,
          transactionHash: result.transactionHash,
          message: `Successfully airdropped to ${recipients.length} addresses`,
        };
      } else {
        throw new Error(
          `Invalid token type: ${tokenType}. Must be "ERC20" or "ERC721"`,
        );
      }
    },
  });

  return {
    airdrop,
    isAirdropping,
    error: error as Error | null,
  };
}
