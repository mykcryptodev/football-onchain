const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const BACKOFF_MS = [250, 500] as const;
const MAX_RETRY_AFTER_MS = 2_000;

export interface FetchRetryOptions {
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const isTransientStatus = (status: number) =>
  status === 408 || status === 429 || status >= 500;

const retryAfterMilliseconds = (response: Response): number | undefined => {
  if (response.status !== 429 && response.status !== 503) return undefined;

  const value = response.headers.get("Retry-After");
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) return undefined;
  return Math.min(Math.max(retryAt - Date.now(), 0), MAX_RETRY_AFTER_MS);
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const fetchJsonWithRetry = async <T = unknown>(
  url: string,
  options: FetchRetryOptions = {},
): Promise<T> => {
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          // ESPN edge 403s browser-impersonating UAs but allows curl.
          "User-Agent": "curl/8.0",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.ok) return (await response.json()) as T;

      const httpError = new Error(`ESPN HTTP ${response.status} for ${url}`);
      if (!isTransientStatus(response.status)) throw httpError;
      lastError = httpError;

      if (attempt < MAX_ATTEMPTS) {
        await sleep(
          retryAfterMilliseconds(response) ?? BACKOFF_MS[attempt - 1],
        );
      }
    } catch (error) {
      lastError = error;

      if (error instanceof Error && error.message.startsWith("ESPN HTTP ")) {
        throw error;
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS[attempt - 1]);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    `ESPN fetch failed after ${MAX_ATTEMPTS} attempts for ${url}: ${errorMessage(lastError)}`,
    { cause: lastError },
  );
};
