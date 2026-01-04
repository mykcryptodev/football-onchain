"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  getContract,
  prepareContractCall,
  toUnits,
  ZERO_ADDRESS,
} from "thirdweb";
import { TokenIcon, TokenProvider, TransactionButton } from "thirdweb/react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  chain,
  contests,
  quartersOnlyPayoutStrategy,
  scoreChangesPayoutStrategy,
  usdc,
} from "@/constants";
import { abi } from "@/constants/abis/contests";
import { useNFLGames } from "@/hooks/useNFLGames";
import { type Token, useTokens } from "@/hooks/useTokens";
import { queryKeys } from "@/lib/query-keys";
import { resolveTokenIcon } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

import { TokenPicker } from "./TokenPicker";
import { PayoutStrategyType } from "./types";

// Types for API responses
type CurrentWeekResponse = {
  week: number;
  season: number;
  seasonYear: number;
};

// Form validation schema
const createContestSchema = z.object({
  title: z
    .string()
    .min(3, {
      message: "Contest title must be at least 3 characters.",
    })
    .max(100, {
      message: "Contest title must not exceed 100 characters.",
    }),
  description: z
    .string()
    .min(10, {
      message: "Description must be at least 10 characters.",
    })
    .max(500, {
      message: "Description must not exceed 500 characters.",
    }),
  seasonType: z.enum(["1", "2", "3"], {
    message: "Please select a season type.",
  }),
  week: z.string().min(1, {
    message: "Please select a week.",
  }),
  gameId: z.string().min(1, {
    message: "Please select a game.",
  }),
  boxCost: z.string().refine(
    val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: "Box cost must be a positive number.",
    },
  ),
  currency: z.string().min(1, {
    message: "Please select a currency.",
  }),
  maxParticipants: z.string().refine(
    val => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 10 && num <= 100;
    },
    {
      message: "Max participants must be between 10 and 100.",
    },
  ),
  payoutStrategy: z.enum(
    Object.values(PayoutStrategyType) as [string, ...string[]],
    {
      message: "Please select a payout strategy.",
    },
  ),
});

type CreateContestFormValues = z.infer<typeof createContestSchema>;

