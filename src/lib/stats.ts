import { addDays, dayKey, statusOf } from "./srs";
import type { DayLog, Progress, Status, Word } from "./types";

export function activity(l: DayLog | undefined): number {
  if (!l) return 0;
  return l.reviews + l.correct + l.wrong;
}

export function streak(logs: Record<string, DayLog>): number {
  let d = new Date();
  // today not studied yet doesn't break the streak
  if (!activity(logs[dayKey(d)])) d = addDays(d, -1);
  let n = 0;
  while (activity(logs[dayKey(d)])) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(logs: Record<string, DayLog>): number {
  const days = Object.keys(logs).filter((k) => activity(logs[k])).sort();
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const k of days) {
    if (prev && dayKey(addDays(new Date(prev + "T12:00:00"), 1)) === k) cur++;
    else cur = 1;
    best = Math.max(best, cur);
    prev = k;
  }
  return best;
}

export function statusCounts(words: Word[], progress: Record<string, Progress>): Record<Status, number> {
  const c: Record<Status, number> = { new: 0, learning: 0, familiar: 0, mastered: 0 };
  for (const w of words) c[statusOf(progress[w.id])]++;
  return c;
}

export function daysUntil(date: string): number | null {
  if (!date) return null;
  const t = new Date(date + "T00:00:00").getTime();
  const today = new Date(dayKey() + "T00:00:00").getTime();
  return Math.round((t - today) / 86_400_000);
}
