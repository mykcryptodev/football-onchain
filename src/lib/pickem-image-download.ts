/** Stream only stored image bytes; never regenerate or read chain data here. */
export async function downloadPickemImage(
  blobUrl: string,
  contestId: bigint,
  tokenId: bigint,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  try {
    const image = await fetcher(blobUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (
      image.ok &&
      image.headers.get("content-type")?.startsWith("image/png")
    ) {
      return new Response(image.body, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="bankrball-contest-${contestId}-entry-${tokenId}.png"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
  } catch {
    // Transient Blob errors can be retried without rerendering the image.
  }
  return new Response("Picks image unavailable", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "5" },
  });
}
