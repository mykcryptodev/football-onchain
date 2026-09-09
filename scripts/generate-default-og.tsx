/* eslint-disable @next/next/no-img-element -- ImageResponse renders a static PNG, not a web page. */
/** Run with `bun scripts/generate-default-og.tsx` from the repository root. */
import { readFile, writeFile } from "node:fs/promises";

import { ImageResponse } from "next/og";
import React from "react";

import {
  CREAM,
  FieldLines,
  FOREST,
  LIME,
  MIST,
  SAGE,
} from "../src/lib/og/pickem-card";

const image = new ImageResponse(
  <div
    style={{
      display: "flex",
      width: "100%",
      height: "100%",
      position: "relative",
      backgroundColor: FOREST,
      color: CREAM,
      fontFamily: "Lexend Deca",
      padding: 64,
    }}
  >
    <FieldLines height={630} width={1200} />
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: 730,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: LIME,
          fontFamily: "Geist Mono",
          fontSize: 19,
          letterSpacing: "0.12em",
        }}
      >
        FOOTBALL. ONCHAIN.
      </div>
      <div
        style={{
          fontSize: 102,
          fontWeight: 800,
          letterSpacing: "-0.055em",
          marginTop: 22,
          lineHeight: 1,
        }}
      >
        BankrBall
      </div>
      <div style={{ fontSize: 34, marginTop: 28, color: MIST }}>
        Pick the winners.
      </div>
      <div style={{ fontSize: 34, color: MIST }}>Follow every game.</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: LIME,
            color: FOREST,
            padding: "12px 20px",
            borderRadius: 999,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          NFL PICK’EM + SQUARES
        </div>
        <div style={{ color: SAGE, fontFamily: "Geist Mono", fontSize: 18 }}>
          ON BASE
        </div>
      </div>
      <div
        style={{
          fontFamily: "Geist Mono",
          color: SAGE,
          fontSize: 18,
          marginTop: 36,
        }}
      >
        bankrball.com
      </div>
    </div>
    <img
      alt="BankrBall football robot"
      height={390}
      src={`data:image/png;base64,${(await readFile("public/icon.png")).toString("base64")}`}
      style={{ position: "absolute", right: 38, top: 112 }}
      width={390}
    />
  </div>,
  {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Lexend Deca",
        data: await readFile("public/fonts/LexendDeca/LexendDeca-500.ttf"),
        weight: 500,
        style: "normal",
      },
      {
        name: "Lexend Deca",
        data: await readFile("public/fonts/LexendDeca/LexendDeca-800.ttf"),
        weight: 800,
        style: "normal",
      },
      {
        name: "Geist Mono",
        data: await readFile("public/fonts/GeistMono/GeistMono-500.ttf"),
        weight: 500,
        style: "normal",
      },
    ],
  },
);
const png = Buffer.from(await image.arrayBuffer());
// A new URL avoids reusing cached image bytes; keep legacy consumers branded too.
await Promise.all([
  writeFile("public/bankrball-og-v2.png", png),
  writeFile("public/og.png", png),
]);
console.log(
  `Generated BankrBall social card: ${png.length} bytes (1200×630 PNG).`,
);