export function CreateContestForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, setCurrentWeek] = useState<CurrentWeekResponse | null>(null);
  const [usdEstimation, setUsdEstimation] = useState<string>("");
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const { tokens, fetchTokens } = useTokens();

  const form = useForm<CreateContestFormValues>({
    resolver: zodResolver(createContestSchema),
    defaultValues: {
      title: "",
      description: "",
      seasonType: "2", // Regular season
      week: "",
      gameId: "",
      boxCost: "",
      currency: "",
      maxParticipants: "100",
      payoutStrategy: PayoutStrategyType.QUARTERS_ONLY,
    },
  });

  // Watch for changes in season type or week
  const seasonType = form.watch("seasonType");
  const week = form.watch("week");
  const boxCost = form.watch("boxCost");

  // Use the new useNFLGames hook
  const { games, isLoading: loadingGames } = useNFLGames(seasonType, week);

  // Store contract instance in state so we can use it for event parsing
  const [contestContract] = useState(() =>
    getContract({
      client,
      chain,
      address: contests[chain.id],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abi as any,
    }),
  );

  const createContestCreationTx = useCallback(async () => {
    const formData = form.getValues();

    // Validate form data
    if (
      !formData.gameId ||
      !formData.title ||
      !formData.description ||
      !formData.boxCost
    ) {
      throw new Error("Please fill in all required fields");
    }

    // Use the selected token
    if (!selectedToken) {
      throw new Error("Please select a valid currency");
    }

    // Convert box cost to wei using the token's decimals
    const decimals = selectedToken.decimals;
    const boxCostWei = toUnits(formData.boxCost, decimals);

    // Get currency address (use zero address for native ETH)
    const currencyAddress =
      selectedToken.symbol === "ETH" ? ZERO_ADDRESS : selectedToken.address;

    // Get payout strategy address based on selection
    const payoutStrategyAddress =
      formData.payoutStrategy === PayoutStrategyType.QUARTERS_ONLY
        ? quartersOnlyPayoutStrategy[chain.id]
        : scoreChangesPayoutStrategy[chain.id];

    // Prepare the contract call
    return prepareContractCall({
      contract: contestContract,
      method: "createContest",
      params: [
        BigInt(formData.gameId), // gameId
        boxCostWei, // boxCost
        currencyAddress, // boxCurrency
        formData.title, // title
        formData.description, // description
        payoutStrategyAddress, // payoutStrategy
      ],
    });
  }, [form, selectedToken, contestContract]);

  // Fetch current week/season on component mount
  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const response = await fetch("/api/games/current");
        if (response.ok) {
          const data: CurrentWeekResponse = await response.json();
          setCurrentWeek(data);
          // Set default values
          form.setValue(
            "seasonType",
            data.season.toString() as "1" | "2" | "3",
          );
          form.setValue("week", data.week.toString());
        }
      } catch (error) {
        console.error("Error fetching current week:", error);
      }
    };

    fetchCurrentWeek();
    fetchTokens().catch(error => {
      console.error("Error fetching tokens:", error);
      toast.error("Error fetching tokens");
    });
  }, [form, fetchTokens]);

  // Set default currency to USDC when tokens are loaded
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      const usdcToken = tokens.find(
        token => token.address.toLowerCase() === usdc[chain.id].toLowerCase(),
      );
      if (usdcToken) {
        setSelectedToken(usdcToken);
        form.setValue("currency", usdcToken.address);
      }
    }
  }, [tokens, selectedToken, form]);

  // Calculate USD estimation
  const calculateUsdEstimation = useCallback(() => {
    if (!boxCost || !selectedToken || !selectedToken.priceUsd) {
      setUsdEstimation("");
      return;
    }

    const cost = parseFloat(boxCost);
    if (isNaN(cost) || cost <= 0) {
      setUsdEstimation("");
      return;
    }

    const usdValue = cost * selectedToken.priceUsd;
    setUsdEstimation(`≈ $${usdValue.toFixed(2)} USD`);
  }, [boxCost, selectedToken]);

  // Update USD estimation when box cost or currency changes
  useEffect(() => {
    calculateUsdEstimation();
  }, [calculateUsdEstimation]);

  // Reset game selection when season/week changes
  useEffect(() => {
    if (seasonType && week) {
      form.setValue("gameId", "");
    }
  }, [seasonType, week, form]);

  function onSubmit() {
    // This function is now handled by the TransactionButton
    // The form validation will still work, but the actual submission
    // is handled by the createContestCreationTx function
    console.log("Form validated successfully");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contest Details</CardTitle>
        <CardDescription>
          Fill out the information below to create your football squares
          contest.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Contest Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contest Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Super Bowl 2024 Squares" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Give your contest a memorable name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[100px]"
                      placeholder="Join our Super Bowl squares pool! Winner takes all for each quarter."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Contest rules and special instructions.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Season Type, Week, and Game Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Season Type */}
              <FormField
                control={form.control}
                name="seasonType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season Type</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select season type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Preseason</SelectItem>
                        <SelectItem value="2">Regular Season</SelectItem>
                        <SelectItem value="3">Postseason</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Choose the season type.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Week */}
              <FormField
                control={form.control}
                name="week"
                render={({ field }) => {
                  const weeksInRegularSeason = 18;
                  const weeksInPreseason = 4;
                  const weeksInPostseason = 5;

                  const getMaxWeeks = () => {
                    switch (seasonType) {
                      case "1":
                        return weeksInPreseason;
                      case "2":
                        return weeksInRegularSeason;
                      case "3":
                        return weeksInPostseason;
                      default:
                        return weeksInRegularSeason;
                    }
                  };

                  const maxWeeks = getMaxWeeks();
                  const weekOptions = Array.from(
                    { length: maxWeeks },
                    (_, i) => i + 1,
                  );

                  return (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weekOptions.map(week => (
                            <SelectItem key={week} value={week.toString()}>
                              Week {week}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Choose the week number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Game Selection */}
              <FormField
                control={form.control}
                name="gameId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game</FormLabel>
                    <Select
                      disabled={loadingGames || games.length === 0}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingGames
                                ? "Loading games..."
                                : games.length === 0
                                  ? "No games available"
                                  : "Select a game"
                            }
                          >
                            {field.value &&
                              (() => {
                                const selectedGame = games.find(
                                  g => g.id === field.value,
                                );
                                if (selectedGame) {
                                  const homeTeam =
                                    selectedGame.competitions?.competitors?.find(
                                      c => c.homeAway === "home",
                                    );
                                  const awayTeam =
                                    selectedGame.competitions?.competitors?.find(
                                      c => c.homeAway === "away",
                                    );
                                  return homeTeam && awayTeam
                                    ? `${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`
                                    : selectedGame.shortName ||
                                        selectedGame.name;
                                }
                                return null;
                              })()}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {games
                          .sort(
                            (a, b) =>
                              new Date(a.date).getTime() -
                              new Date(b.date).getTime(),
                          )
                          .map(game => {
                            const homeTeam =
                              game.competitions?.competitors?.find(
                                c => c.homeAway === "home",
                              );
                            const awayTeam =
                              game.competitions?.competitors?.find(
                                c => c.homeAway === "away",
                              );
                            const gameDisplay =
                              homeTeam && awayTeam
                                ? `${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`
                                : game.shortName || game.name;

                            // Format the date and time
                            const gameDate = new Date(game.date);
                            const dateOptions: Intl.DateTimeFormatOptions = {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            };
                            const timeOptions: Intl.DateTimeFormatOptions = {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZoneName: "short",
                            };
                            const formattedDate = gameDate.toLocaleDateString(
                              "en-US",
                              dateOptions,
                            );
                            const formattedTime = gameDate.toLocaleTimeString(
                              "en-US",
                              timeOptions,
                            );

                            return (
                              <SelectItem key={game.id} value={game.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {gameDisplay}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formattedDate} at {formattedTime}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Select the game.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box Cost */}
              <FormField
                control={form.control}
                name="boxCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Box Cost</FormLabel>
                    <FormControl>
                      <Input
                        min="0"
                        placeholder="10.00"
                        step="0.01"
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Cost per square.
                      {usdEstimation && (
                        <span className="ml-2 font-medium text-blue-600">
                          {usdEstimation}
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={() => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Button
                        className="w-full justify-start h-10"
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
                          <span className="text-muted-foreground">
                            Select currency
                          </span>
                        )}
                      </Button>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Payment currency.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payout Strategy Selection */}
            <FormField
              control={form.control}
              name="payoutStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payout Strategy</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payout strategy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PayoutStrategyType.QUARTERS_ONLY}>
                        <div className="flex flex-col">
                          <span className="font-medium">Quarters Only</span>
                          <span className="text-xs text-muted-foreground">
                            Q1: 15% • Q2: 20% • Q3: 15% • Q4: 50%
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value={PayoutStrategyType.SCORE_CHANGES}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            Score Changes + Quarters
                          </span>
                          <span className="text-xs text-muted-foreground">
                            50% for score changes • 50% for quarters
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    <div className="space-y-1">
                      <div>
                        <strong>Quarters Only:</strong> Pay out only at the end
                        of each quarter. Winners can claim immediately after
                        each quarter.
                      </div>
                      <div>
                        <strong>Score Changes + Quarters:</strong> Pay out for
                        every score change plus quarters. All payouts happen
                        only after the game is completely finished.
                      </div>
                    </div>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <TransactionButton
                className="!size-9"
                transaction={createContestCreationTx}
                onError={error => {
                  toast.error("Failed to create contest", {
                    description:
                      error.message ||
                      "An error occurred while creating the contest.",
                  });
                }}
                onTransactionConfirmed={async receipt => {
                  try {
                    // Filter logs for our contract address
                    const contractLogs = receipt.logs.filter(
                      log =>
                        log.address.toLowerCase() ===
                        contestContract.address.toLowerCase(),
                    );

                    // ContestCreated event has signature: event ContestCreated(uint256 indexed contestId, address indexed creator)
                    // The contestId is in topics[1] as an indexed parameter
                    const contestCreatedLog = contractLogs.find(
                      log => log.topics && log.topics.length >= 2,
                    );

                    if (contestCreatedLog && contestCreatedLog.topics[1]) {
                      // Decode the contestId from the second topic (topics[1])
                      // It's a uint256, so we can convert the hex string to bigint
                      const contestId = BigInt(contestCreatedLog.topics[1]);

                      toast.success("Contest created successfully!", {
                        description: "Your contest has been created onchain.",
                      });

                      // Invalidate the contests cache to refresh the join page
                      await queryClient.invalidateQueries({
                        queryKey: queryKeys.boxesContests(),
                      });

                      // Reset form
                      form.reset();

                      // Redirect to the new contest page
                      router.push(`/contest/${contestId}`);
                    } else {
                      console.error(
                        "ContestCreated event not found in receipt",
                        "Contract logs:",
                        contractLogs,
                      );
                      toast.success("Contest created successfully!");
                      form.reset();
                    }
                  } catch (error) {
                    console.error(
                      "Error processing transaction receipt:",
                      error,
                    );
                    toast.success("Contest created successfully!");
                    form.reset();
                  }
                }}
              >
                Create Contest
              </TransactionButton>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Token Picker Modal */}
      <TokenPicker
        open={tokenPickerOpen}
        selectedTokenAddress={selectedToken?.address}
        onOpenChange={setTokenPickerOpen}
        onTokenSelect={token => {
          setSelectedToken(token);
          form.setValue("currency", token.address);
        }}
      />
    </Card>
  );
}
