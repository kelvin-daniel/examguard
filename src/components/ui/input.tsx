import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-base text-[var(--fg)] transition-colors backdrop-blur-sm",
      "placeholder:text-[var(--fg-subtle)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:bg-white/5 dark:border-white/10",
      "md:text-sm",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full rounded-xl border border-[var(--border-strong)] bg-white/70 px-4 py-3 text-base text-[var(--fg)] transition-colors min-h-[96px] backdrop-blur-sm",
      "placeholder:text-[var(--fg-subtle)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:bg-white/5 dark:border-white/10",
      "md:text-sm resize-y",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-[var(--fg)]",
        className
      )}
      {...props}
    />
  );
}
