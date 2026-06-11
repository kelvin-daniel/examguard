/**
 * Single source of truth for an attempt's deadline.
 *
 * The clock pauses while a student is frozen awaiting teacher review:
 * `pausedMs` accumulates completed pauses, and `pausedAt` (set while a pause
 * is still open) extends the deadline in real time until the teacher decides.
 * Net effect: a student paused with 5 minutes left still has 5 minutes after
 * being allowed to continue.
 */
export function attemptDeadlineMs(
  attempt: { startedAt: Date; pausedMs: number; pausedAt: Date | null },
  durationMinutes: number
): number {
  const openPause = attempt.pausedAt
    ? Date.now() - attempt.pausedAt.getTime()
    : 0;
  return (
    attempt.startedAt.getTime() +
    durationMinutes * 60_000 +
    attempt.pausedMs +
    openPause
  );
}
