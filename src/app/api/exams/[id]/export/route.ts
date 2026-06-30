import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseCollectFields } from "@/lib/collect-fields";

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: (string | number | null | undefined)[]) {
  return values.map(csvEscape).join(",");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return new Response("Unauthorized", { status: 401 });

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      attempts: {
        orderBy: { startedAt: "desc" },
        include: {
          answers: { include: { question: true } },
          _count: { select: { violations: true } },
        },
      },
    },
  });
  if (!exam || exam.ownerId !== user.id)
    return new Response("Not found", { status: 404 });

  const lines: string[] = [];

  // Passages are reading material with no answers — skip their columns
  const gradableQuestions = exam.questions.filter(
    (q) => q.type !== "passage"
  );

  // Teacher-configured sign-in fields become their own columns.
  const collectFields = parseCollectFields(exam.collectFields);

  // Header — fixed columns + collected-info columns + one column per question
  const fixedCols = [
    "Student",
    "Email",
    ...collectFields.map((f) => f.label),
    "Status",
    "Score",
    "Max",
    "Percent",
    "Started",
    "Submitted",
    "Violations",
  ];
  const qHeaders = gradableQuestions.map(
    (q, i) => `Q${i + 1}: ${q.prompt.slice(0, 60)}`
  );
  lines.push(row([...fixedCols, ...qHeaders]));

  for (const a of exam.attempts) {
    const pct =
      a.score !== null && a.maxScore !== null && a.maxScore > 0
        ? Math.round((a.score / a.maxScore) * 100)
        : "";
    const collected = a.studentInfo
      ? (JSON.parse(a.studentInfo) as Record<string, string>)
      : {};
    const fixed: (string | number | null)[] = [
      a.studentName,
      a.studentEmail ?? "",
      ...collectFields.map((f) => collected[f.key] ?? ""),
      a.status,
      a.score ?? "",
      a.maxScore ?? "",
      pct === "" ? "" : `${pct}%`,
      a.startedAt.toISOString(),
      a.submittedAt?.toISOString() ?? "",
      a._count.violations,
    ];
    const answersByQuestion = new Map(
      a.answers.map((ans) => [ans.questionId, ans])
    );
    const qCols = gradableQuestions.map((q) => {
      const ans = answersByQuestion.get(q.id);
      if (!ans) return "";
      const options = q.options ? (JSON.parse(q.options) as string[]) : null;
      // For MCQ-style answers, render the option label rather than the index
      if (q.type === "mcq" || q.type === "truefalse" || q.type === "dropdown") {
        const idx = Number(ans.response);
        return options?.[idx] ?? ans.response;
      }
      if (q.type === "checkbox") {
        return ans.response
          .split(",")
          .map((i) => options?.[Number(i.trim())] ?? "")
          .filter(Boolean)
          .join("; ");
      }
      return ans.response;
    });
    lines.push(row([...fixed, ...qCols]));
  }

  // BOM for Excel compatibility
  const csv = "﻿" + lines.join("\n");
  const safeTitle = exam.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}_results.csv"`,
    },
  });
}
