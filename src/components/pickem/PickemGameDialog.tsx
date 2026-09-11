"use client";

import { useActiveAccount } from "thirdweb/react";

import { PickerAvatar, shortAddress } from "@/components/pickem/PickerAvatars";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameDetails } from "@/hooks/useGameDetails";
import { type CurrentWeekGamePick } from "@/hooks/useMyCurrentWeekPicks";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";

function PickerRow({ address, isYou }: { address: string; isYou: boolean }) {
  const { profile } = useUserProfile(address);
  const name = profile?.name?.trim() || shortAddress(address);

  return (
    <li className="flex min-w-0 items-center gap-2">
      <PickerAvatar address={address} className="size-7" />
      <span className="truncate text-sm">{name}</span>
      {isYou ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">You</span>
      ) : null}
    </li>
  );
}

export default function PickemGameDialog({
  game,
  statusLabel,
  showScore,
  open,
  onOpenChange,
}: {
  game: CurrentWeekGamePick;
  statusLabel: string;
  showScore: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const account = useActiveAccount();
  const viewer = account?.address.toLowerCase();
  // Only hit ESPN's summary endpoint once the dialog is actually opened.
  const { data: details } = useGameDetails(open ? game.gameId : null);
  // ESPN often leaves broadcast type blank, so list every network it gives us.
  const networks = [
    ...new Set(details?.broadcasts?.map(b => b.media.shortName) ?? []),
  ];
  const description = [statusLabel, networks.join(", ")]
    .filter(Boolean)
    .join(" · ");

  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;
  const sides = [
    {
      key: "away",
      label: game.awayAbbreviation || game.awayTeam,
      name: game.awayTeam,
      logo: game.awayLogo,
      score: awayScore,
      leading: awayScore > homeScore,
      youPicked: game.pick === 0,
      pickers: game.awayPickers,
    },
    {
      key: "home",
      label: game.homeAbbreviation || game.homeTeam,
      name: game.homeTeam,
      logo: game.homeLogo,
      score: homeScore,
      leading: homeScore > awayScore,
      youPicked: game.pick === 1,
      pickers: game.homePickers,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {game.awayTeam} @ {game.homeTeam}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {sides.map(side => {
            const pickers =
              side.youPicked && viewer
                ? [viewer, ...side.pickers]
                : side.pickers;
            return (
              <section key={side.key} className="min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  {side.logo ? (
                    // ESPN team marks are remote SVGs/PNGs without next/image config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={side.name} className="size-9" src={side.logo} />
                  ) : null}
                  <span className="font-semibold">{side.label}</span>
                  {showScore ? (
                    <span
                      className={cn(
                        "ml-auto font-mono text-xl tabular-nums",
                        awayScore !== homeScore &&
                          (side.leading
                            ? "font-bold"
                            : "text-muted-foreground"),
                      )}
                    >
                      {side.score}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pickers.length} {pickers.length === 1 ? "pick" : "picks"}
                </p>
                {pickers.length > 0 ? (
                  <ul className="space-y-2">
                    {pickers.map(address => (
                      <PickerRow
                        key={address}
                        address={address}
                        isYou={address === viewer}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
