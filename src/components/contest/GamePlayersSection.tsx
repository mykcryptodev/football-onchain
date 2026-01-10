"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGamePlayers, type GamePlayer } from "@/hooks/useGamePlayers";

interface GamePlayersSectionProps {
  gameId: number;
}

const buildBioLines = (player: GamePlayer) => {
  const lines = [
    player.position ? `Position: ${player.position}` : null,
    player.jersey ? `Jersey: #${player.jersey}` : null,
    player.age ? `Age: ${player.age}` : null,
    player.height ? `Height: ${player.height}` : null,
    player.weight ? `Weight: ${player.weight} lbs` : null,
    player.college ? `College: ${player.college}` : null,
    player.experience !== undefined
      ? `Experience: ${player.experience} year${player.experience === 1 ? "" : "s"}`
      : null,
  ];

  return lines.filter(Boolean) as string[];
};

export function GamePlayersSection({ gameId }: GamePlayersSectionProps) {
  const { players, teams, isLoading, error } = useGamePlayers(gameId);
  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | null>(null);

  const playersByTeam = useMemo(() => {
    return teams.map(team => ({
      team,
      players: players.filter(player => player.team.id === team.id),
    }));
  }, [players, teams]);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Players</h2>
          <p className="text-sm text-muted-foreground">
            Tap a player to view their bio.
          </p>
        </div>
        <Badge variant="secondary">{players.length} total</Badge>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">
          Loading player roster...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">
          Failed to load player roster.
        </div>
      )}

      {!isLoading && !error && players.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No player data available yet.
        </div>
      )}

      {playersByTeam.map(({ team, players: teamPlayers }) => (
        <div key={team.id} className="mt-4 first:mt-0">
          <div className="flex items-center gap-3 mb-3">
            {team.logo && (
              <img alt={team.displayName} className="h-6 w-6" src={team.logo} />
            )}
            <h3 className="text-sm font-semibold">{team.displayName}</h3>
            {team.abbreviation && (
              <span className="text-xs text-muted-foreground">
                {team.abbreviation}
              </span>
            )}
          </div>
          <ScrollArea className="max-h-[320px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {teamPlayers.map(player => (
                <button
                  key={player.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-left text-xs hover:bg-muted/50 transition"
                  type="button"
                  onClick={() => setSelectedPlayer(player)}
                >
                  {player.headshot ? (
                    <img
                      alt={player.fullName}
                      className="h-8 w-8 rounded-full object-cover"
                      src={player.headshot}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{player.fullName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {player.position || "Player"}
                      {player.jersey ? ` • #${player.jersey}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}

      <Dialog
        open={Boolean(selectedPlayer)}
        onOpenChange={open => {
          if (!open) setSelectedPlayer(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedPlayer.headshot ? (
                  <img
                    alt={selectedPlayer.fullName}
                    className="h-16 w-16 rounded-full object-cover"
                    src={selectedPlayer.headshot}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted" />
                )}
                <div>
                  <div className="text-lg font-semibold">
                    {selectedPlayer.fullName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedPlayer.team.displayName}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Bio</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {buildBioLines(selectedPlayer).map(line => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
