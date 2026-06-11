import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "active") redirect("/pending");

  // Surface pending-approval count to admins only
  const pendingCount =
    user.role === "admin"
      ? await prisma.user.count({ where: { status: "pending" } })
      : 0;

  // Students paused mid-exam waiting on this teacher's decision. Surfaced on
  // every dashboard page — a frozen student shouldn't depend on the teacher
  // happening to have the monitor tab open.
  const pendingReviews = await prisma.violation.findMany({
    where: { pending: true, attempt: { exam: { ownerId: user.id } } },
    select: {
      attempt: {
        select: {
          studentName: true,
          exam: { select: { id: true, title: true } },
        },
      },
    },
  });
  const reviewExam = pendingReviews[0]?.attempt.exam;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <header className="sticky top-0 z-40">
        <div className="mx-3 mt-3 sm:mx-6 sm:mt-4">
          <div className="glass mx-auto max-w-6xl rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold tracking-tight text-[var(--fg)]">
                ExamGuard
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {user.role === "admin" && pendingCount > 0 && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#dc2626] dark:bg-[#7f1d1d] dark:text-[#fca5a5] hover:bg-[#fecaca]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626] live-dot" />
                  {pendingCount} pending
                </Link>
              )}
              <ThemeToggle />
              <UserMenu
                name={user.name}
                email={user.email}
                role={user.role}
              />
            </div>
          </div>
        </div>
      </header>

      {pendingReviews.length > 0 && reviewExam && (
        <div className="mx-3 mt-3 sm:mx-6">
          <Link
            href={`/dashboard/exams/${reviewExam.id}/monitor`}
            className="glass mx-auto max-w-6xl rounded-2xl px-4 sm:px-6 py-3 flex items-center gap-3 border-2 border-[#fca5a5]/60 hover:shadow-[0_12px_32px_-8px_rgba(220,38,38,0.25)] transition-shadow"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-semibold text-[var(--fg)]">
                {pendingReviews.length} student
                {pendingReviews.length === 1 ? " is" : "s are"} paused
              </span>{" "}
              <span className="text-[var(--fg-muted)] hidden sm:inline">
                waiting for your review on “{reviewExam.title}”
                {new Set(pendingReviews.map((p) => p.attempt.exam.id)).size > 1
                  ? " and other exams"
                  : ""}
              </span>
            </div>
            <span className="text-sm font-medium text-[#dc2626] flex-shrink-0">
              Review now →
            </span>
          </Link>
        </div>
      )}

      <main>{children}</main>
    </div>
  );
}
