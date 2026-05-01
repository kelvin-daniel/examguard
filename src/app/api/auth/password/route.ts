import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );

  // Re-fetch the password hash (auth.user doesn't include it for safety)
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, password: true },
  });
  if (!full)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const match = await verifyPassword(parsed.data.currentPassword, full.password);
  if (!match)
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(parsed.data.newPassword) },
  });
  // Invalidate all other sessions for safety
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await destroySession();

  return NextResponse.json({ ok: true });
}
