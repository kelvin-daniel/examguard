import { cn } from "@/lib/utils";

/**
 * Shimmering placeholder block. Use to outline content while it loads so the
 * layout doesn't jump when data arrives.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-[var(--bg-muted)] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent dark:before:via-white/5",
        className
      )}
      {...props}
    />
  );
}
