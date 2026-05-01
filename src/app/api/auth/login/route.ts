import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

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
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

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
