import { getContract, type ThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { getNFT as getErc721NFT } from "thirdweb/extensions/erc721";
import { getNFT as getErc1155NFT } from "thirdweb/extensions/erc1155";

const CAIP19_PATTERN =
  /(eip155:(\d+)\/(erc721|erc1155):(0x[a-fA-F0-9]{40})\/(\d+))/;

function parseCaip19(value: string) {
  const match = value.match(CAIP19_PATTERN);

  if (!match) {
    return null;
  }

  return {
    full: match[1],
    chainId: Number(match[2]),
    standard: match[3] as "erc721" | "erc1155",
    contractAddress: match[4],
    tokenId: match[5],
  };
}

export async function resolveNftImageUrl(
  value: string | undefined,
  client: ThirdwebClient,
) {
  if (!value) {
    return undefined;
  }

  const parsed = parseCaip19(value);

  if (!parsed || Number.isNaN(parsed.chainId)) {
    return undefined;
  }

  try {
    const contract = getContract({
      client,
      chain: defineChain({ id: parsed.chainId }),
      address: parsed.contractAddress as `0x${string}`,
    });

    const tokenId = BigInt(parsed.tokenId);
    const nft =
      parsed.standard === "erc1155"
        ? await getErc1155NFT({ contract, tokenId })
        : await getErc721NFT({ contract, tokenId });

    return typeof nft?.metadata?.image === "string"
      ? nft.metadata.image
      : undefined;
  } catch (error) {
    console.warn("Failed to resolve CAIP19 avatar:", error);
    return undefined;
  }
}
