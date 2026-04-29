import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MonitorClient } from "@/components/monitor-client";
import { ArrowLeft } from "lucide-react";

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link
        href={`/dashboard/exams/${id}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
          Live monitor
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">{exam.title}</p>
      </div>
      <MonitorClient examId={id} />
    </div>
  );
}
