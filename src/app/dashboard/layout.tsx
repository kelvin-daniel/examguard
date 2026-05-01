import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <header className="sticky top-0 z-40">
        <div className="mx-3 mt-3 sm:mx-6 sm:mt-4">
          <div className="glass mx-auto max-w-6xl rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff9a7a] to-[#ff7a59] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,122,89,0.4)]">
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
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ffe4e8] text-[#a83b4f] dark:bg-[#3a1f24] dark:text-[#ffa8b8] hover:bg-[#ffd0d8]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e85a72] live-dot" />
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
      <main>{children}</main>
    </div>
  );
}
