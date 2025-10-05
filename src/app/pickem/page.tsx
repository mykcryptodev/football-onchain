"use client";

import CreatePickemForm from "@/components/pickem/CreatePickemForm";
import DebugContests from "@/components/pickem/DebugContests";
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
import { useState } from "react";

export default function PickemPage() {
  const [activeTab, setActiveTab] = useState("contests");

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">NFL Pick&apos;em</h1>
        <p className="text-muted-foreground text-lg">
          Predict winners for all games in an NFL week. Most correct picks wins
          the prize pool!
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contests">Active Contests</TabsTrigger>
          <TabsTrigger value="create">Create Contest</TabsTrigger>
          <TabsTrigger value="my-pickems">My Pick&apos;ems</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="contests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Pick&apos;em Contests</CardTitle>
              <CardDescription>
                Join a contest, submit your predictions, and win prizes!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PickemContestList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
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

        <TabsContent value="my-pickems" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Pick&apos;em NFTs</CardTitle>
              <CardDescription>
                View your predictions and track your performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MyPickems />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug">
          <DebugContests />
        </TabsContent>
      </Tabs>
    </div>
  );
}
