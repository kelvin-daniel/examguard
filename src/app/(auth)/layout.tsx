import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
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
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
