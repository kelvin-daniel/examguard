import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      attempts: {
        orderBy: { startedAt: "desc" },
        include: { _count: { select: { violations: true, answers: true } } },
      },
    },
  });
  if (!exam || exam.ownerId !== user.id) notFound();

  const completed = exam.attempts.filter((a) => a.status === "submitted");
  const avg =
    completed.length && completed[0].maxScore
      ? (
          (completed.reduce((s, a) => s + (a.score ?? 0), 0) /
            (completed[0].maxScore ?? 1) /
            completed.length) *
          100
        ).toFixed(1)
      : "—";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link
        href={`/dashboard/exams/${id}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
          Results
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">{exam.title}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Attempts" value={String(exam.attempts.length)} />
        <Stat label="Completed" value={String(completed.length)} />
        <Stat label="Avg score" value={avg === "—" ? "—" : `${avg}%`} />
      </div>

      {exam.attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center text-[var(--fg-muted)]">
          No attempts yet.
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/40 dark:bg-white/5 text-left text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {exam.attempts.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-[var(--border)] text-[var(--fg)]"
                >
                  <td className="px-4 py-3 font-medium">{a.studentName}</td>
                  <td className="px-4 py-3">
                    {a.status === "submitted" ? (
                      <Badge variant="success">Submitted</Badge>
                    ) : a.status === "in_progress" ? (
                      <Badge variant="info">In progress</Badge>
                    ) : a.status === "paused" ? (
                      <Badge variant="warning">Paused</Badge>
                    ) : a.status === "terminated" ? (
                      <Badge variant="danger">Terminated</Badge>
                    ) : (
                      <Badge variant="default">{a.status}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {a.score !== null && a.maxScore !== null
                      ? `${a.score}/${a.maxScore}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a._count.violations > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[#a83b4f] font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {a._count.violations}
                      </span>
                    ) : (
                      <span className="text-[var(--fg-subtle)]">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--fg-muted)]">
                    {formatDateTime(a.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/exams/attempt/${a.id}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--fg)]">{value}</div>
    </div>
  );
}
