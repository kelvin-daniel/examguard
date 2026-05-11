import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="h-12 border-b border-[var(--border)] bg-white/40 dark:bg-white/5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-t border-[var(--border)] grid grid-cols-6 gap-3 p-4"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-10 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
