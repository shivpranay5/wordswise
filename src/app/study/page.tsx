"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { previewLabel, type Grade } from "@/lib/srs";
import { speak } from "@/lib/tts";
import { PageTitle, Progressbar, SpeakButton } from "@/components/ui";
import { Translation, WordBody } from "@/components/WordDetail";

const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: 1, label: "Again", cls: "border-bad/40 text-bad" },
  { g: 2, label: "Hard", cls: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  { g: 3, label: "Good", cls: "border-good/40 text-good" },
  { g: 4, label: "Easy", cls: "border-sky-500/40 text-sky-600 dark:text-sky-400" },
];

export default function Study() {
  const { dueWords, newWordsToday, activeWords, progress, byId, review } = useApp();
  const [queue, setQueue] = useState<string[]>(() => {
    const due = dueWords().map((w) => w.id);
    const fresh = newWordsToday().map((w) => w.id);
    // interleave new words among reviews
    const out: string[] = [];
    let i = 0;
    let j = 0;
    while (i < due.length || j < fresh.length) {
      for (let k = 0; k < 3 && i < due.length; k++) out.push(due[i++]);
      if (j < fresh.length) out.push(fresh[j++]);
    }
    return out;
  });
  const [total, setTotal] = useState(queue.length);
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ good: 0, again: 0 });

  const current = queue[0] ? byId[queue[0]] : null;

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      const { requeue } = review(current.id, g);
      setStats((s) => (g === 1 ? { ...s, again: s.again + 1 } : { ...s, good: s.good + 1 }));
      setQueue((q) => {
        const [head, ...rest] = q;
        if (!requeue) return rest;
        // bring it back a few cards later
        const pos = Math.min(rest.length, 4);
        return [...rest.slice(0, pos), head, ...rest.slice(pos)];
      });
      if (!requeue) setDone((d) => d + 1);
      setRevealed(false);
    },
    [current, review],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        grade(Number(e.key) as Grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  useEffect(() => {
    if (current && revealed) speak(current.word);
  }, [current, revealed]);

  function studyMore() {
    const extra = activeWords
      .filter((w) => !progress[w.id])
      .sort((a, b) => a.difficulty - b.difficulty || a.theme.localeCompare(b.theme))
      .slice(0, 10)
      .map((w) => w.id);
    setQueue(extra);
    setTotal(extra.length);
    setDone(0);
  }

  if (!current) {
    return (
      <div className="space-y-4">
        <PageTitle title="Session complete" />
        <div className="card space-y-3 p-6 text-center">
          <div className="text-5xl">🎉</div>
          <p className="text-lg">
            {stats.good + stats.again === 0 ? "Nothing due right now." : `You reviewed ${done} words. ${stats.good} right, ${stats.again} to retry.`}
          </p>
          <p className="text-sm text-muted">Come back tomorrow — spaced repetition works best a little every day.</p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <button className="btn btn-primary" onClick={studyMore}>
              Learn 10 more new words
            </button>
            <Link href="/play" className="btn btn-ghost">
              Play a game
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const p = progress[current.id];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Progressbar value={done} max={total} />
        <span className="shrink-0 text-xs text-muted">
          {done}/{total}
        </span>
      </div>

      <div
        className="card pop min-h-[340px] cursor-pointer p-6"
        key={current.id + (revealed ? "b" : "f")}
        onClick={() => setRevealed(true)}
      >
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{current.lists.map((l) => l.toUpperCase()).join(" · ")}</span>
          {!p && <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-white">NEW</span>}
        </div>
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-1">
            <h2 className="font-serif text-4xl font-semibold sm:text-5xl">{current.word}</h2>
            <SpeakButton text={current.word} />
          </div>
          <div className="mt-1 italic text-muted">{current.pos}</div>
        </div>
        {revealed ? (
          <div className="mt-6 space-y-3 border-t border-line pt-4">
            <WordBody w={current} />
            <div onClick={(e) => e.stopPropagation()}>
              <Translation w={current} />
            </div>
          </div>
        ) : (
          <p className="mt-16 text-center text-sm text-muted">Do you know it? Tap to reveal</p>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(({ g, label, cls }) => (
            <button key={g} className={`btn border bg-card py-3 ${cls} flex-col gap-0`} onClick={() => grade(g)}>
              <span>{label}</span>
              <span className="text-[11px] font-normal opacity-70">{previewLabel(p, current.id, g)}</span>
            </button>
          ))}
        </div>
      ) : (
        <button className="btn btn-primary w-full py-3" onClick={() => setRevealed(true)}>
          Show answer
        </button>
      )}
      <p className="hidden text-center text-xs text-muted sm:block">Keyboard: Space to reveal · 1–4 to rate</p>
    </div>
  );
}
