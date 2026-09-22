-- In-exam chat between teacher and student.
-- attemptId NULL = broadcast to everyone sitting the exam (one row, not one
-- per student, so a class announcement is a single write).
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "attemptId" TEXT,
    "fromTeacher" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Message_examId_createdAt_idx" ON "Message"("examId", "createdAt");
CREATE INDEX "Message_attemptId_createdAt_idx" ON "Message"("attemptId", "createdAt");

-- One read mark per side. Beats a per-message read flag because a broadcast
-- is a single row read by many students.
ALTER TABLE "Attempt" ADD COLUMN "chatReadAt" DATETIME;
ALTER TABLE "Attempt" ADD COLUMN "teacherChatReadAt" DATETIME;

-- Teachers can turn student-initiated chat off for a strict exam.
ALTER TABLE "Exam" ADD COLUMN "allowChat" BOOLEAN NOT NULL DEFAULT true;
