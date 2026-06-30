import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AnswerGrader } from "@/components/answer-grader";
import { parseCollectFields } from "@/lib/collect-fields";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      exam: true,
      answers: { include: { question: true } },
      violations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!attempt || attempt.exam.ownerId !== user.id) notFound();

  const collectFields = parseCollectFields(attempt.exam.collectFields);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link
        href={`/dashboard/exams/${attempt.examId}/monitor`}
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to monitor
      </Link>

      <div className="glass rounded-3xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">
              {attempt.studentName}
            </h1>
            <p className="text-sm text-[var(--fg-muted)] mt-1">
              {attempt.exam.title}
            </p>
          </div>
          <div className="text-right">
            {attempt.score !== null && attempt.maxScore !== null ? (
              <div className="text-4xl font-semibold tracking-tight bg-gradient-to-br from-[#2563eb] to-[#fca5a5] bg-clip-text text-transparent">
                {attempt.score}
                <span className="text-[var(--fg-subtle)] text-xl">
                  /{attempt.maxScore}
                </span>
              </div>
            ) : attempt.status === "paused" ? (
              <Badge variant="warning">Paused</Badge>
            ) : attempt.status === "terminated" ? (
              <Badge variant="danger">Terminated</Badge>
            ) : (
              <Badge variant="info">In progress</Badge>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--fg-muted)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Started{" "}
            {formatDateTime(attempt.startedAt)}
          </span>
          {attempt.submittedAt && (
            <span>· {attempt.status === "terminated" ? "Ended" : "Submitted"}{" "}{formatDateTime(attempt.submittedAt)}</span>
          )}
          <span>· {attempt.violations.length} violations</span>
        </div>

        {(() => {
          const collected = attempt.studentInfo
            ? (JSON.parse(attempt.studentInfo) as Record<string, string>)
            : null;
          const fields = collectFields;
          if (!collected || fields.length === 0) return null;
          const rows = fields
            .filter((f) => collected[f.key])
            .map((f) => ({ label: f.label, value: collected[f.key] }));
          if (rows.length === 0) return null;
          return (
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-x-6 gap-y-2">
              {rows.map((r) => (
                <div key={r.label}>
                  <div className="text-[11px] uppercase tracking-wide text-[var(--fg-subtle)]">
                    {r.label}
                  </div>
                  <div className="text-sm text-[var(--fg)]">{r.value}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {attempt.violations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-[var(--fg)]">
            <AlertTriangle className="h-5 w-5 text-[#2563eb]" />
            Violation log
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {attempt.violations.map((v) => (
              <div
                key={v.id}
                className="glass rounded-2xl overflow-hidden"
              >
                {v.evidence ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.evidence}
                    alt="Evidence screenshot"
                    className="w-full aspect-video object-cover bg-[var(--bg-muted)]"
                  />
                ) : (
                  <div className="w-full aspect-video bg-[var(--bg-muted)] flex items-center justify-center text-xs text-[var(--fg-subtle)]">
                    No screenshot
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm capitalize text-[var(--fg)]">
                      {v.type.replace(/_/g, " ")}
                    </span>
                    <Badge
                      variant={
                        v.severity === "high"
                          ? "danger"
                          : v.severity === "low"
                          ? "default"
                          : "warning"
                      }
                    >
                      {v.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] mt-1">
                    {formatDateTime(v.createdAt)}
                  </div>
                  {v.resolution && (
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                      {v.resolution === "allowed" ? "Allowed" : "Terminated"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3 text-[var(--fg)]">Answers</h2>
        <div className="space-y-3">
          {attempt.answers.map((a, i) => {
            const q = a.question;
            const options = q.options
              ? (JSON.parse(q.options) as string[])
              : null;
            const correctIdx = q.correct ? JSON.parse(q.correct) : null;
            const studentIdx = a.response;
            return (
              <div
                key={a.id}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-sm font-medium text-[var(--fg)]">
                    <span className="text-[var(--fg-subtle)] mr-1">Q{i + 1}.</span>
                    {q.prompt}
                  </div>
                  <AnswerGrader
                    answerId={a.id}
                    questionType={q.type}
                    questionPoints={q.points}
                    initialPointsEarned={a.pointsEarned}
                    initialIsCorrect={a.isCorrect}
                  />
                </div>
                <div className="text-sm text-[var(--fg-muted)]">
                  {q.type === "mcq" || q.type === "truefalse" ? (
                    <>
                      Answer:{" "}
                      <strong className="text-[var(--fg)]">
                        {options?.[Number(studentIdx)] ?? "—"}
                      </strong>
                      {correctIdx !== null && (
                        <span className="ml-2 text-[#047857]">
                          (Correct: {options?.[Number(correctIdx)]})
                        </span>
                      )}
                    </>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--fg)]">
                      {a.response || (
                        <em className="text-[var(--fg-subtle)]">(empty)</em>
                      )}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
