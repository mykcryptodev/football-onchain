import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/skills/pickem/SKILL.md": ["./skills/pickem/SKILL.md"],
  },
  typescript: {
    // Ignore TypeScript errors in the solidity folder during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ignore ESLint errors in the solidity folder during build
    ignoreDuringBuilds: false,
    dirs: ["src"], // Only lint the src directory
  },
};

export default nextConfig;
