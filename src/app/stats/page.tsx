"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { addDays, dayKey, isTricky, startOfDay } from "@/lib/srs";
import { activity, bestStreak, statusCounts, streak } from "@/lib/stats";
import type { Word } from "@/lib/types";
import { PageTitle } from "@/components/ui";
import WordDetail from "@/components/WordDetail";

const SEG = [
  { k: "mastered", label: "Mastered", cls: "bg-good" },
  { k: "familiar", label: "Familiar", cls: "bg-sky-500" },
  { k: "learning", label: "Learning", cls: "bg-amber-500" },
  { k: "new", label: "Not started", cls: "bg-line" },
] as const;

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export default function Stats() {
  const { logs, progress, words, byId } = useApp();
  const [open, setOpen] = useState<Word | null>(null);

  const totals = useMemo(() => {
    const ls = Object.values(logs);
    const correct = ls.reduce((a, l) => a + l.correct, 0);
    const wrong = ls.reduce((a, l) => a + l.wrong, 0);
    return { reviews: ls.reduce((a, l) => a + l.reviews, 0), acc: correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0 };
  }, [logs]);

  const lists = useMemo(
    () =>
      [
        { name: "GRE", ws: words.filter((w) => w.lists.includes("gre")) },
        { name: "TOEFL", ws: words.filter((w) => w.lists.includes("toefl")) },
        { name: "My words", ws: words.filter((w) => w.custom) },
      ].filter((l) => l.ws.length),
    [words],
  );

  // heatmap: last 18 weeks, columns = weeks starting Sunday
  const weeks = 18;
  const heat = useMemo(() => {
    const today = startOfDay(new Date());
    const first = addDays(today, -today.getDay() - (weeks - 1) * 7);
    const cols: { key: string; n: number; future: boolean }[][] = [];
    for (let c = 0; c < weeks; c++) {
      const col = [];
      for (let r = 0; r < 7; r++) {
        const d = addDays(first, c * 7 + r);
        const key = dayKey(d);
        col.push({ key, n: activity(logs[key]), future: d > today });
      }
      cols.push(col);
    }
    return cols;
  }, [logs]);
  const maxN = Math.max(1, ...heat.flat().map((c) => c.n));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / maxN) * 4)));
  const LEVEL = ["bg-line", "bg-accent/25", "bg-accent/50", "bg-accent/75", "bg-accent"];

  const forecast = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, i) => ({ d: addDays(today, i), n: 0 }));
    for (const p of Object.values(progress)) {
      const due = startOfDay(new Date(p.due));
      const i = Math.max(0, Math.round((due.getTime() - today.getTime()) / 86_400_000));
      if (i < 7) days[i].n++;
    }
    return days;
  }, [progress]);
  const maxF = Math.max(1, ...forecast.map((f) => f.n));

  const tricky = useMemo(
    () =>
      Object.values(progress)
        .filter((p) => isTricky(p) && byId[p.wordId])
        .sort((a, b) => b.wrong - b.correct - (a.wrong - a.correct))
        .slice(0, 30),
    [progress, byId],
  );

  const started = Object.keys(progress).length;

  return (
    <div className="space-y-5">
      <PageTitle title="Progress" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile value={`🔥 ${streak(logs)}`} label={`day streak · best ${bestStreak(logs)}`} />
        <Tile value={started} label="words started" />
        <Tile value={totals.reviews} label="cards reviewed" />
        <Tile value={`${totals.acc}%`} label="accuracy" />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Mastery by list</h2>
        <div className="space-y-4">
          {lists.map((l) => {
            const c = statusCounts(l.ws, progress);
            return (
              <div key={l.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-muted">
                    {c.mastered} / {l.ws.length} mastered
                  </span>
                </div>
                <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
                  {SEG.map((s) =>
                    c[s.k] ? (
                      <div
                        key={s.k}
                        title={`${s.label}: ${c[s.k]}`}
                        className={`${s.cls} first:rounded-l-full last:rounded-r-full`}
                        style={{ width: `${(c[s.k] / l.ws.length) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {SEG.map((s) => (
            <span key={s.k} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.cls}`} /> {s.label}
            </span>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Study calendar</h2>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {heat.map((col, c) => (
            <div key={c} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={`${cell.key}: ${cell.n} activities`}
                  className={`h-3.5 w-3.5 rounded-[3px] ${cell.future ? "opacity-0" : LEVEL[level(cell.n)]}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted">
          Less {LEVEL.map((l, i) => <span key={i} className={`inline-block h-2.5 w-2.5 rounded-[2px] ${l}`} />)} More
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Reviews coming up</h2>
        <div className="flex h-32 items-end gap-2">
          {forecast.map((f, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${f.n} reviews`}>
              <span className="text-xs tabular-nums text-muted">{f.n}</span>
              <div className="w-full max-w-10 rounded-t bg-accent/80 group-hover:bg-accent" style={{ height: `${(f.n / maxF) * 80}px`, minHeight: f.n ? 4 : 1 }} />
              <span className="text-[11px] text-muted">{i === 0 ? "Today" : f.d.toLocaleDateString(undefined, { weekday: "short" })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Tricky words 🔥</h2>
        <p className="mb-3 text-xs text-muted">Words you’ve missed more than once. Tap to review.</p>
        {tricky.length ? (
          <div className="flex flex-wrap gap-2">
            {tricky.map((p) => (
              <button key={p.wordId} onClick={() => setOpen(byId[p.wordId])} className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent">
                {byId[p.wordId].word} <span className="text-xs text-bad">×{p.wrong}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">None yet — nice!</p>
        )}
      </section>
      <WordDetail word={open} onClose={() => setOpen(null)} />
    </div>
  );
}
