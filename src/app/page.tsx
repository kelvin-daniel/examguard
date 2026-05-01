import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeroIllustration } from "@/components/hero-illustration";
import {
  ShieldCheck,
  Camera,
  Eye,
  Smartphone,
  Zap,
  LockKeyhole,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Continuous aurora gradient that flows behind every section */}
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.05) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Floating orbs that span page-height for that "flow" feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 left-[-6rem] top-[18rem] h-72 w-72 rounded-full opacity-50 blur-3xl float-slow"
        style={{ background: "radial-gradient(circle, #bfdbfe, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 right-[-5rem] top-[60rem] h-80 w-80 rounded-full opacity-40 blur-3xl float-med"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 left-1/2 top-[100rem] h-96 w-96 -translate-x-1/2 rounded-full opacity-40 blur-3xl float-fast"
        style={{ background: "radial-gradient(circle, #10b981, transparent 70%)" }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-50">
        <div className="mx-3 mt-3 sm:mx-6 sm:mt-4">
          <div className="glass mx-auto max-w-6xl rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold tracking-tight text-[var(--fg)]">
                ExamGuard
              </span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/join">
                  Join exam <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-24 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge variant="info" className="mb-5">
                <Sparkles className="h-3 w-3" />
                Built mobile-first
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[var(--fg)] leading-[1.05]">
                Cheat-proof exams{" "}
                <span className="bg-gradient-to-r from-[#2563eb] via-[#0ea5e9] to-[#a78bfa] bg-clip-text text-transparent">
                  that feel good
                </span>{" "}
                to take.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-[var(--fg-muted)] max-w-xl lg:max-w-none mx-auto lg:mx-0">
                A premium testing platform with airtight behavioral anti-cheat,
                automatic evidence capture, and an interface that feels native on
                every device — phone, tablet, or laptop.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button asChild variant="primary" size="xl">
                  <Link href="/register">
                    Start free for teachers <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="glass" size="xl">
                  <Link href="/join">I have an exam code</Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-[var(--fg-muted)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                  No install required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                  Works on any device
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                  Results in seconds
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -m-4 rounded-[2rem] bg-gradient-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-transparent blur-2xl" />
              <HeroIllustration className="relative w-full h-auto drop-shadow-[0_24px_48px_rgba(15,23,42,0.10)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Features — overlapping the hero with a soft gradient bridge */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 sm:pb-28">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--fg)]">
              Everything you need to run a secure exam.
            </h2>
            <p className="mt-4 text-[var(--fg-muted)]">
              No lockdown browser, no downloads — just a link and a code.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="group glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(15,23,42,0.10)]"
                style={{ transitionDelay: `${i * 20}ms` }}
              >
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.08),0_1px_0_0_rgba(255,255,255,0.5)_inset]"
                  style={{ background: f.bg }}
                >
                  <f.icon className="h-5 w-5" style={{ color: f.fg }} />
                </div>
                <h3 className="font-semibold text-[var(--fg)]">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--fg-muted)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — flowing into next section via gradient, not borders */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 sm:pb-28">
          <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-14 grain"
            style={{
              background:
                "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
              boxShadow:
                "0 1px 0 0 rgba(255,255,255,0.7) inset, 0 24px 64px -16px rgba(37,99,235,0.30)",
            }}
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/30 blur-2xl" />
            <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-[#a78bfa]/40 blur-2xl" />

            <div className="relative">
              <Badge className="mb-4" variant="warning">
                Setup in 2 minutes
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0f172a] max-w-2xl">
                From draft to deployed before the bell rings.
              </h2>
              <div className="mt-10 grid sm:grid-cols-3 gap-6">
                {[
                  {
                    n: "01",
                    t: "Create",
                    d: "Build an exam with MCQ, true/false, short answer, and essay questions.",
                    color: "#2563eb",
                  },
                  {
                    n: "02",
                    t: "Schedule",
                    d: "Set a start time, duration, and share a single 6-digit code.",
                    color: "#a78bfa",
                  },
                  {
                    n: "03",
                    t: "Monitor",
                    d: "Watch live violations and review screenshot evidence in real time.",
                    color: "#10b981",
                  },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="rounded-2xl bg-white/70 backdrop-blur-sm p-5 border border-white/60"
                  >
                    <div
                      className="font-mono text-sm font-semibold"
                      style={{ color: s.color }}
                    >
                      {s.n}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[#0f172a]">
                      {s.t}
                    </div>
                    <div className="mt-1 text-sm text-[#475569]">{s.d}</div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Button asChild variant="primary" size="lg">
                  <Link href="/register">
                    Create your first exam <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / proof — flows directly into footer */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 sm:pb-32">
          <div className="grid md:grid-cols-3 gap-5">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="glass rounded-2xl p-6 text-center"
              >
                <div className="text-4xl font-semibold tracking-tight text-[var(--fg)]">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-[var(--fg-muted)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 text-center text-sm text-[var(--fg-muted)]">
          ExamGuard · The honest testing platform · made with care
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: "Tab-switch detection",
    desc: "Every time a student leaves the exam window, the event is logged with a timestamp and screenshot.",
    icon: Eye,
    bg: "linear-gradient(135deg, #fbbf24, #bfdbfe)",
    fg: "#92400e",
  },
  {
    title: "Evidence on every flag",
    desc: "Suspicious actions automatically capture a screenshot of the exam view as proof.",
    icon: Camera,
    bg: "linear-gradient(135deg, #fca5a5, #2563eb)",
    fg: "#dc2626",
  },
  {
    title: "Full-screen lock",
    desc: "Exams run in enforced full-screen with copy, paste, and right-click disabled end-to-end.",
    icon: LockKeyhole,
    bg: "linear-gradient(135deg, #c4b5fd, #a78bfa)",
    fg: "#5b21b6",
  },
  {
    title: "Mobile-first",
    desc: "Designed from the ground up to feel native on phones and tablets — not a squished desktop page.",
    icon: Smartphone,
    bg: "linear-gradient(135deg, #34d399, #10b981)",
    fg: "#047857",
  },
  {
    title: "Randomized for every student",
    desc: "Question order and answer choices are shuffled per attempt so no two students see the same paper.",
    icon: Zap,
    bg: "linear-gradient(135deg, #fde68a, #fbbf24)",
    fg: "#92400e",
  },
  {
    title: "Server-side timing",
    desc: "Time limits are enforced by the server. Changing a device clock won't buy a single extra second.",
    icon: ShieldCheck,
    bg: "linear-gradient(135deg, #bfdbfe, #3b82f6)",
    fg: "#dc2626",
  },
];

const STATS = [
  { value: "0ms", label: "Cheating tolerance" },
  { value: "100%", label: "Evidence capture rate" },
  { value: "<2 min", label: "From signup to live exam" },
];
