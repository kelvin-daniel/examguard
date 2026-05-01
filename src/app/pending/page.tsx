import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, ShieldCheck, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ "just-registered"?: string }>;
}) {
  const params = await searchParams;
  const justRegistered = params["just-registered"] === "1";
  const user = await getCurrentUser();

  // Active users don't belong here — bounce them to dashboard.
  if (user && user.status === "active") redirect("/dashboard");
  // Rejected users get a different message.
  // No-session visitors get sent back to login.
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="aurora pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />

      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
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

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {user.status === "rejected" ? (
            <RejectedView />
          ) : (
            <PendingView name={user.name} justRegistered={justRegistered} />
          )}
          <form action="/api/auth/logout" method="POST" className="mt-8">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

function PendingView({
  name,
  justRegistered,
}: {
  name: string;
  justRegistered: boolean;
}) {
  return (
    <>
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[#ffd97a] to-[#ffc4a3] flex items-center justify-center mb-6 shadow-[0_8px_24px_-4px_rgba(255,196,123,0.4)]">
        <Clock className="h-8 w-8 text-[#8a6420]" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
        {justRegistered ? "Account created" : "Waiting for approval"}
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">
        Hi {name.split(" ")[0]} — your account is awaiting your school admin&apos;s
        approval. You&apos;ll be able to sign in and create exams as soon as
        they&apos;ve cleared it.
      </p>
      <div className="mt-8 glass rounded-2xl p-5 text-sm text-[var(--fg-muted)] text-left space-y-2">
        <p>
          <strong className="text-[var(--fg)]">What happens next?</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your admin sees your request in their admin dashboard.</li>
          <li>Once they approve, refresh this page or sign in again.</li>
          <li>Students don&apos;t need accounts — they join with a 6-character code.</li>
        </ul>
      </div>
    </>
  );
}

function RejectedView() {
  return (
    <>
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[#ff8a9d] to-[#e85a72] flex items-center justify-center mb-6">
        <Clock className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
        Account not approved
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">
        Your account wasn&apos;t approved for ExamGuard access. If you think this
        is a mistake, please contact your school&apos;s ExamGuard admin.
      </p>
    </>
  );
}
