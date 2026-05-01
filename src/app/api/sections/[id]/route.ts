import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

async function authorize(id: string, userId: string) {
  const s = await prisma.section.findUnique({
    where: { id },
    include: { exam: true },
  });
  if (!s || s.exam.ownerId !== userId) return null;
  return s;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await authorize(id, user.id);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const updated = await prisma.section.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ section: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await authorize(id, user.id);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
