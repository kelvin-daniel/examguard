# ExamGuard

Cheat-proof, mobile-first online exam platform built for classrooms. Teachers
build exams in a Google-Forms-style editor; students join with a 6-character
code; the platform enforces full-screen and behavioral anti-cheat with
automatic screenshot evidence on every flagged event.

## Highlights

- **Forms-grade editor** — drag-to-reorder cards, 10 question types, inline
  type changer, sections, bulk paste, preview
- **Behavioral anti-cheat** — fullscreen exit, tab-switch, copy/paste, right
  click, devtools shortcuts → screenshot + report
- **Live monitor** — teacher sees pending reviews in real time, can pause /
  allow / terminate; "End exam" preserves screenshot as proof
- **Admin approval** — anyone can register, admin approves before access
- **Free-tier ready** — Vercel + Turso + Resend, all on free plans

## Stack

- Next.js 16 (App Router, Turbopack)
- Prisma 7 + libsql adapter (works with local SQLite *or* Turso)
- Tailwind CSS v4
- Custom session auth (bcryptjs + httpOnly cookies)
- dnd-kit for drag-to-reorder
- html2canvas for screenshot evidence
- Resend for transactional email (optional — falls back to console logs)

## Local development

```bash
git clone https://github.com/kelvin-daniel/examguard.git
cd examguard
npm install
cp .env .env.local       # adjust if needed; defaults work for local
npx prisma migrate dev   # creates dev.db
npm run dev              # http://localhost:3000
```

The first user you register becomes the bootstrap admin automatically.
Alternatively, set `ADMIN_EMAILS` in `.env` *before* registering — any email
in that list also becomes an admin on first signup.

## Free-tier production deployment

Three free services, ~30 min to set up.

### 1. Database — Turso (free tier: 9 GB, 1B reads/mo)

```bash
# Install the Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Auth + create database
turso auth signup
turso db create examguard

# Get the connection string + auth token
turso db show examguard --url           # → DATABASE_URL
turso db tokens create examguard        # → TURSO_AUTH_TOKEN

# Apply your schema
DATABASE_URL="<turso-url>" TURSO_AUTH_TOKEN="<token>" \
  npx prisma migrate deploy
```

### 2. Email — Resend (free: 3,000/mo, 100/day)

1. Sign up at [resend.com](https://resend.com).
2. Generate an API key.
3. For instant testing, you can send from `onboarding@resend.dev` (no DNS
   setup). Once you verify your school's domain, switch `EMAIL_FROM` to a
   real address.

### 3. Hosting — Vercel (free Hobby tier)

Push to GitHub, then:

```bash
# Install Vercel CLI
npm install -g vercel

# From your repo root, deploy
vercel
```

When prompted, set these environment variables (or paste them in the Vercel
dashboard under *Project → Settings → Environment Variables*):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Turso `libsql://…` URL |
| `TURSO_AUTH_TOKEN` | Token from `turso db tokens create` |
| `ADMIN_EMAILS` | Comma-separated school admin emails |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | `ExamGuard <onboarding@resend.dev>` to start |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

Then `vercel --prod` to deploy. Vercel rebuilds on every `git push` from then on.

> **Vercel ToS note:** the Hobby plan technically forbids commercial use.
> Internal school use is grey area — most schools fall under "personal/educational"
> in practice, but read the fine print. If you outgrow it (or want zero
> ambiguity), Cloudflare Pages + D1 is also free and has no commercial-use
> clause. The libsql adapter doesn't run on D1, so that path needs a different
> Prisma adapter swap — open an issue if you need help.

## Environment variables

| Variable | Required? | What it does |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` for local; `libsql://…` for Turso |
| `TURSO_AUTH_TOKEN` | prod only | Turso auth token |
| `ADMIN_EMAILS` | optional | Comma-separated emails auto-approved as admin on signup |
| `RESEND_API_KEY` | optional | If unset, emails just log to stdout |
| `EMAIL_FROM` | optional | Defaults to `ExamGuard <onboarding@resend.dev>` |
| `NEXT_PUBLIC_APP_URL` | prod only | Used in email links |

## Roadmap

- [ ] Move screenshot evidence to Cloudflare R2 (free 10 GB) instead of base64 in DB
- [ ] Image attachments on questions
- [ ] Conditional section branching
- [ ] CSV export for results
- [ ] Manual grading UI for short-answer / essay questions
- [ ] Email password-reset flow

## License

MIT
