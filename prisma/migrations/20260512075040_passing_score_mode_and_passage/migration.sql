-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exam" (
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
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exam_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Exam" ("allowCalculator", "allowScratchpad", "autoSubmitOnViolations", "blockCopyPaste", "blockKeyboardShortcuts", "blockRightClick", "blockTabSwitch", "code", "createdAt", "description", "durationMinutes", "endAt", "id", "ownerId", "passingScore", "pauseOnViolation", "requireFullscreen", "showResults", "shuffleOptions", "shuffleQuestions", "startAt", "status", "title", "updatedAt") SELECT "allowCalculator", "allowScratchpad", "autoSubmitOnViolations", "blockCopyPaste", "blockKeyboardShortcuts", "blockRightClick", "blockTabSwitch", "code", "createdAt", "description", "durationMinutes", "endAt", "id", "ownerId", "passingScore", "pauseOnViolation", "requireFullscreen", "showResults", "shuffleOptions", "shuffleQuestions", "startAt", "status", "title", "updatedAt" FROM "Exam";
DROP TABLE "Exam";
ALTER TABLE "new_Exam" RENAME TO "Exam";
CREATE UNIQUE INDEX "Exam_code_key" ON "Exam"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
