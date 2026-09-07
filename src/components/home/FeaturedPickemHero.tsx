"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { featuredPickemContestOfWeekId } from "@/constants";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { usePickemContract } from "@/hooks/usePickemContract";
import { queryKeys } from "@/lib/query-keys";

interface FeaturedPickemHeroProps {
  contestId?: number;
}

export function FeaturedPickemHero({ contestId }: FeaturedPickemHeroProps) {
  const { getContest, getContestTokenIds, getNFTOwner } = usePickemContract();

  const contestQuery = useQuery({
    queryKey: [...queryKeys.pickemContests(), "featured", contestId],
    enabled: contestId !== undefined,
    queryFn: async () => {
      const contest = await getContest(contestId!);
      const tokenIds = await getContestTokenIds(contestId!);
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
      className="group block rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      href={contestId === undefined ? "/pickem" : `/pickem/${contestId}`}
      aria-label={
        contestId === undefined
          ? "Browse Pick’em contests"
          : `View featured Pick’em contest ${contestId}`
      }
    >
      <div className="field-board relative overflow-hidden rounded-[2rem] border bg-[#10281e] p-5 text-[#f4f4e9] shadow-[0_30px_90px_-45px_rgba(5,25,16,.9)] transition-transform group-hover:-translate-y-1 sm:p-7">
        <div className="absolute inset-0 field-lines opacity-80" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a8c6b4]">
                {contestId !== undefined &&
                contestId === featuredPickemContestOfWeekId
                  ? "Featured contest of the week"
                  : "Weekly pool"}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {contest
                  ? `Week ${contest.weekNumber} Pick’em`
                  : contestId === undefined
                    ? "Your next winning week"
                    : "Loading Pick’em"}
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs">
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
                  : contestId === undefined
                    ? "Find your next pool"
                    : contestQuery.isError
                      ? "Contest unavailable"
                      : "Loading contest"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#e5ff4f] p-4 text-[#142018] sm:gap-4">
            <Image
              alt="Bankrball"
              className="size-12 shrink-0 object-contain sm:size-16"
              height={64}
              src="/icon.png"
              width={64}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {contestId === undefined
                  ? "Explore Pick’em"
                  : "View Pick’em contest"}
              </p>
              <p className="mt-1 text-xs text-[#3e4c42]">
                Pick the winners. Climb the leaderboard.
              </p>
            </div>
            <ArrowUpRight aria-hidden="true" className="size-5 shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
