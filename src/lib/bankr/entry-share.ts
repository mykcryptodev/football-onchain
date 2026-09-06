/** Response formats for the same verified entry; no draft picks or explorer URLs. */
export function entryShare(baseUrl: string, contestId: bigint, tokenId: bigint) {
  const base = baseUrl.replace(/\/$/, "");
  const url = `${base}/pickem/${contestId}/entries/${tokenId}`;
  const imageUrl = `${base}/api/og/pickem/${contestId}/picks?tokenId=${tokenId}`;
  const text = `My picks are in. Think you can beat me? ${url}`;
  const imageAlt = `BankrBall contest #${contestId}, entry #${tokenId} picks`;
  return {
    text,
    imageUrl,
    imageAlt,
    markdown: `![${imageAlt}](${imageUrl})\n\n${text}`,
    fallbackText: `${text}\nPicks image: ${imageUrl}`,
  };
}
