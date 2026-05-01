import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  text: z.string().min(1).max(50000),
});

/**
 * Parses a free-form block of text into question stubs.
 *
 * Supported shapes (one question per blank-line-separated block):
 *
 *   What is 2+2?
 *   A) 3
 *   B) 4   <-- prefix with * or end with * to mark correct: "* B) 4" or "B) 4 *"
 *   C) 5
 *
 *   Photosynthesis is the process by which...?    <-- single line = short answer
 *
 *   T/F: The Earth is round.    <-- prefix "T/F:" or "True/False:" = truefalse
 *
 *   Essay: Discuss the causes of WWI.    <-- prefix "Essay:" = essay
 */
function parseBulk(text: string) {
  const blocks = text
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  type Stub = {
    type:
      | "mcq"
      | "truefalse"
      | "short"
      | "essay"
      | "fillblank";
    prompt: string;
    options?: string[];
    correct?: string;
    points: number;
  };

  const stubs: Stub[] = [];

  for (const block of blocks) {
    const lines = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const first = lines[0];
    const rest = lines.slice(1);

    // Type prefixes on the first line
    const essayMatch = first.match(/^(?:essay|paragraph)\s*:\s*(.+)$/i);
    if (essayMatch) {
      stubs.push({ type: "essay", prompt: essayMatch[1], points: 1 });
      continue;
    }
    const tfMatch = first.match(/^(?:t\s*\/\s*f|true\s*\/\s*false)\s*:\s*(.+)$/i);
    if (tfMatch) {
      stubs.push({
        type: "truefalse",
        prompt: tfMatch[1],
        options: ["True", "False"],
        correct: "0",
        points: 1,
      });
      continue;
    }

    // Look for option lines like "A) ..." / "1. ..." / "- ..."
    const optionRe = /^(?:\*\s*)?([A-Za-z]|\d+)[\.\)]\s*(.+)$/;
    const optionLines: { text: string; correct: boolean }[] = [];
    let foundOptions = false;
    for (const l of rest) {
      const m = l.match(optionRe);
      if (m) {
        foundOptions = true;
        let optText = m[2].trim();
        let correct = false;
        if (l.startsWith("*")) {
          correct = true;
        }
        if (optText.endsWith("*")) {
          correct = true;
          optText = optText.slice(0, -1).trim();
        }
        optionLines.push({ text: optText, correct });
      }
    }

    if (foundOptions && optionLines.length >= 2) {
      const correctIdx = optionLines.findIndex((o) => o.correct);
      stubs.push({
        type: "mcq",
        prompt: first,
        options: optionLines.map((o) => o.text),
        correct: String(correctIdx >= 0 ? correctIdx : 0),
        points: 1,
      });
    } else {
      // Single-line questions become short answer
      stubs.push({
        type: "short",
        prompt: lines.join(" "),
        points: 1,
      });
    }
  }

  return stubs;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const stubs = parseBulk(parsed.data.text);
  if (stubs.length === 0)
    return NextResponse.json(
      { error: "Couldn't parse any questions from that text." },
      { status: 400 }
    );

  const startOrder = await prisma.question.count({ where: { examId: id } });
  const created = await prisma.$transaction(
    stubs.map((s, i) =>
      prisma.question.create({
        data: {
          examId: id,
          order: startOrder + i,
          type: s.type,
          prompt: s.prompt,
          points: s.points,
          options: s.options ? JSON.stringify(s.options) : null,
          correct: s.correct !== undefined ? JSON.stringify(s.correct) : null,
        },
      })
    )
  );

  return NextResponse.json({ created: created.length, questions: created });
}
