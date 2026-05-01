"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Check } from "lucide-react";

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (next !== confirm) {
      setErr("New password and confirmation don't match.");
      return;
    }
    if (next.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Couldn't change password.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-[#d1fae5] dark:bg-[#064e3b] border border-[#10b981] p-4 text-sm text-[#047857] dark:text-[#10b981] flex items-center gap-2">
        <Check className="h-4 w-4" />
        Password updated. Redirecting you to sign in…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current">Current password</Label>
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="next">New password</Label>
        <Input
          id="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <p className="text-xs text-[var(--fg-muted)]">
          At least 8 characters.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {err && (
        <p className="text-sm text-[#dc2626] bg-[#fee2e2] dark:bg-[#7f1d1d] dark:text-[#fca5a5] px-3 py-2 rounded-lg">
          {err}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
