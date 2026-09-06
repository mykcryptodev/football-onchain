"use client";
import { AlertCircle, Clock, Loader2, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ZERO_ADDRESS } from "thirdweb";
import { TokenIcon, TokenProvider, useActiveAccount } from "thirdweb/react";
import { parseEventLogs } from "viem";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  chain,
  chainlinkGasLimit,
  chainlinkJobId,
  chainlinkSubscriptionId,
  pickem,
  usdc,
} from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { usePickemContract } from "@/hooks/usePickemContract";
import { Token, useTokens } from "@/hooks/useTokens";
import { formatKickoffTime } from "@/lib/date";
import { resolveTokenIcon } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

import { TokenPicker } from "../contest/TokenPicker";

interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  kickoff: string;
  homeLogo?: string;
  awayLogo?: string;
}

const SEASON_TYPES = [
  { value: "1", label: "Preseason" },
  { value: "2", label: "Regular Season" },
  { value: "3", label: "Postseason" },
];

const PAYOUT_TYPES = [
  {
    value: "0",
    label: "Winner Take All",
    icon: Trophy,
    description: "100% to 1st place",
  },
  { value: "1", label: "Top 3", icon: Users, description: "60% / 30% / 10%" },
  {
    value: "2",
    label: "Top 5",
    icon: Users,
    description: "40% / 25% / 15% / 12% / 8%",
  },
];

