import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );

  const reset = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });
  if (!reset)
    return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  if (reset.usedAt)
    return NextResponse.json(
      { error: "This link was already used." },
      { status: 400 }
    );
  if (reset.expiresAt < new Date())
    return NextResponse.json(
      { error: "This link has expired. Request a new one." },
      { status: 400 }
    );

  // Sequential writes: $transaction arrays can fail to commit on remote
  // libsql (Turso). Order matters — burn the token first so a partial
  // failure can never leave a reusable link pointing at a changed password.
  await prisma.passwordResetToken.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });
  await prisma.user.update({
    where: { id: reset.userId },
    data: { password: await hashPassword(parsed.data.newPassword) },
  });
  // Invalidate any remaining live sessions for safety
  await prisma.session.deleteMany({ where: { userId: reset.userId } });

  return NextResponse.json({ ok: true });
}
