"use client";

import { Bell } from "lucide-react";
import { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddMiniApp } from "@/hooks/useAddMiniApp";

interface AddMiniAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog component that encourages users to add the mini app
 * after purchasing boxes. Explains that this enables notifications.
 */
export const AddMiniAppDialog: FC<AddMiniAppDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { addMiniApp, isAdding } = useAddMiniApp();

  const handleAddMiniApp = async () => {
    await addMiniApp();
    // Close dialog after successful add (or if user cancels)
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Stay Updated with Notifications</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Add this mini app to receive notifications about your contests, game
            results, and payouts. Never miss an update!
          </DialogDescription>
        </DialogHeader>

        {/* <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
            <Bell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">What you&apos;ll get:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Game score notifications</li>
                <li>Payout alerts when you win</li>
                <li>Reminders for upcoming contests</li>
              </ul>
            </div>
          </div>
        </div> */}

        <DialogFooter>
          <Button
            disabled={isAdding}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
          <Button disabled={isAdding} type="button" onClick={handleAddMiniApp}>
            {isAdding ? "Adding..." : "Add Mini App"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
