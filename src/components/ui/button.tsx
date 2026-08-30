"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50",
        outline:
          "border border-border bg-transparent hover:bg-muted text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted text-foreground",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-9 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-4 has-[>svg]:px-3 text-xs",
        lg: "h-11 px-8 has-[>svg]:px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const { impactOccurred } = useHaptics();

  const handleClick = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback based on button variant
      const hapticType = variant === "destructive" ? "heavy" : "light";
      await impactOccurred(hapticType);

      // Call the original onClick handler if provided
      if (onClick) {
        onClick(event);
      }
    },
    [impactOccurred, onClick, variant],
  );

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      onClick={handleClick}
      {...props}
    />
  );
}

export { Button, buttonVariants };
