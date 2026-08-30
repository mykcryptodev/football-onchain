"use client";

import { useQuery } from "@tanstack/react-query";
import { Grid3x3, Trophy } from "lucide-react";
import Link from "next/link";

import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { usePickemContract } from "@/hooks/usePickemContract";
import { queryKeys } from "@/lib/query-keys";

interface FeaturedPickemHeroProps {
  contestId: number;
}

export function FeaturedPickemHero({ contestId }: FeaturedPickemHeroProps) {
  const { getContest, getContestTokenIds, getNFTOwner } = usePickemContract();

  const contestQuery = useQuery({
    queryKey: [...queryKeys.pickemContests(), "featured", contestId],
    queryFn: async () => {
      const contest = await getContest(contestId);
      const tokenIds = await getContestTokenIds(contestId);
      const owners = await Promise.all(tokenIds.map(getNFTOwner));

      return {
        weekNumber: Number(contest.weekNumber),
        currency: contest.currency,
        totalPrizePool: contest.totalPrizePool,
        totalEntries: Number(contest.totalEntries),
        totalPlayers: new Set(owners.map(owner => owner.toLowerCase())).size,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const contest = contestQuery.data;
  const { formattedValue: prizePool } = useFormattedCurrency({
    amount: contest?.totalPrizePool ?? 0n,
    currencyAddress:
      contest?.currency ?? "0x0000000000000000000000000000000000000000",
  });

  return (
    <Link
      aria-label={`View featured Pick'em contest ${contestId}`}
      className="group block"
      href={`/pickem/${contestId}`}
    >
      <div className="field-board relative aspect-[4/5] overflow-hidden rounded-[2rem] border bg-[#10281e] p-5 text-[#f4f4e9] shadow-[0_30px_90px_-45px_rgba(5,25,16,.9)] transition-transform group-hover:-translate-y-1 sm:p-7">
        <div className="absolute inset-0 field-lines opacity-80" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a8c6b4]">
                Sunday pool
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {contest
                  ? `Week ${contest.weekNumber} Pick’em`
                  : "Loading Pick’em"}
              </p>
            </div>
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs">
              {contest ? `${contest.totalPlayers} players` : "— players"}
            </div>
          </div>

          <div className="relative mx-auto flex aspect-square w-[78%] items-center justify-center rounded-full border border-white/25 bg-black/10">
            <div className="absolute inset-[12%] rounded-full border border-dashed border-white/25" />
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8c6b4]">
                Prize pool
              </p>
              <p className="mt-2 text-5xl font-black tracking-[-0.06em] sm:text-6xl">
                {contest && prizePool ? prizePool : "—"}
              </p>
              <p className="mt-3 text-sm text-[#cbd8cf]">
                {contest
                  ? `${contest.totalEntries} ${contest.totalEntries === 1 ? "entry" : "entries"}`
                  : contestQuery.isError
                    ? "Contest unavailable"
                    : "Loading contest"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <Grid3x3 className="size-5 text-[#bdd4c5]" />
              <p className="mt-3 font-semibold">Squares</p>
              <p className="mt-1 text-xs text-[#b7c8bc]">
                Every quarter matters
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-[#e5ff4f] p-4 text-[#142018]">
              <Trophy className="size-5" />
              <p className="mt-3 font-semibold">Pick&apos;em</p>
              <p className="mt-1 text-xs text-[#3e4c42]">Call every winner</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
