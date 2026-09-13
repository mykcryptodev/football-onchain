import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Longest match wins: link-preview crawlers (Twitterbot) honor robots,
        // so OG images must be explicitly allowed under the /api/ block.
        allow: ["/", "/api/og/"],
        disallow: "/api/",
      },
    ],
  };
}
