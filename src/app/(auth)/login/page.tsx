"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Login failed");
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    router.push(data.pending ? "/pending" : "/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to manage your exams.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot"
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-center text-[var(--fg-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[var(--primary)] hover:underline font-medium"
            >
              Create one
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
