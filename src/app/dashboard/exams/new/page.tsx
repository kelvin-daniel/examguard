"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewExamPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        durationMinutes: duration,
      }),
    });
    if (!res.ok) {
      setErr("Could not create exam");
      setLoading(false);
      return;
    }
    const { exam } = await res.json();
    router.push(`/dashboard/exams/${exam.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a new exam</CardTitle>
          <CardDescription>
            Start with the basics — you can add questions and tune settings on the
            next screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Exam title</Label>
              <Input
                id="title"
                required
                maxLength={200}
                placeholder="e.g. Chapter 4 Quiz — Algebra"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                maxLength={1000}
                placeholder="Instructions, context, or notes for students."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dur">Duration (minutes)</Label>
              <Input
                id="dur"
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            {err && (
              <p className="text-sm text-[#a83b4f] bg-[#ffe4e8] dark:bg-[#3a1f24] dark:text-[#ffa8b8] px-3 py-2 rounded-lg">
                {err}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button asChild variant="ghost">
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Creating…" : "Create exam"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
