import type { Progress, Status } from "./types";

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type Grade = 1 | 2 | 3 | 4;

const DAY = 86_400_000;

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function newProgress(wordId: string, now: Date): Progress {
  return {
    wordId,
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: now.toISOString(),
    correct: 0,
    wrong: 0,
    lastReviewed: null,
    firstSeen: now.toISOString(),
  };
}

/**
 * SM-2 style scheduler with day-granularity reviews.
 * Returns the new progress and whether the card should come back in this session.
 */
export function schedule(
  prev: Progress | undefined,
  wordId: string,
  grade: Grade,
  now: Date = new Date(),
): { progress: Progress; requeue: boolean } {
  const p: Progress = prev ? { ...prev } : newProgress(wordId, now);
  p.lastReviewed = now.toISOString();

  if (grade === 1) {
    if (p.interval > 0) p.lapses += 1;
    p.ease = Math.max(1.3, p.ease - 0.2);
    p.interval = 0;
    p.reps = 0;
    p.wrong += 1;
    p.due = new Date(now.getTime() + 60_000).toISOString();
    return { progress: p, requeue: true };
  }

  p.correct += 1;
  if (p.interval === 0) {
    if (grade === 2) {
      p.interval = 1;
      p.ease = Math.max(1.3, p.ease - 0.15);
    } else if (grade === 3) {
      p.interval = 1;
    } else {
      p.interval = 4;
      p.ease += 0.15;
    }
  } else {
    const iv = p.interval;
    if (grade === 2) {
      p.interval = Math.max(iv + 1, Math.round(iv * 1.2));
      p.ease = Math.max(1.3, p.ease - 0.15);
    } else if (grade === 3) {
      p.interval = Math.max(iv + 1, Math.round(iv * p.ease));
    } else {
      p.interval = Math.max(iv + 2, Math.round(iv * p.ease * 1.3));
      p.ease += 0.15;
    }
  }
  p.interval = Math.min(p.interval, 365);
  p.reps += 1;
  p.due = new Date(startOfDay(now).getTime() + p.interval * DAY).toISOString();
  return { progress: p, requeue: false };
}

/** Light-touch update from games: never promotes, only flags misses for review. */
export function practiceUpdate(prev: Progress | undefined, wordId: string, correct: boolean, now = new Date()): Progress {
  const p: Progress = prev ? { ...prev } : newProgress(wordId, now);
  if (correct) {
    p.correct += 1;
  } else {
    p.wrong += 1;
    p.ease = Math.max(1.3, p.ease - 0.1);
    if (new Date(p.due) > now) p.due = now.toISOString(); // bring it back into today's reviews
  }
  return p;
}

export function statusOf(p: Progress | undefined): Status {
  if (!p) return "new";
  if (p.interval >= 21) return "mastered";
  if (p.interval >= 7) return "familiar";
  return "learning";
}

export function isDue(p: Progress, now = new Date()): boolean {
  return new Date(p.due).getTime() <= now.getTime();
}

export function isTricky(p: Progress | undefined): boolean {
  if (!p) return false;
  return p.lapses >= 2 || (p.wrong >= 2 && p.wrong >= p.correct);
}

/** Preview the interval a grade would give, for button labels. */
export function previewLabel(prev: Progress | undefined, wordId: string, grade: Grade): string {
  const { progress, requeue } = schedule(prev, wordId, grade, new Date());
  if (requeue) return "<1m";
  const d = progress.interval;
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return "1y";
}