export default function CreatePickemForm() {
  const account = useActiveAccount();
  const router = useRouter();
  const { createContest, requestWeekGames, getWeekGameIds } =
    usePickemContract();
  const [isCreating, setIsCreating] = useState(false);
  const [games, setGames] = useState<GameInfo[]>([]);
  // True once we've confirmed the oracle already has this week's games
  // onchain - createContest() reverts otherwise, so this gates the button.
  const [onchainGamesReady, setOnchainGamesReady] = useState(false);
  const [isCheckingGames, setIsCheckingGames] = useState(false);
  const [isRequestingOnchainGames, setIsRequestingOnchainGames] =
    useState(false);
  const [showGames, setShowGames] = useState(false);

  // Keep the latest contract call closures without making them effect
  // dependencies (usePickemContract returns new function identities every
  // render, which would otherwise re-trigger the auto-check effect forever).
  const getWeekGameIdsRef = useRef(getWeekGameIds);
  const requestWeekGamesRef = useRef(requestWeekGames);
  useEffect(() => {
    getWeekGameIdsRef.current = getWeekGameIds;
    requestWeekGamesRef.current = requestWeekGames;
  });

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPoll = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };
  useEffect(() => clearPoll, []);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [usdEstimation, setUsdEstimation] = useState<string>("");
  const { tokens, fetchTokens } = useTokens();
  const [formData, setFormData] = useState({
    seasonType: "2",
    weekNumber: "",
    year: new Date().getFullYear().toString(),
    entryFee: "0.01",
    payoutType: "0",
    customDeadline: "",
  });

  // Fetch tokens on component mount
  useEffect(() => {
    fetchTokens().catch(error => {
      console.error("Error fetching tokens:", error);
      toast.error("Error fetching tokens");
    });
  }, [fetchTokens]);

  // Set default currency to USDC when tokens are loaded
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      const usdcToken = tokens.find(
        token => token.address.toLowerCase() === usdc[chain.id].toLowerCase(),
      );
      if (usdcToken) {
        setSelectedToken(usdcToken);
      }
    }
  }, [tokens, selectedToken]);

  // Calculate USD estimation when entry fee or currency changes
  useEffect(() => {
    if (!formData.entryFee || !selectedToken) {
      setUsdEstimation("");
      return;
    }

    const fee = parseFloat(formData.entryFee);
    if (isNaN(fee) || fee <= 0) {
      setUsdEstimation("");
      return;
    }

    const usdValue = fee * selectedToken.priceUsd;
    setUsdEstimation(`≈ $${usdValue.toFixed(2)} USD`);
  }, [formData.entryFee, selectedToken]);

  // Fetch the (free, read-only) local preview of a week's matchups. Safe to
  // call automatically since it costs no gas and needs no wallet approval.
  const fetchLocalPreview = async () => {
    const response = await fetch(
      `/api/week-games?year=${formData.year}&seasonType=${formData.seasonType}&week=${formData.weekNumber}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch games");
    }
    const fetchedGames: GameInfo[] = await response.json();
    // Sort games by ID to match oracle's sorted order (ascending string sort)
    const sortedGames = fetchedGames.sort((a, b) =>
      a.gameId.localeCompare(b.gameId),
    );
    setGames(sortedGames);
    setShowGames(sortedGames.length > 0);
    return sortedGames;
  };

  // Automatically checks whether this week's games already exist onchain and
  // previews the matchups - no wallet interaction required.
  const checkOnchainAndPreview = async () => {
    if (!formData.weekNumber) return;
    setIsCheckingGames(true);
    try {
      const onchainData = await getWeekGameIdsRef.current({
        year: parseInt(formData.year),
        seasonType: parseInt(formData.seasonType),
        weekNumber: parseInt(formData.weekNumber),
      });
      setOnchainGamesReady(onchainData.gameIds.length > 0);
      await fetchLocalPreview();
    } catch (error) {
      console.error("Error checking week games:", error);
    } finally {
      setIsCheckingGames(false);
    }
  };

  // Auto-run the free check whenever the selected week changes, so the user
  // never has to tap a button just to see whether games need fetching.
  useEffect(() => {
    clearPoll();
    setOnchainGamesReady(false);
    setGames([]);
    setShowGames(false);

    const weekNum = parseInt(formData.weekNumber);
    if (!formData.weekNumber || isNaN(weekNum) || weekNum < 1) return;

    const timeout = setTimeout(() => {
      checkOnchainAndPreview();
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.year, formData.seasonType, formData.weekNumber]);

  // Onchain games aren't fulfilled yet - this is the one step that costs gas
  // and needs a wallet signature, so it's the only part that requires a tap.
  const requestOnchainGames = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!formData.weekNumber) {
      toast.error("Please select a week number first");
      return;
    }

    const requestedWeek = {
      year: formData.year,
      seasonType: formData.seasonType,
      weekNumber: formData.weekNumber,
    };
    const isStale = () =>
      formData.year !== requestedWeek.year ||
      formData.seasonType !== requestedWeek.seasonType ||
      formData.weekNumber !== requestedWeek.weekNumber;

    setIsRequestingOnchainGames(true);
    try {
      await requestWeekGamesRef.current({
        year: parseInt(requestedWeek.year),
        seasonType: parseInt(requestedWeek.seasonType),
        weekNumber: parseInt(requestedWeek.weekNumber),
        subscriptionId: chainlinkSubscriptionId[chain.id],
        gasLimit: Number(chainlinkGasLimit[chain.id]),
        jobId: chainlinkJobId[chain.id],
      });
      toast.info(
        "Onchain fetch requested. Waiting for the oracle to fulfill it - this can take a minute or two.",
      );

      let attempts = 0;
      const maxAttempts = 20; // ~2.5 minutes at 8s intervals
      const poll = async () => {
        attempts += 1;
        try {
          const onchainData = await getWeekGameIdsRef.current({
            year: parseInt(requestedWeek.year),
            seasonType: parseInt(requestedWeek.seasonType),
            weekNumber: parseInt(requestedWeek.weekNumber),
          });
          if (isStale()) return;
          if (onchainData.gameIds.length > 0) {
            setOnchainGamesReady(true);
            await fetchLocalPreview();
            toast.success(
              "Games are ready onchain - you can create the contest now.",
            );
            setIsRequestingOnchainGames(false);
            return;
          }
        } catch (error) {
          console.error("Error polling for onchain games:", error);
        }

        if (attempts >= maxAttempts) {
          toast.error(
            "Still waiting on the oracle. Try again in a minute, or wait a bit longer before creating the contest.",
          );
          setIsRequestingOnchainGames(false);
          return;
        }
        pollTimeoutRef.current = setTimeout(poll, 8000);
      };
      pollTimeoutRef.current = setTimeout(poll, 8000);
    } catch (error) {
      const e = error as Error;
      console.error("Error requesting onchain games:", e);
      toast.error("Failed to fetch onchain games: " + e.message);
      setIsRequestingOnchainGames(false);
    }
  };

  const handleCreate = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.weekNumber) {
      toast.error("Please select a week number");
      return;
    }

    if (!onchainGamesReady) {
      toast.error("Please fetch this week's games onchain first");
      return;
    }

    if (!selectedToken) {
      toast.error("Please select a valid currency");
      return;
    }

    setIsCreating(true);
    try {
      // Get currency address (use zero address for native ETH)
      const currencyAddress =
        selectedToken.symbol === "ETH" ? ZERO_ADDRESS : selectedToken.address;

      // Convert custom deadline to timestamp if provided
      const customDeadline = formData.customDeadline
        ? Math.floor(new Date(formData.customDeadline).getTime() / 1000)
        : 0;

      const receipt = await createContest({
        seasonType: parseInt(formData.seasonType),
        weekNumber: parseInt(formData.weekNumber),
        year: parseInt(formData.year),
        currency: currencyAddress,
        entryFee: formData.entryFee,
        payoutType: parseInt(formData.payoutType),
        customDeadline,
      });

      toast.success("Pick'em contest created successfully!");

      const [created] = parseEventLogs({
        abi: pickemAbi,
        eventName: "ContestCreated",
        logs: receipt.logs.filter(
          log => log.address.toLowerCase() === pickem[chain.id].toLowerCase(),
        ),
      });
      if (created) {
        const contestId = created.args.contestId;
        router.push(`/pickem/${contestId}?created=1`);
      } else {
        console.error("ContestCreated event not found in receipt", receipt);
        router.push("/pickem");
      }
    } catch (error) {
      console.error("Error creating contest:", error);
      toast.error("Failed to create contest");
    } finally {
      setIsCreating(false);
    }
  };

  const currentWeek = Math.min(
    18,
    Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(formData.year + "-09-01").getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ) + 1,
    ),
  );

  return (
    <div className="space-y-6">
      {/* Season Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="year">Year</Label>
          <Select
            value={formData.year}
            onValueChange={(value: string) =>
              setFormData({ ...formData, year: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[new Date().getFullYear() - 1, new Date().getFullYear()].map(
                year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="seasonType">Season Type</Label>
          <Select
            value={formData.seasonType}
            onValueChange={value =>
              setFormData({ ...formData, seasonType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASON_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="weekNumber">Week Number</Label>
          <Input
            id="weekNumber"
            min="1"
            placeholder={`e.g., ${currentWeek}`}
            type="number"
            value={formData.weekNumber}
            max={
              formData.seasonType === "1"
                ? "4"
                : formData.seasonType === "3"
                  ? "5"
                  : "18"
            }
            onChange={e =>
              setFormData({ ...formData, weekNumber: e.target.value })
            }
          />
        </div>
      </div>

      {/* Auto-checking status */}
      {isCheckingGames && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking games for this week…
        </div>
      )}

      {/* Games Preview */}
      {showGames && games.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              Games for Week {formData.weekNumber} ({games.length} games)
            </Label>
            {formData.weekNumber && !isCheckingGames && (
              <span
                className={
                  onchainGamesReady
                    ? "text-xs font-medium text-green-600"
                    : "text-xs font-medium text-amber-600"
                }
              >
                {onchainGamesReady ? "Onchain ✓" : "Not fetched onchain yet"}
              </span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {games.map(game => (
              <div
                key={game.gameId}
                className="flex justify-between items-center p-2 border rounded"
              >
                <span>
                  {game.awayTeam} @ {game.homeTeam}
                </span>
                <span className="text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatKickoffTime(game.kickoff)}
                </span>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowGames(false)}>
            Hide Games
          </Button>
        </div>
      )}

      {/* Entry Fee Configuration */}
      <div className="space-y-4">
        <Label>Entry Fee</Label>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              min="0.001"
              placeholder="0.01"
              step="0.01"
              type="number"
              value={formData.entryFee}
              onChange={e =>
                setFormData({ ...formData, entryFee: e.target.value })
              }
            />
          </div>
          <Button
            className="w-48 justify-start"
            type="button"
            variant="outline"
            onClick={() => setTokenPickerOpen(true)}
          >
            {selectedToken ? (
              <div className="flex items-center gap-2">
                <TokenProvider
                  address={selectedToken.address}
                  chain={chain}
                  client={client}
                >
                  <TokenIcon
                    className="size-6 flex-shrink-0"
                    iconResolver={async () =>
                      await resolveTokenIcon(selectedToken)
                    }
                  />
                </TokenProvider>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="font-medium text-sm">
                    {selectedToken.symbol}
                  </span>
                  <span className="text-muted-foreground text-xs truncate">
                    {selectedToken.name}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select currency</span>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Participants will pay this amount to submit their predictions
          {usdEstimation && (
            <span className="ml-2 font-medium text-blue-600">
              {usdEstimation}
            </span>
          )}
        </p>
      </div>

      {/* Payout Structure */}
      <div className="space-y-4">
        <Label>Payout Structure</Label>
        <RadioGroup
          value={formData.payoutType}
          onValueChange={value =>
            setFormData({ ...formData, payoutType: value })
          }
        >
          {PAYOUT_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <div
                key={type.value}
                className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
              >
                <RadioGroupItem id={type.value} value={type.value} />
                <Label className="flex-1 cursor-pointer" htmlFor={type.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{type.label}</span>
                    <span className="text-sm text-muted-foreground">
                      • {type.description}
                    </span>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Custom Deadline (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="customDeadline">
          Custom Submission Deadline (Optional)
        </Label>
        <Input
          id="customDeadline"
          type="datetime-local"
          value={formData.customDeadline}
          onChange={e =>
            setFormData({ ...formData, customDeadline: e.target.value })
          }
        />
        <p className="text-sm text-muted-foreground">
          Leave empty to use default (7 days from creation)
        </p>
      </div>

      {/* Treasury Fee Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A 2% treasury fee will be collected from the total prize pool.
        </AlertDescription>
      </Alert>

      {/* Onchain fetch prerequisite notice */}
      {account &&
        !!formData.weekNumber &&
        !isCheckingGames &&
        !onchainGamesReady && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This week&apos;s games haven&apos;t been fetched onchain yet.
              That&apos;s required before a contest can be created - tap the
              button below to fetch them (this needs a wallet transaction).
            </AlertDescription>
          </Alert>
        )}

      {/* Create Button - doubles as the onchain-fetch prerequisite when needed */}
      {onchainGamesReady ? (
        <Button
          className="w-full"
          disabled={!account || isCreating}
          size="lg"
          onClick={handleCreate}
        >
          {isCreating ? "Creating Contest..." : "Create Pick'em Contest"}
        </Button>
      ) : (
        <Button
          className="w-full"
          size="lg"
          disabled={
            !account ||
            !formData.weekNumber ||
            isCheckingGames ||
            isRequestingOnchainGames
          }
          onClick={requestOnchainGames}
        >
          {isRequestingOnchainGames ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Games Onchain…
            </>
          ) : isCheckingGames ? (
            "Checking Games…"
          ) : !formData.weekNumber ? (
            "Select a Week to Continue"
          ) : (
            "Fetch Onchain Games to Continue (Required)"
          )}
        </Button>
      )}

      {!account && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to create a contest
          </AlertDescription>
        </Alert>
      )}

      {/* Token Picker Modal */}
      <TokenPicker
        open={tokenPickerOpen}
        selectedTokenAddress={selectedToken?.address}
        onOpenChange={setTokenPickerOpen}
        onTokenSelect={token => {
          setSelectedToken(token);
        }}
      />
    </div>
  );
}
