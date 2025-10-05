"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePickemContract } from "@/hooks/usePickemContract";
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";

export default function DebugContests() {
  const account = useActiveAccount();
  const { getNextContestId, getContest } = usePickemContract();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const debugContests = async () => {
    if (!account) return;

    setLoading(true);
    try {
      console.log("🔍 Starting debug...");

      const nextId = await getNextContestId();
      console.log("📊 Next contest ID:", nextId);

      const contests = [];
      for (let i = 0; i < nextId; i++) {
        try {
          console.log(`🔍 Fetching contest ${i}...`);
          const contest = await getContest(i);
          console.log(`✅ Contest ${i}:`, contest);
          console.log(`Contest ${i} id:`, contest?.id, `Expected: ${i}`);

          if (contest && contest.id === i) {
            contests.push({
              id: Number(contest.id),
              creator: contest.creator,
              seasonType: contest.seasonType,
              weekNumber: contest.weekNumber,
              year: Number(contest.year),
              entryFee: contest.entryFee.toString(),
              currency: contest.currency,
              totalPrizePool: contest.totalPrizePool.toString(),
              totalEntries: Number(contest.totalEntries),
              submissionDeadline: Number(contest.submissionDeadline),
              gamesFinalized: contest.gamesFinalized,
              payoutType: contest.payoutType,
              gameIds: contest.gameIds.map(id => id.toString()),
            });
          }
        } catch (err) {
          console.log(`❌ Contest ${i} error:`, err);
        }
      }

      setDebugInfo({
        nextContestId: Number(nextId),
        totalContests: contests.length,
        contests: contests,
        account: account.address,
      });

      console.log("🎯 Debug complete:", {
        nextContestId: Number(nextId),
        totalContests: contests.length,
        contests: contests,
      });
    } catch (error) {
      console.error("💥 Debug error:", error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Debug Contests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={debugContests} disabled={!account || loading}>
          {loading ? "Debugging..." : "Debug Contests"}
        </Button>

        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {!account && (
          <p className="text-muted-foreground">
            Please connect your wallet first
          </p>
        )}
      </CardContent>
    </Card>
  );
}
