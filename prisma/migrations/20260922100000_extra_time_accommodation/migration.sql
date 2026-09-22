-- Teacher-granted accommodation time (extra time for documented needs, or
-- making up for a technical problem). Kept separate from pausedMs so the
-- two reasons a deadline moved stay auditable.
ALTER TABLE "Attempt" ADD COLUMN "extraTimeMs" INTEGER NOT NULL DEFAULT 0;
