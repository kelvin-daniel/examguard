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
          "bg-[var(--fg)] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[var(--bg)] dark:hover:bg-slate-100",
        primary:
          "btn-3d bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white hover:from-[#60a5fa] hover:to-[#1d4ed8]",
        outline:
          "border border-[var(--border-strong)] bg-white text-[var(--fg)] hover:bg-[var(--bg-soft)] hover:border-[var(--primary)] dark:bg-white/5 dark:hover:bg-white/10",
        ghost:
          "text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] dark:hover:bg-white/5",
        destructive:
          "bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_4px_12px_-2px_rgba(239,68,68,0.40)]",
        subtle:
          "bg-[var(--bg-muted)] text-[var(--fg)] hover:bg-[var(--border)] dark:bg-white/5 dark:hover:bg-white/10",
        glass:
          "glass text-[var(--fg)] hover:bg-white dark:hover:bg-black/40",
      },
      size: {
        default: "h-11 px-5 text-base",
        sm: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-11 w-11",
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
