-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT,
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
    "userAgent" TEXT,
    CONSTRAINT "Attempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Attempt" ("examId", "id", "ipAddress", "maxScore", "pausedReason", "questionOrder", "score", "startedAt", "status", "studentEmail", "studentName", "submittedAt", "userAgent") SELECT "examId", "id", "ipAddress", "maxScore", "pausedReason", "questionOrder", "score", "startedAt", "status", "studentEmail", "studentName", "submittedAt", "userAgent" FROM "Attempt";
DROP TABLE "Attempt";
ALTER TABLE "new_Attempt" RENAME TO "Attempt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
