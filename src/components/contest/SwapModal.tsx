"use client";

import { useTheme } from "next-themes";
import { BridgeWidget } from "thirdweb/react";

import { chain, usdc } from "@/constants";
import { client } from "@/providers/Thirdweb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TokenInfo = {
  address: string;
  symbol: string;
  chainId: number;
};

type SwapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tokenInfo: TokenInfo | null;
};

/**
 * Modal component that displays thirdweb's bridge widget.
 * Allows users to swap tokens they own or buy tokens with fiat/card.
 * Used for non-mini-app users.
 */
export function SwapModal({ isOpen, onClose, tokenInfo }: SwapModalProps) {
  const { resolvedTheme } = useTheme();

  if (!tokenInfo) return null;

  // Check if the contest's token is USDC
  const isContestTokenUSDC =
    tokenInfo.address.toLowerCase() === usdc[chain.id].toLowerCase();

  // Prefill sell token: USDC by default, ETH if contest uses USDC
  const sellToken = isContestTokenUSDC
    ? {
        chainId: chain.id,
        // Native ETH (no tokenAddress means native token)
      }
    : {
        chainId: chain.id,
        tokenAddress: usdc[chain.id],
      };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl px-0 sm:px-6">
        <DialogHeader>
          <DialogTitle>Get {tokenInfo.symbol}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Swap tokens or buy with card to claim boxes
          </p>
          <div className="w-full flex justify-center">
            <BridgeWidget
              buy={{
                chainId: tokenInfo.chainId,
                tokenAddress: tokenInfo.address,
              }}
              client={client}
              showThirdwebBranding={false}
              swap={{
                prefill: {
                  buyToken: {
                    chainId: tokenInfo.chainId,
                    tokenAddress: tokenInfo.address,
                  },
                  sellToken,
                },
              }}
              theme={resolvedTheme === "dark" ? "dark" : "light"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
