import assert from "node:assert/strict";
import { test } from "node:test";

import { downloadPickemImage } from "./pickem-image-download";

test("streams a persisted PNG with a safe attachment filename", async () => {
  const response = await downloadPickemImage(
    "https://blob.example/image.png",
    1n,
    0n,
    async () =>
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "Content-Type": "image/png" },
      }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="bankrball-contest-1-entry-0.png"',
  );
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([137, 80, 78, 71]),
  );
});
test("does not download an error page as a PNG", async () => {
  for (const fetcher of [
    async () => new Response("error", { status: 502 }),
    async () =>
      new Response("html", { headers: { "Content-Type": "text/html" } }),
    async () => {
      throw new Error("timeout");
    },
  ]) {
    const response = await downloadPickemImage(
      "https://blob.example/image.png",
      1n,
      2n,
      fetcher,
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
