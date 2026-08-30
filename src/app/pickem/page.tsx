"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import CreatePickemForm from "@/components/pickem/CreatePickemForm";
import MyPickems from "@/components/pickem/MyPickems";
import PickemContestList from "@/components/pickem/PickemContestList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function PickemPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "create" ? "create" : "contests",
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">NFL Pick&apos;em</h1>
        <p className="text-base text-muted-foreground">
          Predict winners for all games in an NFL week. Most correct picks wins
          the prize pool.
        </p>
      </div>

      <Tabs
        className="space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="inline-flex">
          <TabsTrigger value="contests">Contests</TabsTrigger>
          <TabsTrigger value="create">Create Contest</TabsTrigger>
          <TabsTrigger value="my-pickems">My Pick&apos;ems</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="contests">
          <PickemContestList />
        </TabsContent>

        <TabsContent className="space-y-4" value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Pick&apos;em Contest</CardTitle>
              <CardDescription>
                Set up a new weekly NFL Pick&apos;em contest for others to join
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreatePickemForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="my-pickems">
          <MyPickems />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PickemPage() {
  return (
    <Suspense fallback={null}>
      <PickemPageContent />
    </Suspense>
  );
}
