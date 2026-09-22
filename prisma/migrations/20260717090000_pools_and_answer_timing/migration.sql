-- Question pools: ask N random questions per student from a section (or the
-- unsectioned group via Exam.poolSize). null = serve all.
ALTER TABLE "Exam" ADD COLUMN "poolSize" INTEGER;
ALTER TABLE "Section" ADD COLUMN "poolSize" INTEGER;

-- Time the student had the question on screen before this response was saved.
ALTER TABLE "Answer" ADD COLUMN "timeSpentMs" INTEGER NOT NULL DEFAULT 0;
