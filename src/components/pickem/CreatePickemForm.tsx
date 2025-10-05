"use client";

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
import { usePickemContract } from "@/hooks/usePickemContract";
import { AlertCircle, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

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

const CURRENCIES = [
  {
    value: "ETH",
    label: "ETH",
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    value: "USDC",
    label: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  }, // Update with actual address
];

export default function CreatePickemForm() {
  const account = useActiveAccount();
  const router = useRouter();
  const { createContest } = usePickemContract();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    seasonType: "2",
    weekNumber: "",
    year: new Date().getFullYear().toString(),
    entryFee: "0.01",
    currency: "ETH",
    payoutType: "0",
    customDeadline: "",
  });

  const handleCreate = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.weekNumber) {
      toast.error("Please select a week number");
      return;
    }

    setIsCreating(true);
    try {
      // Convert currency to address
      const currencyAddress =
        formData.currency === "ETH"
          ? "0x0000000000000000000000000000000000000000"
          : CURRENCIES.find(c => c.value === formData.currency)?.address || "";

      // Convert custom deadline to timestamp if provided
      const customDeadline = formData.customDeadline
        ? Math.floor(new Date(formData.customDeadline).getTime() / 1000)
        : 0;

      await createContest({
        seasonType: parseInt(formData.seasonType),
        weekNumber: parseInt(formData.weekNumber),
        year: parseInt(formData.year),
        currency: currencyAddress,
        entryFee: formData.entryFee,
        payoutType: parseInt(formData.payoutType),
        customDeadline,
      });

      toast.success("Pick'em contest created successfully!");
      router.push("/pickem");
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
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
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
            type="number"
            min="1"
            max={
              formData.seasonType === "1"
                ? "4"
                : formData.seasonType === "3"
                  ? "5"
                  : "18"
            }
            value={formData.weekNumber}
            onChange={e =>
              setFormData({ ...formData, weekNumber: e.target.value })
            }
            placeholder={`e.g., ${currentWeek}`}
          />
        </div>
      </div>

      {/* Entry Fee Configuration */}
      <div className="space-y-4">
        <Label>Entry Fee</Label>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="number"
              step="0.01"
              min="0.001"
              value={formData.entryFee}
              onChange={e =>
                setFormData({ ...formData, entryFee: e.target.value })
              }
              placeholder="0.01"
            />
          </div>
          <Select
            value={formData.currency}
            onValueChange={value =>
              setFormData({ ...formData, currency: value })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(currency => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          Participants will pay this amount to submit their predictions
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
                <RadioGroupItem value={type.value} id={type.value} />
                <Label htmlFor={type.value} className="flex-1 cursor-pointer">
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

      {/* Create Button */}
      <Button
        onClick={handleCreate}
        disabled={!account || isCreating}
        className="w-full"
        size="lg"
      >
        {isCreating ? "Creating Contest..." : "Create Pick'em Contest"}
      </Button>

      {!account && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to create a contest
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
