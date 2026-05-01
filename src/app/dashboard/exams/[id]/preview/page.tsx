import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ExamPreviewClient } from "@/components/exam-preview-client";

export default async function ExamPreviewPage({
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
      sections: { orderBy: { order: "asc" } },
    },
  });
  if (!exam || exam.ownerId !== user.id) notFound();

  const sections = exam.sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    order: s.order,
  }));

  const questions = exam.questions.map((q) => ({
    id: q.id,
    sectionId: q.sectionId,
    type: q.type,
    prompt: q.prompt,
    description: q.description,
    points: q.points,
    required: q.required,
    options: q.options ? (JSON.parse(q.options) as string[]) : null,
    config: q.config ? (JSON.parse(q.config) as Record<string, unknown>) : null,
    imageUrl: q.imageUrl,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="aurora pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/dashboard/exams/${id}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to editor
          </Link>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[var(--fg-muted)] bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-[var(--border-strong)] rounded-full px-3 py-1">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </div>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="text-[var(--fg-muted)] mt-1">{exam.description}</p>
          )}
          <div className="mt-2 text-sm text-[var(--fg-muted)]">
            {questions.length} question{questions.length === 1 ? "" : "s"} ·{" "}
            {exam.durationMinutes} min
          </div>
        </div>
        <ExamPreviewClient sections={sections} questions={questions} />
      </div>
    </div>
  );
}
