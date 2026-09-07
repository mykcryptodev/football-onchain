"use client";

import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function PickemShareImage({
  contestId,
  tokenId,
}: {
  contestId: number;
  tokenId: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (tokenId === null) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setFailed(false);
    setImageUrl(undefined);
    const load = async () => {
      try {
        // This verified single-entry lookup queues the background render once.
        const entry = await fetch(
          `/api/bankr/contests/${contestId}/entries?tokenId=${tokenId}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!entry.ok) throw new Error("Entry image unavailable");
        let attempts = 0;
        const poll = async () => {
          try {
            const response = await fetch(
              `/api/og/pickem/${contestId}/picks?tokenId=${tokenId}&download=1`,
              {
                signal: controller.signal,
                cache: "no-store",
              },
            );
            if (response.status === 503 && ++attempts < 40) {
              timer = setTimeout(() => void poll(), 3000);
              return;
            }
            if (
              !response.ok ||
              !response.headers.get("content-type")?.startsWith("image/png")
            ) {
              throw new Error("Image unavailable");
            }
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          } catch {
            if (!controller.signal.aborted) setFailed(true);
          }
        };
        await poll();
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contestId, tokenId, retry]);

  return (
    <section aria-label="Your picks share image" className="space-y-2">
      {imageUrl ? (
        // The same downloaded PNG is used for preview and saving.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`Your submitted picks for contest #${contestId}, entry #${tokenId}`}
          className="w-full rounded-xl"
          height={630}
          src={imageUrl}
          width={1200}
        />
      ) : (
        <div
          className="flex aspect-[1200/630] items-center justify-center gap-2 rounded-xl bg-muted px-4 text-center text-sm text-muted-foreground"
          role="status"
        >
          {failed || tokenId === null ? (
            "Your picks image is unavailable right now. You can still compose your post below."
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing your picks
              image…
            </>
          )}
        </div>
      )}
      {imageUrl ? (
        <Button asChild className="w-full" variant="outline">
          <a
            download={`bankrball-contest-${contestId}-entry-${tokenId}.png`}
            href={imageUrl}
          >
            <Download className="mr-2 h-4 w-4" />
            Download image
          </a>
        </Button>
      ) : failed ? (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setRetry(value => value + 1)}
        >
          Retry image
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Download your image, then attach it when you compose your post.
      </p>
    </section>
  );
}
