import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetLink } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
});

const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  // Always succeed to avoid leaking which emails exist (anti-enumeration)
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  // Each request sends a real email, so an unthrottled endpoint both burns
  // the mail quota and lets someone flood a victim's inbox. Answer with the
  // same ok:true as every other path so this doesn't become an oracle.
  const limited = rateLimit(`forgot:${await clientIp()}`, {
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: true });
  }
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user && user.status !== "rejected") {
    const token = nanoid(48);
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
    void sendPasswordResetLink(
      { name: user.name, email: user.email },
      token
    );
  }

  return NextResponse.json({ ok: true });
}
