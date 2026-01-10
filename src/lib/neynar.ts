import { Configuration,NeynarAPIClient } from "@neynar/nodejs-sdk";

// Initialize Neynar client if API key is available
const getNeynarClient = (): NeynarAPIClient | null => {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return null;
  }
  const config = new Configuration({
    apiKey,
    baseOptions: {
      headers: {
        "x-neynar-experimental": true,
      },
    },
  });
  return new NeynarAPIClient(config);
};

/**
 * Fetch Farcaster user bio by Ethereum address using Neynar API
 * Returns the bio text if available, null otherwise
 */
export async function fetchFarcasterBioByAddress(
  address: string,
): Promise<string | null> {
  const client = getNeynarClient();
  if (!client) {
    console.warn("Neynar API key not configured, cannot fetch bio");
    return null;
  }

  try {
    const response = await client.fetchBulkUsersByEthOrSolAddress({
      addresses: [address],
    });

    // Response is an object with address keys mapping to user arrays
    // e.g., { "0x123...": [User, ...] }
    const addressKey = address.toLowerCase();
    const users = response[addressKey] || [];

    if (!users || users.length === 0) {
      return null;
    }

    const user = users[0];
    return user.profile?.bio?.text || null;
  } catch (error) {
    console.error(`Error fetching Farcaster bio for ${address}:`, error);
    return null;
  }
}
