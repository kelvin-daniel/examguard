import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="aurora pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />

      <header className="p-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff9a7a] to-[#ff7a59] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,122,89,0.4)]">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-[var(--fg)]">
            ExamGuard
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href={user.status === "active" ? "/dashboard" : "/pending"}
          className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
          Account settings
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Signed in as {user.email}
        </p>

        <div className="mt-8 glass rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-[var(--fg)] mb-1">
            Change password
          </h2>
          <p className="text-sm text-[var(--fg-muted)] mb-6">
            You&apos;ll be signed out of all devices and need to log in again.
          </p>
          <ChangePasswordForm />
        </div>
      </main>
    </div>
  );
}
