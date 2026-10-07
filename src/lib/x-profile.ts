const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;

/** Profile URL for a curated X handle, or null when the handle is missing or malformed. */
export function xProfileUrl(handle?: string | null): string | null {
  const clean = handle?.trim().replace(/^@/, "");
  return clean && X_HANDLE.test(clean) ? `https://x.com/${clean}` : null;
}
