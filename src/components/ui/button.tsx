"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:-translate-y-0.5 hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-sm hover:-translate-y-0.5 hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background/65 shadow-sm backdrop-blur-sm hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card dark:bg-card/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/75",
        ghost: "hover:bg-primary/8 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-9 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-10",
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
      data-haptic-handled
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      onClick={handleClick}
      {...props}
    />
  );
}

export { Button, buttonVariants };
