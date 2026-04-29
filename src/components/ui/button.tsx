"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#2a1f1a] text-white hover:bg-[#3a2d24] dark:bg-white dark:text-[#2a1f1a] dark:hover:bg-[#fbeee2]",
        primary:
          "btn-3d bg-gradient-to-b from-[#ff8a6e] to-[#ff7a59] text-white hover:from-[#ff9c84] hover:to-[#ff7a59] dark:from-[#ff9678] dark:to-[#ff7a59]",
        outline:
          "border border-[var(--border-strong)] bg-white/70 text-[var(--fg)] hover:bg-white backdrop-blur-sm dark:bg-white/5 dark:text-[var(--fg)] dark:hover:bg-white/10",
        ghost:
          "text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] dark:hover:bg-white/5",
        destructive:
          "bg-gradient-to-b from-[#ff7a8d] to-[#e85a72] text-white hover:from-[#ff8a9d] hover:to-[#d94a62] shadow-[0_1px_0_0_rgba(255,255,255,0.3)_inset,0_4px_12px_-2px_rgba(232,90,114,0.4)]",
        subtle:
          "bg-[var(--bg-muted)] text-[var(--fg)] hover:bg-[var(--bg-soft)] dark:bg-white/5 dark:hover:bg-white/10",
        glass:
          "glass text-[var(--fg)] hover:bg-white/80 dark:hover:bg-black/40",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
