import Link from "next/link";
import { ArrowLeft, FileQuestion, Home, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="aurora pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />

      <header className="p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-[var(--fg)]">
            ExamGuard
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="px-4 py-12 sm:py-20">
        <div className="max-w-xl mx-auto text-center">
          <div className="relative mx-auto h-24 w-24 mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] blur-2xl opacity-30" />
            <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(37,99,235,0.45)]">
              <FileQuestion className="h-12 w-12 text-white" strokeWidth={2} />
            </div>
          </div>

          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)] mb-2">
            404
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--fg)]">
            Page not found
          </h1>
          <p className="mt-4 text-lg text-[var(--fg-muted)] max-w-md mx-auto">
            We couldn&apos;t find what you were looking for. The link might be old,
            or the page may have moved.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="primary" size="lg">
              <Link href="/">
                <Home className="h-4 w-4" /> Back to home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/join">
                Join an exam <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
