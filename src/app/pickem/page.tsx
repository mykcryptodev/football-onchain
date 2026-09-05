"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import CreatePickemForm from "@/components/pickem/CreatePickemForm";
import MyPickems from "@/components/pickem/MyPickems";
import PickemContestList from "@/components/pickem/PickemContestList";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const tab = searchParams.get("tab");
  const activeTab = tab === "create" || tab === "my-pickems" ? tab : "contests";
  const setActiveTab = (value: string) =>
    router.push(value === "contests" ? "/pickem" : `/pickem?tab=${value}`, {
      scroll: false,
    });

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">NFL Pick&apos;em</h1>
          <p className="text-muted-foreground text-lg">
            Choose a contest. Pick each winner. Follow your results.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link
            href={activeTab === "create" ? "/pickem" : "/pickem?tab=create"}
          >
            {activeTab === "create" ? "Back to contests" : "Create a contest"}
          </Link>
        </Button>
      </div>

      <Tabs
        className="space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        {activeTab !== "create" && (
          <TabsList className="grid w-full grid-cols-2 sm:w-80">
            <TabsTrigger value="contests">Find a contest</TabsTrigger>
            <TabsTrigger value="my-pickems">My picks</TabsTrigger>
          </TabsList>
        )}

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
