import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    default:
      "bg-[var(--bg-muted)] text-[var(--fg-muted)] dark:bg-white/5 dark:text-[var(--fg-muted)]",
    success:
      "bg-[#e8f7f0] text-[#2c8260] dark:bg-[#1a3a30] dark:text-[#7dd3b8]",
    warning:
      "bg-[#fff4d8] text-[#8a6420] dark:bg-[#3a2e1a] dark:text-[#ffd97a]",
    danger:
      "bg-[#ffe4e8] text-[#a83b4f] dark:bg-[#3a1f24] dark:text-[#ffa8b8]",
    info:
      "bg-[#ece3fa] text-[#5e4a8c] dark:bg-[#2a2238] dark:text-[#b8a4e0]",
    outline:
      "border border-[var(--border-strong)] text-[var(--fg-muted)] dark:border-white/15",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
