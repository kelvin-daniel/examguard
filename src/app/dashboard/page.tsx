import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Users,
  Clock,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const exams = await prisma.exam.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
            Your exams
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">
            Welcome back, {user.name.split(" ")[0]}.
          </p>
        </div>
        <Button asChild variant="primary" size="lg">
          <Link href="/dashboard/exams/new">
            <Plus className="h-4 w-4" /> New exam
          </Link>
        </Button>
      </div>

      {exams.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#bfdbfe] flex items-center justify-center mb-4 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.08)]">
            <FileText className="h-6 w-6 text-[#92400e]" />
          </div>
          <h3 className="font-semibold text-[var(--fg)]">
            No exams yet
          </h3>
          <p className="text-sm text-[var(--fg-muted)] mt-1 max-w-sm mx-auto">
            Create your first exam in under a minute. You can add questions,
            schedule a start time, and share a join code with your students.
          </p>
          <Button asChild variant="primary" className="mt-6">
            <Link href="/dashboard/exams/new">
              <Plus className="h-4 w-4" /> Create exam
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/exams/${e.id}`}
              className="group glass rounded-2xl p-5 hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(15,23,42,0.10)] transition-all block"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <StatusBadge status={e.status} />
                <code className="text-xs font-mono text-[var(--fg-muted)] bg-white/60 dark:bg-white/5 px-2 py-0.5 rounded">
                  {e.code}
                </code>
              </div>
              <h3 className="font-semibold text-[var(--fg)] line-clamp-2">
                {e.title}
              </h3>
              {e.description && (
                <p className="mt-1 text-sm text-[var(--fg-muted)] line-clamp-2">
                  {e.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--fg-muted)]">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {e._count.questions} questions
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {e._count.attempts} attempts
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(e.durationMinutes)}
                </span>
              </div>
              {e.startAt && (
                <div className="mt-3 text-xs text-[var(--fg-muted)] flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateTime(e.startAt)}
                </div>
              )}
              <div className="mt-4 text-[var(--primary)] text-sm font-medium inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    draft: { label: "Draft", variant: "default" as const },
    scheduled: { label: "Scheduled", variant: "info" as const },
    live: { label: "Live", variant: "success" as const },
    ended: { label: "Ended", variant: "outline" as const },
  };
  const s = map[status as keyof typeof map] ?? map.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
