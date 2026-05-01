import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "promote", "demote"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const admin = await requireAdmin().catch(() => null);
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === admin.id)
    return NextResponse.json(
      { error: "You can't modify your own admin account here." },
      { status: 400 }
    );

  let data: Partial<{
    status: string;
    role: string;
    approvedAt: Date | null;
    approvedBy: string | null;
  }> = {};

  switch (parsed.data.action) {
    case "approve":
      data = {
        status: "active",
        approvedAt: new Date(),
        approvedBy: admin.email,
      };
      break;
    case "reject":
      data = { status: "rejected" };
      // Drop active sessions so a rejected user is signed out immediately
      await prisma.session.deleteMany({ where: { userId: id } });
      break;
    case "promote":
      data = { role: "admin" };
      break;
    case "demote":
      data = { role: "teacher" };
      break;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, status: true, role: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const admin = await requireAdmin().catch(() => null);
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (admin.id === id)
    return NextResponse.json(
      { error: "You can't delete yourself." },
      { status: 400 }
    );
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
