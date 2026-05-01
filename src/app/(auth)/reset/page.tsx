"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invalid link</CardTitle>
          <CardDescription>
            This reset link is missing its token.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/forgot"
            className="text-[var(--primary)] hover:underline font-medium"
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: pw }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Couldn't reset password.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-[#a4e3cd] to-[#7dd3b8] flex items-center justify-center mb-3">
            <Check className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-center">
            Password updated
          </CardTitle>
          <CardDescription className="text-center">
            Sending you to sign in…
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>At least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
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
            <p className="text-sm text-[#a83b4f] bg-[#ffe4e8] dark:bg-[#3a1f24] dark:text-[#ffa8b8] px-3 py-2 rounded-lg">
              {err}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
