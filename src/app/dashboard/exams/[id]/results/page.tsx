import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Download } from "lucide-react";
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
      questions: { orderBy: { order: "asc" } },
      attempts: {
        orderBy: { startedAt: "desc" },
        include: { _count: { select: { violations: true, answers: true } } },
      },
    },
  });
  if (!exam || exam.ownerId !== user.id) notFound();

  const completed = exam.attempts.filter((a) => a.status === "submitted");
  // With question pools, maxScore varies per attempt — average each
  // attempt's own percentage instead of assuming a shared denominator.
  const percentages = completed
    .filter((a) => a.score !== null && a.maxScore !== null && a.maxScore > 0)
    .map((a) => (a.score! / a.maxScore!) * 100);
  const avg = percentages.length
    ? (percentages.reduce((s, p) => s + p, 0) / percentages.length).toFixed(1)
    : "—";

  // ---- item analysis ----
  // How each question performed across finished attempts: how often it was
  // served (pools mean not everyone gets every question), % answered correct,
  // and median-ish time spent. Highlights the questions the class missed.
  const finished = exam.attempts.filter(
    (a) => a.status === "submitted" || a.status === "terminated"
  );
  const answers = finished.length
    ? await prisma.answer.findMany({
        where: { attemptId: { in: finished.map((a) => a.id) } },
        select: {
          questionId: true,
          isCorrect: true,
          pointsEarned: true,
          timeSpentMs: true,
        },
      })
    : [];
  const servedCount = new Map<string, number>();
  for (const a of finished) {
    try {
      for (const qid of JSON.parse(a.questionOrder) as string[]) {
        servedCount.set(qid, (servedCount.get(qid) ?? 0) + 1);
      }
    } catch {
      // ignore malformed orders
    }
  }
  const itemStats = exam.questions
    .filter((q) => q.type !== "passage")
    .map((q, i) => {
      const qa = answers.filter((x) => x.questionId === q.id);
      const graded = qa.filter((x) => x.isCorrect !== null);
      const correct = graded.filter((x) => x.isCorrect === true).length;
      const timed = qa.filter((x) => x.timeSpentMs > 0);
      const avgMs = timed.length
        ? timed.reduce((s, x) => s + x.timeSpentMs, 0) / timed.length
        : null;
      return {
        id: q.id,
        number: i + 1,
        prompt: q.prompt,
        type: q.type,
        served: servedCount.get(q.id) ?? 0,
        answered: qa.length,
        graded: graded.length,
        pctCorrect: graded.length
          ? Math.round((correct / graded.length) * 100)
          : null,
        avgMs,
      };
    });
  const showItemAnalysis = finished.length > 0 && itemStats.length > 0;
  const fmtAvg = (ms: number) =>
    ms >= 60_000
      ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
      : `${Math.round(ms / 1000)}s`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link
        href={`/dashboard/exams/${id}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam
      </Link>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
            Results
          </h1>
          <p className="text-[var(--fg-muted)] mt-1">{exam.title}</p>
        </div>
        {exam.attempts.length > 0 && (
          <Button asChild variant="outline">
            <a href={`/api/exams/${id}/export`} download>
              <Download className="h-4 w-4" /> Download CSV
            </a>
          </Button>
        )}
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
                      <span className="inline-flex items-center gap-1 text-[#dc2626] font-medium">
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

      {showItemAnalysis && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            Question performance
          </h2>
          <p className="text-sm text-[var(--fg-muted)] mt-1 mb-4">
            Across {finished.length} finished attempt
            {finished.length === 1 ? "" : "s"}. Low percentages point at
            questions the class struggled with — or questions worth a second
            look.
          </p>
          <div className="glass rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-white/40 dark:bg-white/5 text-left text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3 w-full">Question</th>
                  <th className="px-4 py-3 whitespace-nowrap">Served</th>
                  <th className="px-4 py-3 whitespace-nowrap">Answered</th>
                  <th className="px-4 py-3 whitespace-nowrap">Correct</th>
                  <th className="px-4 py-3 whitespace-nowrap">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {itemStats.map((q) => (
                  <tr
                    key={q.id}
                    className="border-t border-[var(--border)] text-[var(--fg)]"
                  >
                    <td className="px-4 py-3 text-[var(--fg-subtle)]">
                      {q.number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="line-clamp-1">{q.prompt || "—"}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{q.served}</td>
                    <td className="px-4 py-3 font-mono">{q.answered}</td>
                    <td className="px-4 py-3">
                      {q.pctCorrect === null ? (
                        <span className="text-[var(--fg-subtle)]">
                          manual
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            q.pctCorrect < 50
                              ? "bg-[#fee2e2] text-[#dc2626] dark:bg-[#7f1d1d] dark:text-[#fca5a5]"
                              : q.pctCorrect < 75
                              ? "bg-[#fef3c7] text-[#92400e] dark:bg-[#451a03] dark:text-[#fbbf24]"
                              : "bg-[#d1fae5] text-[#047857] dark:bg-[#064e3b] dark:text-[#10b981]"
                          }`}
                        >
                          {q.pctCorrect}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--fg-muted)] whitespace-nowrap">
                      {q.avgMs ? fmtAvg(q.avgMs) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
