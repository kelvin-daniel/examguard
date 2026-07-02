-- Add per-exam default points for new questions
ALTER TABLE "Exam" ADD COLUMN "defaultPoints" REAL NOT NULL DEFAULT 1;

-- Question.points becomes Float. The declared column type must actually be
-- REAL: the libsql driver coerces bound values to the declared type, so an
-- INTEGER column silently truncates 0.5 -> 0. SQLite can't ALTER a column
-- type, so rename -> add -> copy -> drop.
ALTER TABLE "Question" RENAME COLUMN "points" TO "points_retype_old";
ALTER TABLE "Question" ADD COLUMN "points" REAL NOT NULL DEFAULT 1;
UPDATE "Question" SET "points" = "points_retype_old";
ALTER TABLE "Question" DROP COLUMN "points_retype_old";
