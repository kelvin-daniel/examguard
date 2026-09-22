import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import {
  clientIp,
  rateLimit,
  resetRateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";

const schema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // Throttle password guessing. Keyed on IP + email so one attacker can't
  // lock out a whole school by hammering a shared address, and a single
  // account can't be brute-forced from one host.
  const key = `login:${await clientIp()}:${parsed.data.email}`;
  const limited = rateLimit(key, { limit: 8, windowMs: 10 * 60_000 });
  if (!limited.ok) {
    return tooManyRequests(
      limited.retryAfter,
      "Too many sign-in attempts. Please wait a few minutes and try again."
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }
  // Successful sign-in clears the counter so a forgetful teacher who gets it
  // right on the 8th try isn't locked out next time.
  resetRateLimit(key);

  if (user.status === "rejected") {
    return NextResponse.json(
      {
        error:
          "Your account was not approved. Contact your school admin if this is a mistake.",
      },
      { status: 403 }
    );
  }

  // Create session even for pending users so the pending-approval page can identify them.
  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    pending: user.status === "pending",
  });
}
