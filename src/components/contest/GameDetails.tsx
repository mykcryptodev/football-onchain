import { ExternalLink, Tv } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameDetails as GameDetailsType } from "@/hooks/useGameDetails";
import { formatKickoffTime } from "@/lib/date";

interface GameDetailsProps {
  gameDetails: GameDetailsType | null;
  isLoading?: boolean;
}

export function GameDetails({ gameDetails, isLoading }: GameDetailsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading game information...</div>
        </CardContent>
      </Card>
    );
  }

  if (!gameDetails) {
    return null;
  }

  // Group broadcasts by type
  const tvBroadcasts = gameDetails.broadcasts?.filter(
    b => b.type.abbreviation === "TV" || b.type.name.toLowerCase().includes("tv"),
  );
  const radioBroadcasts = gameDetails.broadcasts?.filter(
    b => b.type.abbreviation === "RADIO" || b.type.name.toLowerCase().includes("radio"),
  );
  const otherBroadcasts = gameDetails.broadcasts?.filter(
    b =>
      b.type.abbreviation !== "TV" &&
      !b.type.name.toLowerCase().includes("tv") &&
      b.type.abbreviation !== "RADIO" &&
      !b.type.name.toLowerCase().includes("radio"),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date */}
        {gameDetails.date && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Date & Time</div>
            <div className="text-sm text-muted-foreground">
              {formatKickoffTime(gameDetails.date)}
            </div>
          </div>
        )}

        {/* Venue */}
        {gameDetails.venue && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Venue</div>
            <div className="text-sm text-muted-foreground">
              {gameDetails.venue.fullName}
              {gameDetails.venue.address &&
                `, ${gameDetails.venue.address.city}, ${gameDetails.venue.address.state}`}
            </div>
          </div>
        )}

        {/* Weather */}
        {gameDetails.weather && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Weather</div>
            <div className="text-sm text-muted-foreground">
              {gameDetails.weather.displayValue}
              {gameDetails.weather.temperature > 0 &&
                ` • ${gameDetails.weather.temperature}°F`}
            </div>
          </div>
        )}

        {/* TV Broadcasts */}
        {tvBroadcasts && tvBroadcasts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Tv className="h-4 w-4" />
              <span>TV Broadcast</span>
            </div>
            <div className="space-y-1">
              {tvBroadcasts.map((broadcast, idx) => (
                <div key={idx} className="text-sm text-muted-foreground">
                  {broadcast.media.shortName}
                  {broadcast.market.type && ` (${broadcast.market.type})`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Radio Broadcasts */}
        {radioBroadcasts && radioBroadcasts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Radio</div>
            <div className="space-y-1">
              {radioBroadcasts.map((broadcast, idx) => (
                <div key={idx} className="text-sm text-muted-foreground">
                  {broadcast.media.shortName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Broadcasts */}
        {otherBroadcasts && otherBroadcasts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Other</div>
            <div className="space-y-1">
              {otherBroadcasts.map((broadcast, idx) => (
                <div key={idx} className="text-sm text-muted-foreground">
                  {broadcast.media.shortName} ({broadcast.type.name})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Articles */}
        {gameDetails.articles && gameDetails.articles.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Related Articles</div>
            <div className="space-y-2">
              {gameDetails.articles.slice(0, 5).map((article, idx) => (
                <a
                  key={idx}
                  className="block rounded-md border bg-card p-3 text-sm transition-colors hover:bg-accent"
                  href={article.links.web.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="font-medium leading-tight">
                        {article.headline}
                      </div>
                      {article.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {article.description}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* General Links */}
        {gameDetails.links && gameDetails.links.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Links</div>
            <div className="space-y-1">
              {gameDetails.links
                .filter(
                  link =>
                    link.rel.includes("desktop") ||
                    link.rel.includes("web") ||
                    link.text.toLowerCase().includes("espn"),
                )
                .slice(0, 3)
                .map((link, idx) => (
                  <a
                    key={idx}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>{link.text || "View on ESPN"}</span>
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Show message if no information available */}
        {!gameDetails.venue &&
          !gameDetails.weather &&
          !gameDetails.broadcasts?.length &&
          !gameDetails.articles?.length &&
          !gameDetails.links?.length && (
            <div className="text-sm text-muted-foreground">
              No additional game information available.
            </div>
          )}
      </CardContent>
    </Card>
  );
}
