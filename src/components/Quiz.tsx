"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-context";
import type { Question } from "@/lib/quiz";
import type { Word } from "@/lib/types";
import { Progressbar, SpeakButton } from "./ui";

/** Generic multiple-choice runner used by MC, fill-in-the-blank and the speed round. */
export default function Quiz({
  make,
  count = 10,
  seconds,
  bestKey,
}: {
  make: (w: Word, all: Word[]) => Question;
  count?: number;
  seconds?: number; // timed mode: endless questions until time is up
  bestKey?: string;
}) {
  const { practicePool, activeWords, practice } = useApp();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(() => practicePool(seconds ? 80 : count).map((w) => make(w, activeWords)));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(seconds ?? 0);
  const [best, setBest] = useState(0);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finished = seconds ? timeLeft <= 0 || i >= questions.length : i >= questions.length;
  const q = questions[i];

  useEffect(() => {
    if (!bestKey) return;
    try {
      setBest(Number(localStorage.getItem(bestKey) || 0));
    } catch {}
  }, [bestKey, round]);

  useEffect(() => {
    if (!seconds || finished) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds, finished, round]);

  useEffect(() => {
    if (finished && bestKey && score > best) {
      try {
        localStorage.setItem(bestKey, String(score));
      } catch {}
    }
  }, [finished, bestKey, score, best]);

  function choose(k: number) {
    if (picked !== null || !q) return;
    setPicked(k);
    const ok = k === q.answer;
    practice(q.wordId, ok);
    if (ok) setScore((s) => s + 1);
    else setMissed((m) => [...m, q]);
    if (seconds) advanceRef.current = setTimeout(next, ok ? 350 : 900);
    else if (ok) advanceRef.current = setTimeout(next, 700);
  }

  function next() {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    setPicked(null);
    setI((x) => x + 1);
  }

  function restart() {
    setQuestions(practicePool(seconds ? 80 : count).map((w) => make(w, activeWords)));
    setI(0);
    setScore(0);
    setMissed([]);
    setPicked(null);
    setTimeLeft(seconds ?? 0);
    setRound((r) => r + 1);
  }

  if (finished) {
    const total = seconds ? i : questions.length;
    return (
      <div className="space-y-4">
        <div className="card space-y-2 p-6 text-center">
          <div className="text-5xl">{score / Math.max(1, total) >= 0.8 ? "🏆" : score / Math.max(1, total) >= 0.5 ? "👏" : "💪"}</div>
          <div className="text-2xl font-semibold">
            {score} / {total}
          </div>
          {bestKey && <div className="text-sm text-muted">{score > best ? "New best score!" : `Best: ${best}`}</div>}
          <div className="flex justify-center gap-2 pt-2">
            <button className="btn btn-primary" onClick={restart}>
              Play again
            </button>
            <Link href="/play" className="btn btn-ghost">
              Other games
            </Link>
          </div>
        </div>
        {missed.length > 0 && (
          <div className="card p-5">
            <div className="mb-2 text-sm font-semibold">Review these (added to today’s reviews)</div>
            <ul className="space-y-2 text-sm">
              {missed.map((m, k) => (
                <li key={k} className="border-l-2 border-bad/50 pl-3">
                  {m.explain}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        {seconds ? (
          <>
            <div className={`text-2xl font-semibold tabular-nums ${timeLeft <= 10 ? "text-bad" : ""}`}>⏱ {timeLeft}s</div>
            <div className="flex-1" />
            <div className="text-lg font-semibold">Score {score}</div>
          </>
        ) : (
          <>
            <Progressbar value={i} max={questions.length} />
            <span className="shrink-0 text-xs text-muted">
              {i + 1}/{questions.length}
            </span>
          </>
        )}
      </div>

      <div className="card pop p-6" key={i}>
        {q.promptKind === "word" && (
          <div className="flex items-center justify-center gap-1">
            <h2 className="font-serif text-4xl font-semibold">{q.prompt}</h2>
            {q.speakText && <SpeakButton text={q.speakText} />}
          </div>
        )}
        {q.promptKind === "definition" && (
          <>
            <div className="text-xs uppercase tracking-wide text-muted">Which word means…</div>
            <p className="mt-2 text-xl">{q.prompt}</p>
          </>
        )}
        {q.promptKind === "cloze" && (
          <>
            <div className="text-xs uppercase tracking-wide text-muted">Complete the sentence (the word’s form may change)</div>
            <p className="mt-2 font-serif text-xl leading-relaxed">{q.prompt}</p>
          </>
        )}
      </div>

      <div className="grid gap-2">
        {q.options.map((o, k) => {
          const state = picked === null ? "" : k === q.answer ? "border-good bg-good/10" : k === picked ? "border-bad bg-bad/10 shake" : "opacity-60";
          return (
            <button
              key={k}
              onClick={() => choose(k)}
              className={`card px-4 py-3 text-left text-[15px] transition hover:border-accent ${state}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && picked !== q.answer && !seconds && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">{q.explain}</span>
          <button className="btn btn-ghost shrink-0 text-sm" onClick={next}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
