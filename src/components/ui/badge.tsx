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
      "bg-[var(--bg-muted)] text-[var(--fg-muted)] dark:bg-white/10 dark:text-[var(--fg-muted)]",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    info: "bg-[var(--primary-bg)] text-[var(--primary-hover)] dark:bg-[#1e3a8a] dark:text-[#93c5fd]",
    outline:
      "border border-[var(--border-strong)] text-[var(--fg-muted)] dark:border-white/15",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
