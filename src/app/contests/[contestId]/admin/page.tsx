"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import {
  ContestActions,
  ContestHeader,
  ContestStats,
} from "@/components/contest";
import { Button } from "@/components/ui/button";
import { useContestData } from "@/hooks/useContestData";
import { useFetchGameData } from "@/hooks/useFetchGameData";
import { useFetchScoreChanges } from "@/hooks/useFetchScoreChanges";
import { useProcessPayouts } from "@/hooks/useProcessPayouts";
import { useRandomNumbers } from "@/hooks/useRandomNumbers";

export default function ContestAdminPage() {
  const params = useParams();
  const contestId = params.contestId as string;

  const {
    contest,
    isLoading: loading,
    isRefreshing,
    refreshContestData,
    refreshGameScores,
  } = useContestData(contestId);

  const { handleRequestRandomNumbers, isLoading: isRequestingRandomNumbers } =
    useRandomNumbers();

  const {
    handleProcessPayouts: processPayouts,
    isLoading: isProcessingPayouts,
  } = useProcessPayouts();

  const { handleFetchGameData, isLoading: isSyncingScoresOnchain } =
    useFetchGameData();

  const {
    handleFetchScoreChanges: fetchScoreChanges,
    isLoading: isFetchingScoreChanges,
  } = useFetchScoreChanges();

  const handleProcessPayouts = async () => {
    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await processPayouts(
        contest.id,
        async () => {
          toast.success("Payouts processed successfully!");
        },
        error => {
          console.error("Failed to process payouts:", error);
          toast.error("Failed to process payouts. Please try again.");
        },
      );
    } catch (error) {
      console.error("Failed to process payouts:", error);
      toast.error("Failed to process payouts. Please try again.");
    }
  };

  const handleSyncScoresOnchain = async () => {
    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await handleFetchGameData(
        contest.gameId,
        "quarter-scores",
        async () => {
          toast.success(
            "Scores sync initiated successfully! This may take a few minutes to complete.",
          );
        },
        error => {
          console.error("Failed to sync scores onchain:", error);
          toast.error(
            error.message || "Failed to sync scores onchain. Please try again.",
          );
        },
      );
    } catch (error) {
      console.error("Failed to sync scores onchain:", error);
      toast.error(
        (error as Error).message ||
          "Failed to sync scores onchain. Please try again.",
      );
    }
  };

  const handleFetchScoreChangesOnchain = async () => {
    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await fetchScoreChanges(
        contest.gameId,
        async () => {
          toast.success(
            "Score changes fetch initiated successfully! This may take a few minutes to complete.",
          );
        },
        error => {
          console.error("Failed to fetch score changes:", error);
          toast.error(
            error.message ||
              "Failed to fetch score changes. Please try again.",
          );
        },
      );
    } catch (error) {
      console.error("Failed to fetch score changes:", error);
      toast.error(
        (error as Error).message ||
          "Failed to fetch score changes. Please try again.",
      );
    }
  };

  const handleViewTransactionHistory = () => {
    console.log("Viewing transaction history for contest:", contestId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading contest...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
            <p className="text-muted-foreground">
              The contest you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button asChild size="sm" variant="outline">
            <Link href={`/contest/${contestId}`}>Back to contest</Link>
          </Button>
        </div>

        <ContestHeader contest={contest} />
        <ContestStats contest={contest} />

        <div className="max-w-xl">
          <ContestActions
            contest={contest}
            isFetchingScoreChanges={isFetchingScoreChanges}
            isProcessingPayouts={isProcessingPayouts}
            isRefreshingContestData={isRefreshing}
            isRefreshingGameScores={isRefreshing}
            isRequestingRandomNumbers={isRequestingRandomNumbers}
            isSyncingScoresOnchain={isSyncingScoresOnchain}
            onFetchScoreChanges={handleFetchScoreChangesOnchain}
            onProcessPayouts={handleProcessPayouts}
            onRefreshContestData={refreshContestData}
            onRefreshGameScores={refreshGameScores}
            onSyncScoresOnchain={handleSyncScoresOnchain}
            onViewTransactionHistory={handleViewTransactionHistory}
            onRequestRandomNumbers={() =>
              handleRequestRandomNumbers(parseInt(contestId))
            }
          />
        </div>
      </main>
    </div>
  );
}
