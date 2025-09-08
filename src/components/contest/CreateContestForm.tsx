"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  currency: z.enum(["USDC", "ETH"], {
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
  payoutStructure: z.enum(["standard", "winner-takes-all", "custom"], {
    message: "Please select a payout structure.",
  }),
});

type CreateContestFormValues = z.infer<typeof createContestSchema>;

export function CreateContestForm() {
  const form = useForm<CreateContestFormValues>({
    resolver: zodResolver(createContestSchema),
    defaultValues: {
      title: "",
      description: "",
      gameId: "",
      boxCost: "",
      currency: "USDC",
      maxParticipants: "100",
      payoutStructure: "standard",
    },
  });

  function onSubmit(data: CreateContestFormValues) {
    // TODO: Implement contest creation logic
    console.log("Contest creation data:", data);

    // Here you would typically:
    // 1. Call the smart contract to create the contest
    // 2. Handle the transaction
    // 3. Redirect to the new contest page

    // For now, show a success toast
    toast.success("Contest created successfully!", {
      description:
        "Your contest has been submitted. Check console for details.",
    });
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      placeholder="Join our Super Bowl squares pool! Winner takes all for each quarter."
                      className="min-h-[100px]"
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

            {/* Game Selection */}
            <FormField
              control={form.control}
              name="gameId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">
                        Chiefs vs 49ers - Super Bowl LVIII
                      </SelectItem>
                      <SelectItem value="2">
                        Cowboys vs Eagles - Week 18
                      </SelectItem>
                      <SelectItem value="3">
                        Bills vs Dolphins - Wild Card
                      </SelectItem>
                      <SelectItem value="4">
                        Packers vs Bears - Week 17
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Select the game for your contest.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="10.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Cost per square.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Payment currency.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Participants */}
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        placeholder="100"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Max squares (10-100).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payout Structure */}
              <FormField
                control={form.control}
                name="payoutStructure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payout Structure</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payout structure" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">
                          Standard (20% per quarter)
                        </SelectItem>
                        <SelectItem value="winner-takes-all">
                          Winner Takes All
                        </SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Payout distribution method.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit">Create Contest</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
