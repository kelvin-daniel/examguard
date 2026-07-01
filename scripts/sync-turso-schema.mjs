/**
 * Idempotent, non-destructive schema sync for Turso (libsql).
 *
 * Why this exists: `prisma migrate deploy` can't target a libsql:// URL, so
 * production migrations have to be applied by hand — which drifts easily
 * (a column or whole table ends up missing and requests 500 at runtime).
 *
 * This script connects straight to Turso, creates any missing tables, and
 * adds any missing columns to bring the DB up to the current Prisma schema.
 * It never drops or rewrites existing data. Safe to run repeatedly.
 *
 * Usage:
 *   DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" node scripts/sync-turso-schema.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("Set DATABASE_URL (and TURSO_AUTH_TOKEN for remote Turso).");
  process.exit(1);
}
const db = createClient({ url, authToken });

// Full current schema. CREATE TABLE IF NOT EXISTS is safe on existing tables.
const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token")`,
  `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token")`,
  `CREATE TABLE IF NOT EXISTS "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
    "showResults" BOOLEAN NOT NULL DEFAULT false,
    "passingScore" INTEGER NOT NULL DEFAULT 50,
    "passingScoreMode" TEXT NOT NULL DEFAULT 'percentage',
    "startAt" DATETIME,
    "endAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "requireFullscreen" BOOLEAN NOT NULL DEFAULT true,
    "blockCopyPaste" BOOLEAN NOT NULL DEFAULT true,
    "blockRightClick" BOOLEAN NOT NULL DEFAULT true,
    "blockKeyboardShortcuts" BOOLEAN NOT NULL DEFAULT true,
    "blockTabSwitch" BOOLEAN NOT NULL DEFAULT true,
    "pauseOnViolation" BOOLEAN NOT NULL DEFAULT true,
    "autoSubmitOnViolations" INTEGER NOT NULL DEFAULT 0,
    "allowCalculator" BOOLEAN NOT NULL DEFAULT false,
    "allowScratchpad" BOOLEAN NOT NULL DEFAULT false,
    "collectFields" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Exam_code_key" ON "Exam"("code")`,
  `CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "sectionId" TEXT,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "shuffleOptions" BOOLEAN,
    "options" TEXT,
    "correct" TEXT,
    "config" TEXT,
    "imageUrl" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT,
    "studentInfo" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "score" REAL,
    "maxScore" REAL,
    "questionOrder" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "pausedReason" TEXT,
    "pausedAt" DATETIME,
    "pausedMs" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" REAL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Answer_attemptId_questionId_key" ON "Answer"("attemptId", "questionId")`,
  `CREATE TABLE IF NOT EXISTS "Violation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "meta" TEXT,
    "evidence" TEXT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

// Every column the app expects, so we can add any that a drifted DB is missing.
// [table, column, "COLUMN DEFINITION for ALTER TABLE ADD COLUMN"]
const EXPECTED_COLUMNS = [
  ["User", "role", `"role" TEXT NOT NULL DEFAULT 'teacher'`],
  ["User", "status", `"status" TEXT NOT NULL DEFAULT 'pending'`],
  ["User", "approvedAt", `"approvedAt" DATETIME`],
  ["User", "approvedBy", `"approvedBy" TEXT`],
  ["Exam", "passingScoreMode", `"passingScoreMode" TEXT NOT NULL DEFAULT 'percentage'`],
  ["Exam", "requireFullscreen", `"requireFullscreen" BOOLEAN NOT NULL DEFAULT true`],
  ["Exam", "blockCopyPaste", `"blockCopyPaste" BOOLEAN NOT NULL DEFAULT true`],
  ["Exam", "blockRightClick", `"blockRightClick" BOOLEAN NOT NULL DEFAULT true`],
  ["Exam", "blockKeyboardShortcuts", `"blockKeyboardShortcuts" BOOLEAN NOT NULL DEFAULT true`],
  ["Exam", "blockTabSwitch", `"blockTabSwitch" BOOLEAN NOT NULL DEFAULT true`],
  ["Exam", "pauseOnViolation", `"pauseOnViolation" BOOLEAN NOT NULL DEFAULT true`],
  ["Exam", "autoSubmitOnViolations", `"autoSubmitOnViolations" INTEGER NOT NULL DEFAULT 0`],
  ["Exam", "allowCalculator", `"allowCalculator" BOOLEAN NOT NULL DEFAULT false`],
  ["Exam", "allowScratchpad", `"allowScratchpad" BOOLEAN NOT NULL DEFAULT false`],
  ["Exam", "collectFields", `"collectFields" TEXT`],
  ["Section", "description", `"description" TEXT`],
  ["Question", "sectionId", `"sectionId" TEXT`],
  ["Question", "description", `"description" TEXT`],
  ["Question", "required", `"required" BOOLEAN NOT NULL DEFAULT true`],
  ["Question", "shuffleOptions", `"shuffleOptions" BOOLEAN`],
  ["Question", "config", `"config" TEXT`],
  ["Question", "imageUrl", `"imageUrl" TEXT`],
  ["Attempt", "studentInfo", `"studentInfo" TEXT`],
  ["Attempt", "pausedReason", `"pausedReason" TEXT`],
  ["Attempt", "pausedAt", `"pausedAt" DATETIME`],
  ["Attempt", "pausedMs", `"pausedMs" INTEGER NOT NULL DEFAULT 0`],
  ["Violation", "pending", `"pending" BOOLEAN NOT NULL DEFAULT false`],
  ["Violation", "resolution", `"resolution" TEXT`],
  ["Violation", "resolvedAt", `"resolvedAt" DATETIME`],
];

async function columnsFor(table) {
  try {
    const res = await db.execute(`PRAGMA table_info("${table}")`);
    return new Set(res.rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

async function main() {
  console.log(`Syncing schema on ${url.replace(/\?.*$/, "")}\n`);

  let created = 0;
  for (const sql of CREATE_TABLES) {
    await db.execute(sql);
    if (/CREATE TABLE/i.test(sql)) created++;
  }
  console.log(`✓ Ensured ${created} tables + their indexes exist`);

  let added = 0;
  const byTable = {};
  for (const [t] of EXPECTED_COLUMNS) byTable[t] ??= await columnsFor(t);

  for (const [table, col, def] of EXPECTED_COLUMNS) {
    if (byTable[table].has(col)) continue;
    try {
      await db.execute(`ALTER TABLE "${table}" ADD COLUMN ${def}`);
      console.log(`  + ${table}.${col}`);
      added++;
    } catch (e) {
      // "duplicate column" races are fine; anything else is worth showing.
      if (!/duplicate column/i.test(String(e))) {
        console.warn(`  ! ${table}.${col}: ${e.message ?? e}`);
      }
    }
  }

  console.log(
    added ? `\n✓ Added ${added} missing column(s)` : `\n✓ All columns present`
  );
  console.log("Schema is in sync. Safe to re-run anytime.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Sync failed:", e);
    process.exit(1);
  });
