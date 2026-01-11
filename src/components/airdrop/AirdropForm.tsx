"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getContract } from "thirdweb";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { useActiveAccount } from "thirdweb/react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { chain } from "@/constants";
import { useAirdrop } from "@/hooks/useAirdrop";
import { useTokenInfo } from "@/hooks/useTokenInfo";
import { client } from "@/providers/Thirdweb";

const airdropFormSchema = z.object({
  tokenType: z.enum(["ERC20", "ERC721"]),
  tokenAddress: z.string().min(1, "Token address is required"),
  recipients: z.string().min(1, "Recipients are required"),
  tokenDecimals: z.number().optional(),
});

type AirdropFormValues = z.infer<typeof airdropFormSchema>;

function parseRecipients(
  text: string,
  tokenType: "ERC20" | "ERC721",
): Array<{ address: string; amount?: string; tokenId?: string }> {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.map(line => {
    // Support both comma-separated and space-separated formats
    const parts = line.split(/[,\s]+/).filter(p => p.length > 0);

    if (tokenType === "ERC721") {
      if (parts.length < 2) {
        throw new Error(
          `Invalid format for line: ${line}. Expected: address tokenId`,
        );
      }
      return {
        address: parts[0],
        tokenId: parts[1],
      };
    } else {
      // ERC-20
      if (parts.length < 2) {
        throw new Error(
          `Invalid format for line: ${line}. Expected: address amount`,
        );
      }
      return {
        address: parts[0],
        amount: parts[1],
      };
    }
  });
}

export function AirdropForm() {
  const account = useActiveAccount();
  const { airdrop, isAirdropping } = useAirdrop();
  const [previewRecipients, setPreviewRecipients] = useState<
    Array<{ address: string; amount?: string; tokenId?: string }>
  >([]);

  const form = useForm<AirdropFormValues>({
    resolver: zodResolver(airdropFormSchema),
    defaultValues: {
      tokenType: "ERC20",
      tokenAddress: "",
      recipients: "",
      tokenDecimals: 18,
    },
  });

  const tokenType = form.watch("tokenType");
  const tokenAddress = form.watch("tokenAddress");
  const recipientsText = form.watch("recipients");

  // Fetch token info to get decimals
  const { tokenInfo } = useTokenInfo(tokenAddress || "");

  // Update preview when recipients text changes
  const handleRecipientsChange = (value: string) => {
    form.setValue("recipients", value);
    try {
      if (value.trim()) {
        const parsed = parseRecipients(value, tokenType);
        setPreviewRecipients(parsed);
      } else {
        setPreviewRecipients([]);
      }
    } catch (error) {
      setPreviewRecipients([]);
    }
  };

  // Update preview when token type changes
  const handleTokenTypeChange = (value: "ERC20" | "ERC721") => {
    form.setValue("tokenType", value);
    const currentText = form.getValues("recipients");
    if (currentText) {
      handleRecipientsChange(currentText);
    }
  };

  const onSubmit = async (values: AirdropFormValues) => {
    if (!account?.address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      // Parse recipients
      const recipients = parseRecipients(values.recipients, values.tokenType);

      if (recipients.length === 0) {
        toast.error("No valid recipients found");
        return;
      }

      // Get token decimals if ERC-20
      let tokenDecimals = values.tokenDecimals || 18;
      if (values.tokenType === "ERC20" && tokenAddress) {
        try {
          const contract = getContract({
            client,
            chain,
            address: tokenAddress as `0x${string}`,
          });
          const metadata = await getCurrencyMetadata({ contract });
          tokenDecimals = metadata.decimals;
        } catch (error) {
          console.warn("Could not fetch token decimals, using default 18");
        }
      }

      // Execute airdrop via contract call
      const result = await airdrop({
        tokenAddress: values.tokenAddress,
        tokenType: values.tokenType,
        recipients,
        tokenDecimals,
      });

      toast.success(
        result.message ||
          `Successfully airdropped to ${recipients.length} addresses`,
        {
          description: result.transactionHash
            ? `Transaction: ${result.transactionHash.slice(0, 10)}...${result.transactionHash.slice(-8)}`
            : undefined,
        },
      );

      // Reset form
      form.reset();
      setPreviewRecipients([]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Airdrop failed";
      toast.error(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airdrop Tokens</CardTitle>
        <CardDescription>
          Send ERC-20 tokens or ERC-721 NFTs to multiple addresses at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="tokenType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Type</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      handleTokenTypeChange(value as "ERC20" | "ERC721");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select token type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ERC20">ERC-20 Token</SelectItem>
                      <SelectItem value="ERC721">ERC-721 NFT</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose whether you&apos;re airdropping tokens or NFTs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tokenAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Contract Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} />
                  </FormControl>
                  <FormDescription>
                    The contract address of the{" "}
                    {tokenType === "ERC20" ? "token" : "NFT"} to airdrop
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Recipients{" "}
                    {tokenType === "ERC20"
                      ? "(Address Amount)"
                      : "(Address TokenID)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[200px] font-mono text-sm"
                      placeholder={
                        tokenType === "ERC20"
                          ? "0x1234...5678 1.5\n0xabcd...efgh 2.0"
                          : "0x1234...5678 1\n0xabcd...efgh 2"
                      }
                      {...field}
                      onChange={e => {
                        field.onChange(e);
                        handleRecipientsChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {tokenType === "ERC20" ? (
                      <>
                        One recipient per line. Format:{" "}
                        <code>address amount</code>
                        <br />
                        Example: <code>0x1234...5678 1.5</code> (sends 1.5
                        tokens)
                      </>
                    ) : (
                      <>
                        One recipient per line. Format:{" "}
                        <code>address tokenId</code>
                        <br />
                        Example: <code>0x1234...5678 42</code> (sends token ID
                        42)
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {previewRecipients.length > 0 && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">
                  Preview ({previewRecipients.length} recipients)
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {previewRecipients.slice(0, 10).map((recipient, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono text-muted-foreground"
                    >
                      {recipient.address.slice(0, 10)}...
                      {recipient.address.slice(-8)}{" "}
                      {tokenType === "ERC20" ? (
                        <span className="text-foreground">
                          → {recipient.amount}
                        </span>
                      ) : (
                        <span className="text-foreground">
                          → Token #{recipient.tokenId}
                        </span>
                      )}
                    </div>
                  ))}
                  {previewRecipients.length > 10 && (
                    <div className="text-xs text-muted-foreground pt-1">
                      ... and {previewRecipients.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {tokenType === "ERC20" && tokenInfo && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm">
                  <span className="font-medium">Token:</span> {tokenInfo.symbol}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              disabled={isAirdropping || !account?.address}
              type="submit"
            >
              {isAirdropping
                ? "Airdropping..."
                : !account?.address
                  ? "Connect Wallet"
                  : `Airdrop to ${previewRecipients.length} Recipients`}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
