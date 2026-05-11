import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <Skeleton className="h-9 w-56 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, section) => (
          <div key={section}>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="glass rounded-2xl overflow-hidden">
              <div className="h-12 border-b border-[var(--border)] bg-white/40 dark:bg-white/5" />
              {Array.from({ length: 3 }).map((_, row) => (
                <div
                  key={row}
                  className="border-t border-[var(--border)] grid grid-cols-5 gap-4 p-4"
                >
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-9 w-32 justify-self-end rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
