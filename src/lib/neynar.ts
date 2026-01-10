import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

const neynarApiKey = process.env.NEYNAR_API_KEY || "";

export const isNeynarConfigured = Boolean(neynarApiKey);

const neynarClient = isNeynarConfigured
  ? new NeynarAPIClient(new Configuration({ apiKey: neynarApiKey }))
  : null;

const MAX_BULK_ADDRESSES = 350;

interface NeynarUser {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  profile?: {
    bio?: {
      text?: string;
    };
  };
}

export async function fetchBulkUsersByAddress(
  addresses: string[],
): Promise<Record<string, NeynarUser[]>> {
  if (!neynarClient || addresses.length === 0) {
    return {};
  }

  const normalizedAddresses = Array.from(
    new Set(addresses.map(address => address.toLowerCase())),
  );
  const results: Record<string, NeynarUser[]> = {};

  for (let i = 0; i < normalizedAddresses.length; i += MAX_BULK_ADDRESSES) {
    const chunk = normalizedAddresses.slice(i, i + MAX_BULK_ADDRESSES);
    const response = await neynarClient.fetchBulkUsersByEthOrSolAddress({
      addresses: chunk,
      addressTypes: ["custody_address", "verified_address"],
    });

    Object.entries(response ?? {}).forEach(([address, users]) => {
      results[address.toLowerCase()] = users;
    });
  }

  return results;
}
