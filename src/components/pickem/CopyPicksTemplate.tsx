"use client";
import { useState } from "react";

export default function CopyPicksTemplate({ text }: { text: string }) {
  const [status, setStatus] = useState("");
  return (
    <div className="space-y-3">
      <textarea
        aria-label="Numbered picks to copy into Bankr"
        className="w-full min-h-72 rounded-xl border p-4 font-mono text-sm"
        defaultValue={text}
        id="bankr-picks-template"
      />
      <button
        className="rounded-full bg-[#e5ff4f] px-6 py-3 font-semibold text-[#142018]"
        onClick={async () => {
          const field = document.getElementById(
            "bankr-picks-template",
          ) as HTMLTextAreaElement;
          try {
            await navigator.clipboard.writeText(field.value);
            setStatus("Copied. Paste into Bankr to make your picks.");
          } catch {
            field.select();
            setStatus("Select and copy the template above.");
          }
        }}
      >
        Copy picks
      </button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
