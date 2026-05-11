import { Skeleton } from "@/components/ui/skeleton";

export default function ExamEditorLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Skeleton className="h-5 w-24 mb-4" />
      {/* Header card */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e40af 100%)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <Skeleton className="h-6 w-20 rounded-full !bg-white/20 [&_*]:!via-white/20" />
            <Skeleton className="h-9 w-2/3 !bg-white/20 [&_*]:!via-white/20" />
            <Skeleton className="h-5 w-1/2 !bg-white/15 [&_*]:!via-white/15" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 !bg-white/15 [&_*]:!via-white/20" />
            <Skeleton className="h-10 w-40 !bg-white/20 [&_*]:!via-white/30" />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-11 w-32 rounded-xl !bg-white/20 [&_*]:!via-white/30" />
          <Skeleton className="h-11 w-28 rounded-xl !bg-white/15 [&_*]:!via-white/20" />
          <Skeleton className="h-11 w-28 rounded-xl !bg-white/15 [&_*]:!via-white/20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-[var(--border)]">
        <Skeleton className="h-10 w-32 mb-0 rounded-b-none" />
        <Skeleton className="h-10 w-24 mb-0 rounded-b-none" />
      </div>

      {/* Question cards skeleton */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/70 dark:bg-white/5 border border-[var(--border)] p-5 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
