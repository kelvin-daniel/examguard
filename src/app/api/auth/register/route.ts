import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, isAdminEmail } from "@/lib/auth";
import { sendPendingApprovalToAdmins } from "@/lib/email";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // Registration notifies every admin by email, so cap sign-ups per host.
  const limited = rateLimit(`register:${await clientIp()}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!limited.ok) {
    return tooManyRequests(
      limited.retryAfter,
      "Too many sign-ups from this device. Please try again later."
    );
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  // First account ever, OR email is in ADMIN_EMAILS → auto-promote to active admin
  const userCount = await prisma.user.count();
  const bootstrap = userCount === 0 || isAdminEmail(email);

  await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role: bootstrap ? "admin" : "teacher",
      status: bootstrap ? "active" : "pending",
      approvedAt: bootstrap ? new Date() : null,
      approvedBy: bootstrap ? "system" : null,
    },
  });

  // Notify admins (fire-and-forget — don't block the response on email)
  if (!bootstrap) {
    const admins = await prisma.user.findMany({
      where: { role: "admin", status: "active" },
      select: { email: true },
    });
    void sendPendingApprovalToAdmins(
      admins.map((a) => a.email),
      { name, email }
    );
  }

  return NextResponse.json({
    ok: true,
    pending: !bootstrap,
  });
}
