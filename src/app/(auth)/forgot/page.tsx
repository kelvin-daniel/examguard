"use client";

import Link from "next/link";
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
import { Mail } from "lucide-react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-[#a4e3cd] to-[#7dd3b8] flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-center">Check your inbox</CardTitle>
          <CardDescription className="text-center">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a
            link to reset your password. The link expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm">
          <Link
            href="/login"
            className="text-[var(--primary)] hover:underline font-medium"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email you registered with and we&apos;ll send a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
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
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-sm text-center text-[var(--fg-muted)]">
            Remembered it?{" "}
            <Link
              href="/login"
              className="text-[var(--primary)] hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
