import { ArrowLeft, Check, ExternalLink, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CopyInstallPromptButton } from "@/components/CopyInstallPromptButton";
import { Button } from "@/components/ui/button";

const skillUrl = "https://bankrball.com/skills/pickem/SKILL.md";
const installPrompt = `Install the skill from ${skillUrl}`;

const examples = [
  "I want to make my NFL picks.",
  "Show my picks in contest 15.",
  "Who’s winning contest 15?",
  "Settle contest 15 and pay everyone when it unlocks.",
];

export const metadata: Metadata = {
  title: "Bankr Pick’em Skill | BankrBall",
  description:
    "Install the BankrBall Pick’em skill to join NFL pools, submit picks, follow standings, and settle prizes through Bankr.",
};

export default function BankrSkillPage() {
  return (
    <main className="min-w-0 min-h-[calc(100dvh-4.5rem)] overflow-x-hidden">
      <div className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-5 sm:py-10 md:px-8 md:py-16">
        <Button asChild className="mb-8 -ml-3" variant="ghost">
          <Link href="/">
            <ArrowLeft /> Back home
          </Link>
        </Button>

        <section className="overflow-hidden rounded-[2rem] border bg-card">
          <div className="grid min-w-0 gap-10 p-5 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:p-12">
            <div className="min-w-0">
              <Image
                alt="Bankr"
                className="mb-6 size-16 rounded-full object-cover"
                height={64}
                src="/bankr-avatar.png"
                width={64}
              />
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Bankr skill
              </p>
              <h1 className="mt-4 max-w-[12ch] text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-5xl">
                Play Pick’em by talking to Bankr.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                Install the BankrBall skill once, then ask Bankr to find a pool,
                collect your picks, enter onchain, and track the leaderboard.
              </p>
            </div>

            <div className="min-w-0 rounded-[1.5rem] border bg-background p-4 sm:p-6">
              <p className="text-sm font-semibold">Install in Bankr</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open your Bankr agent and send this prompt exactly as written.
              </p>
              <div className="mt-5 min-w-0 overflow-wrap-anywhere rounded-xl border bg-secondary/60 p-4 font-mono text-sm leading-6 [word-break:break-word]">
                {installPrompt}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <CopyInstallPromptButton prompt={installPrompt} />
                <Button asChild variant="outline">
                  <a href="https://bankr.bot" rel="noreferrer" target="_blank">
                    Open Bankr <ExternalLink />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-[2rem] border bg-border md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Install",
              body: "Paste the install prompt into Bankr. Repeating it later refreshes the skill.",
            },
            {
              step: "02",
              title: "Choose a pool",
              body: "Ask to make picks. Bankr uses the featured open contest or helps you choose one.",
            },
            {
              step: "03",
              title: "Approve the entry",
              body: "Fill the numbered slate, review the exact fee, and approve the onchain transaction.",
            },
          ].map(item => (
            <article key={item.step} className="bg-background p-6 sm:p-8">
              <span className="font-mono text-xs text-muted-foreground">
                {item.step}
              </span>
              <h2 className="mt-8 text-xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 py-14 md:grid-cols-[.8fr_1.2fr] md:py-20">
          <div>
            <Trophy className="size-7 text-primary" />
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
              What to ask Bankr
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Use natural language. Bankr handles the contest workflow while
              keeping paid actions behind your wallet approval.
            </p>
          </div>
          <ul className="divide-y rounded-[1.5rem] border bg-card px-5 sm:px-7">
            {examples.map(example => (
              <li key={example} className="flex gap-3 py-5">
                <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="font-medium">“{example}”</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[2rem] border bg-foreground p-7 text-background sm:p-10">
          <h2 className="text-2xl font-black tracking-[-0.035em]">
            Your wallet stays in control.
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-background/70">
            The skill reads live contest data and prepares transactions. Bankr
            shows paid actions for approval; the app never signs for you or asks
            for a private key.
          </p>
          <a
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
            href={skillUrl}
            rel="noreferrer"
            target="_blank"
          >
            View the skill file <ExternalLink className="size-4" />
          </a>
        </section>
      </div>
    </main>
  );
}
