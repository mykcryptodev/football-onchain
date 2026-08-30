import { afterEach, describe, expect, mock, test } from "bun:test";

import { fetchJsonWithRetry } from "./espn-retry";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const response = (status: number, body: unknown = { ok: true }, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const noSleep = async () => {};

describe("fetchJsonWithRetry", () => {
  test("returns a successful response without retrying", async () => {
    const fetchMock = mock(async () => response(200, { game: 1 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchJsonWithRetry("https://espn.test", { sleep: noSleep })).resolves.toEqual({ game: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries a network failure and succeeds", async () => {
    const fetchMock = mock()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(response(200, { recovered: true }));
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchJsonWithRetry("https://espn.test", { sleep: noSleep })).resolves.toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries HTTP 500 and succeeds", async () => {
    const fetchMock = mock()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200, { recovered: true }));
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchJsonWithRetry("https://espn.test", { sleep: noSleep })).resolves.toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("honors Retry-After for HTTP 429", async () => {
    const sleep = mock(async () => {});
    const fetchMock = mock()
      .mockResolvedValueOnce(response(429, {}, { "Retry-After": "1" }))
      .mockResolvedValueOnce(response(200));
    global.fetch = fetchMock as typeof fetch;

    await fetchJsonWithRetry("https://espn.test", { sleep });
    expect(sleep).toHaveBeenCalledWith(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry HTTP 404 and preserves its error text", async () => {
    const fetchMock = mock(async () => response(404));
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchJsonWithRetry("https://espn.test", { sleep: noSleep })).rejects.toThrow("ESPN HTTP 404 for https://espn.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("throws after three network failures", async () => {
    const fetchMock = mock(async () => {
      throw new TypeError("fetch failed");
    });
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchJsonWithRetry("https://espn.test", { sleep: noSleep })).rejects.toThrow(
      "ESPN fetch failed after 3 attempts for https://espn.test: fetch failed",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("retries an aborted request", async () => {
    const fetchMock = mock()
      .mockRejectedValueOnce(new DOMException("aborted", "AbortError"))
      .mockResolvedValueOnce(response(200, { recovered: true }));
    global.fetch = fetchMock as typeof fetch;

    await expect(fetchJsonWithRetry("https://espn.test", { sleep: noSleep })).resolves.toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
