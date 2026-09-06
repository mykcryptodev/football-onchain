"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function ContestReadPending() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    if (attempts >= 5) return;
    const timer = setTimeout(() => {
      setAttempts(value => value + 1);
      router.refresh();
    }, 2000);
    return () => clearTimeout(timer);
  }, [attempts, router]);
  return (
    <main aria-live="polite" className="mx-auto max-w-xl px-4 py-16 space-y-4">
      <h1 className="text-2xl font-bold">Loading your contest</h1>
      <p className="text-muted-foreground">
        {attempts < 5
          ? "New contests can take a moment to become available. Checking again…"
          : "We couldn’t load this contest yet. If you just created it, your confirmed transaction is saved. Try again shortly."}
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setAttempts(0);
          router.refresh();
        }}
      >
        Check again
      </Button>
    </main>
  );
}
