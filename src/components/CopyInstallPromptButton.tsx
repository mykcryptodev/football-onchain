"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyInstallPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      className="shrink-0"
      type="button"
      variant="secondary"
      onClick={copyPrompt}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy prompt"}
    </Button>
  );
}
