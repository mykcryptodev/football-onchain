import { appDescription, appName } from "@/constants";

function _withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_key, value]) =>
      Array.isArray(value) ? value.length > 0 : !!value,
    ),
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;
  return Response.json({
    accountAssociation: {
      // these will be added in step 5
      header: "",
      payload: "",
      signature: "",
    },
    baseBuilder: {
      allowedAddresses: [""], // add your Base Account address here
    },
    miniapp: {
      version: "1",
      name: appName,
      homeUrl: URL,
      iconUrl: `${URL}/icon.png`,
      splashImageUrl: `${URL}/splash.png`,
      splashBackgroundColor: "#000000",
      webhookUrl: `${URL}/api/webhook`,
      subtitle: "Bet on football games",
      description: appDescription,
      screenshotUrls: [],
      primaryCategory: "games",
      tags: ["pickem", "miniapp", "baseapp"],
      heroImageUrl: "https://ex.co/og.png",
      tagline: "Bet, win, repeat",
      ogTitle: appName,
      ogDescription: appDescription,
      ogImageUrl: `${URL}/og.png`,
      noindex: true,
    },
  });
}
