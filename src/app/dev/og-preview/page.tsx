"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Development tool for previewing OG images
 * Visit: http://localhost:3000/dev/og-preview
 *
 * This page helps developers:
 * - Preview OG images before sharing
 * - Test different contest IDs
 * - Verify image generation
 * - Debug display issues
 *
 * Note: This page should not be accessible in production
 */
export default function OGPreviewPage() {
  const [contestId, setContestId] = useState("1");
  const [imageUrl, setImageUrl] = useState("/api/og/pickem/1");
  const [loading, setLoading] = useState(false);

  const handlePreview = () => {
    setLoading(true);
    setImageUrl(`/api/og/pickem/${contestId}?t=${Date.now()}`);
    // Reset loading after image loads
    setTimeout(() => setLoading(false), 1000);
  };

  const handleRefresh = () => {
    setLoading(true);
    setImageUrl(`/api/og/pickem/${contestId}?t=${Date.now()}`);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">OG Image Preview Tool</h1>
        <p className="text-muted-foreground">
          Preview and test Open Graph images for Pick&apos;em contests
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          ⚠️ <strong>Development Only:</strong> This page is for development and
          testing. It should not be accessible in production.
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="contestId">Contest ID</Label>
          <div className="flex gap-2">
            <Input
              id="contestId"
              placeholder="Enter contest ID"
              type="number"
              value={contestId}
              onChange={e => setContestId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePreview()}
            />
            <Button disabled={loading} onClick={handlePreview}>
              {loading ? "Loading..." : "Preview"}
            </Button>
            <Button
              disabled={loading}
              variant="outline"
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a contest ID to generate and preview its OG image
          </p>
        </div>

        {/* Image URL */}
        <div className="space-y-2">
          <Label>Image URL</Label>
          <div className="flex gap-2">
            <Input readOnly value={imageUrl.replace(/\?t=.*/, "")} />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}${imageUrl.replace(/\?t=.*/, "")}`,
                );
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Preview</h2>
          <div className="text-sm text-muted-foreground">1200 × 630 pixels</div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          {loading ? (
            <div className="flex h-[630px] items-center justify-center bg-muted">
              <div className="text-center">
                <div className="mb-2 text-4xl">⏳</div>
                <p className="text-muted-foreground">Generating OG image...</p>
              </div>
            </div>
          ) : (
            <img
              alt={`OG image for contest ${contestId}`}
              className="w-full"
              src={imageUrl}
              onLoad={() => setLoading(false)}
              onError={e => {
                console.error("Image failed to load");
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'%3E%3Crect width='1200' height='630' fill='%23000'/%3E%3Ctext x='600' y='315' font-family='Arial' font-size='24' fill='%23fff' text-anchor='middle'%3EError loading image%3C/text%3E%3C/svg%3E";
              }}
            />
          )}
        </div>
      </div>

      {/* Platform Previews */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Platform Previews</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Facebook */}
          <div className="space-y-2 rounded-lg border p-4">
            <h3 className="font-semibold">Facebook</h3>
            <div className="aspect-[1.91/1] overflow-hidden rounded border bg-muted">
              <img
                alt="Facebook preview"
                className="h-full w-full object-cover"
                src={imageUrl}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              1.91:1 aspect ratio preview
            </p>
          </div>

          {/* Twitter */}
          <div className="space-y-2 rounded-lg border p-4">
            <h3 className="font-semibold">Twitter/X</h3>
            <div className="aspect-[2/1] overflow-hidden rounded border bg-muted">
              <img
                alt="Twitter preview"
                className="h-full w-full object-cover"
                src={imageUrl}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              2:1 aspect ratio preview
            </p>
          </div>
        </div>
      </div>

      {/* Testing Tools */}
      <div className="space-y-4 rounded-lg border p-6">
        <h2 className="text-2xl font-semibold">Testing Tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Facebook Debugger</h3>
            <p className="text-sm text-muted-foreground">
              Test how your link appears on Facebook
            </p>
            <Button asChild variant="outline">
              <a
                href="https://developers.facebook.com/tools/debug/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Tool →
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Twitter Card Validator</h3>
            <p className="text-sm text-muted-foreground">
              Validate Twitter Card tags
            </p>
            <Button asChild variant="outline">
              <a
                href="https://cards-dev.twitter.com/validator"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Tool →
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">LinkedIn Inspector</h3>
            <p className="text-sm text-muted-foreground">
              Preview LinkedIn post appearance
            </p>
            <Button asChild variant="outline">
              <a
                href="https://www.linkedin.com/post-inspector/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Tool →
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">OG Debugger</h3>
            <p className="text-sm text-muted-foreground">
              Universal OG tag debugger
            </p>
            <Button asChild variant="outline">
              <a
                href="https://www.opengraph.xyz/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Tool →
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Preview */}
      <div className="space-y-4 rounded-lg border p-6">
        <h2 className="text-2xl font-semibold">Example Metadata</h2>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
          {`<meta property="og:title" content="Regular Season Week 5 2024 - Pick'em Contest #${contestId}" />
<meta property="og:description" content="Join this Pick'em contest! Blockchain-powered fair play with instant payouts." />
<meta property="og:image" content="${typeof window !== "undefined" ? window.location.origin : ""}${imageUrl.replace(/\?t=.*/, "")}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${typeof window !== "undefined" ? window.location.origin : ""}${imageUrl.replace(/\?t=.*/, "")}" />`}
        </pre>
      </div>

      {/* Tips */}
      <div className="space-y-4 rounded-lg border p-6">
        <h2 className="text-2xl font-semibold">Testing Tips</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Use the Refresh button to bypass caching during development</li>
          <li>
            Test with different contest IDs to ensure all data displays
            correctly
          </li>
          <li>
            Check that USD and token amounts are accurate by comparing with the
            contest page
          </li>
          <li>Verify season/week information matches the contest data</li>
          <li>
            Use social media debuggers to clear their caches before testing in
            production
          </li>
          <li>
            Test on actual social media platforms to verify real-world behavior
          </li>
          <li>Check mobile previews using browser dev tools</li>
        </ul>
      </div>
    </div>
  );
}
