"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import type { CollectField } from "@/lib/collect-fields";

type ExamInfo = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  questionCount: number;
  status: string;
  startAt: string | null;
  collectFields: CollectField[];
};

export function JoinForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [code, setCode] = useState((search.get("code") ?? "").toUpperCase());
  const [studentName, setStudentName] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fields = info?.collectFields ?? [];
  const missingRequired = fields.some(
    (f) => f.required && !(extra[f.key] ?? "").trim()
  );

  useEffect(() => {
    if (code.length === 6 && !info) lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function lookup() {
    setErr(null);
    const res = await fetch(`/api/join/lookup?code=${encodeURIComponent(code)}`);
    if (!res.ok) {
      setErr("Exam not found or not available.");
      setInfo(null);
      return;
    }
    const data = await res.json();
    setInfo(data.exam);
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, studentName, studentInfo: extra }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Could not start" }));
      setErr(error || "Could not start exam");
      setLoading(false);
      return;
    }
    const { attemptId } = await res.json();
    router.push(`/exam/${attemptId}`);
  }

  return (
    <>
      <Link
        href="/"
        className="flex items-center gap-2.5 mb-6 justify-center"
      >
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="font-semibold tracking-tight text-[var(--fg)]">
          ExamGuard
        </span>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Join an exam</CardTitle>
          <CardDescription>
            Enter the 6-character code from your teacher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={start} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Exam code</Label>
              <Input
                id="code"
                required
                value={code}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length !== 6) setInfo(null);
                }}
                maxLength={6}
                placeholder="AB3X9P"
                autoComplete="off"
                inputMode="text"
                autoCapitalize="characters"
                className="text-center text-2xl font-mono tracking-[0.4em] h-14 uppercase"
              />
            </div>

            {info && (
              <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-[var(--border)] p-4 animate-in">
                <div className="font-medium text-[var(--fg)]">{info.title}</div>
                {info.description && (
                  <p className="text-sm text-[var(--fg-muted)] mt-1">
                    {info.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[var(--fg-muted)]">
                  <span>{info.questionCount} questions</span>
                  <span>·</span>
                  <span>{info.durationMinutes} minutes</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Your full name</Label>
              <Input
                id="name"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="John Appleseed"
                autoComplete="name"
              />
            </div>

            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`f_${f.key}`}>
                  {f.label}
                  {f.required && <span className="text-[#dc2626] ml-0.5">*</span>}
                </Label>
                {f.type === "select" ? (
                  <select
                    id={`f_${f.key}`}
                    required={f.required}
                    value={extra[f.key] ?? ""}
                    onChange={(e) =>
                      setExtra((s) => ({ ...s, [f.key]: e.target.value }))
                    }
                    className="flex h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white dark:bg-white/5 px-4 text-base text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]"
                  >
                    <option value="">Choose…</option>
                    {(f.options ?? []).map((o, i) => (
                      <option key={i} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`f_${f.key}`}
                    type={
                      f.type === "email"
                        ? "email"
                        : f.type === "number"
                        ? "number"
                        : "text"
                    }
                    required={f.required}
                    value={extra[f.key] ?? ""}
                    onChange={(e) =>
                      setExtra((s) => ({ ...s, [f.key]: e.target.value }))
                    }
                    placeholder={f.label}
                    autoComplete="off"
                  />
                )}
              </div>
            ))}

            <div className="rounded-xl bg-[#fef3c7] dark:bg-[#451a03] border border-[#fbbf24] dark:border-[#92400e] p-3 text-xs text-[#92400e] dark:text-[#fbbf24] flex gap-2">
              <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                By continuing, you agree to take this exam in a locked,
                full-screen window. Leaving the window or attempting to copy
                content will be logged with a screenshot.
              </span>
            </div>

            {err && (
              <p className="text-sm text-[#dc2626] bg-[#fee2e2] dark:bg-[#7f1d1d] dark:text-[#fca5a5] px-3 py-2 rounded-lg">
                {err}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={
                loading || code.length !== 6 || !studentName || missingRequired
              }
            >
              {loading ? "Starting…" : "Start exam"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
