import { readFile } from "node:fs/promises";
import path from "node:path";

import { getBaseUrl } from "@/lib/farcaster-metadata";

export async function GET() {
  const skill = await readFile(
    path.join(process.cwd(), "skills/pickem/SKILL.md"),
    "utf8",
  );
  return new Response(
    skill.replaceAll("{{APP_URL}}", getBaseUrl().replace(/\/$/, "")),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
