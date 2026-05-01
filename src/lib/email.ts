/**
 * Lightweight email layer.
 *
 * In dev (no RESEND_API_KEY) we just log the email to stdout — no external
 * dependency required. In production set RESEND_API_KEY and EMAIL_FROM, and
 * mail goes out via Resend (3,000/mo free tier as of 2026).
 *
 * Resend lets you send from `onboarding@resend.dev` without verifying a
 * domain — handy for early beta. Verify your school domain later for
 * better deliverability.
 */

import { Resend } from "resend";

type Email = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

let _client: Resend | null = null;
function client() {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _client = new Resend(key);
  return _client;
}

const FROM = process.env.EMAIL_FROM ?? "ExamGuard <onboarding@resend.dev>";
const PUBLIC_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function send(email: Email): Promise<{ ok: boolean; error?: string }> {
  const c = client();
  if (!c) {
    // Dev fallback — print so you can see what would have been sent
    console.log(
      `[email:dev] To: ${
        Array.isArray(email.to) ? email.to.join(", ") : email.to
      }\n  Subject: ${email.subject}\n  ${email.text.slice(0, 200)}…`
    );
    return { ok: true };
  }
  try {
    const { error } = await c.emails.send({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---- shared shell ----

function shell(title: string, body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;box-shadow:0 4px 24px rgba(15,23,42,0.06);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:24px 32px;color:#fff;font-size:20px;font-weight:600;letter-spacing:-0.01em;">
          🛡️ ExamGuard
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">${title}</h1>
          <div style="font-size:15px;line-height:1.6;color:#0f172a;">${body}</div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">
          ExamGuard · The honest testing platform
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---- templates ----

export async function sendPendingApprovalToAdmins(
  adminEmails: string[],
  newUser: { name: string; email: string }
) {
  if (adminEmails.length === 0) return { ok: true };
  const adminUrl = `${PUBLIC_URL}/admin`;
  return send({
    to: adminEmails,
    subject: `${newUser.name} requested access to ExamGuard`,
    text: `${newUser.name} (${newUser.email}) just registered for ExamGuard and is awaiting your approval.\n\nReview and approve at ${adminUrl}`,
    html: shell(
      "New teacher signup awaiting your approval",
      `<p>A new teacher just signed up and is waiting for you to review their account:</p>
      <p style="background:#f8fafc;border-radius:10px;padding:14px 16px;margin:16px 0;">
        <strong style="color:#0f172a;">${escape(newUser.name)}</strong><br>
        <span style="color:#475569;">${escape(newUser.email)}</span>
      </p>
      <p style="margin:24px 0;">
        <a href="${adminUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:12px;">
          Open admin dashboard
        </a>
      </p>
      <p style="color:#475569;font-size:13px;">If you don't recognize this person, just reject the request — their account stays disabled.</p>`
    ),
  });
}

export async function sendApprovalGranted(user: {
  name: string;
  email: string;
}) {
  const loginUrl = `${PUBLIC_URL}/login`;
  return send({
    to: user.email,
    subject: "Your ExamGuard account is approved 🎉",
    text: `Hi ${user.name.split(" ")[0]},\n\nYour ExamGuard account has been approved. Sign in at ${loginUrl} to start building exams.\n\n— ExamGuard`,
    html: shell(
      `You're in, ${escape(user.name.split(" ")[0])} 🎉`,
      `<p>Your ExamGuard account has been approved. You can now sign in and start creating exams.</p>
      <p style="margin:24px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:12px;">
          Sign in
        </a>
      </p>
      <p style="color:#475569;font-size:13px;">Tip: students don't need accounts — just share the 6-character join code from any exam you publish.</p>`
    ),
  });
}

export async function sendPasswordResetLink(
  user: { name: string; email: string },
  token: string
) {
  const url = `${PUBLIC_URL}/reset?token=${encodeURIComponent(token)}`;
  return send({
    to: user.email,
    subject: "Reset your ExamGuard password",
    text: `Hi ${user.name.split(" ")[0]},\n\nClick the link below to reset your ExamGuard password. The link expires in 1 hour.\n\n${url}\n\nIf you didn't request this, you can ignore this email.\n\n— ExamGuard`,
    html: shell(
      "Reset your ExamGuard password",
      `<p>Hi ${escape(user.name.split(" ")[0])},</p>
      <p>Click below to set a new password. This link expires in 1 hour.</p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:12px;">
          Reset password
        </a>
      </p>
      <p style="color:#475569;font-size:13px;">If you didn't request this, you can ignore this email — your current password still works.</p>`
    ),
  });
}

export async function sendApprovalRejected(user: {
  name: string;
  email: string;
}) {
  return send({
    to: user.email,
    subject: "ExamGuard signup wasn't approved",
    text: `Hi ${user.name.split(" ")[0]},\n\nYour ExamGuard account wasn't approved by your school admin. If this seems wrong, please reach out to them directly.\n\n— ExamGuard`,
    html: shell(
      "Account not approved",
      `<p>Hi ${escape(user.name.split(" ")[0])},</p>
      <p>Your ExamGuard account wasn't approved by your school admin. If you think this is a mistake, please reach out to your school's ExamGuard admin directly.</p>`
    ),
  });
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
