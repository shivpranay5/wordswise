"use client";

import Link from "next/link";
import { useState } from "react";
import { shuffle, useApp } from "@/lib/app-context";
import { clozeParts } from "@/lib/tts";
import { PageTitle } from "@/components/ui";
import type { Word } from "@/lib/types";

interface Q { type: "tc" | "se"; sentence: string; options: string[]; answers: number[]; explanation: string; target: string }

function localQuestions(ws: Word[], all: Word[]): Q[] {
  return ws.map((w) => {
    const { before, after } = clozeParts(w.cloze);
    const others = shuffle(all.filter((x) => x.id !== w.id && x.pos === w.pos)).slice(0, 4).map((x) => x.word);
    const options = shuffle([w.word, ...others]);
    return { type: "tc", sentence: `${before}_____${after}`, options, answers: [options.indexOf(w.word)], explanation: `${w.word}: ${w.definition}`, target: w.word };
  });
}

export default function Mock() {
  const { features, practicePool, activeWords, practice, api, words } = useApp();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    const ws = practicePool(10);
    try {
      if (features.ai) {
        const r = await api<{ questions: Q[] }>("/api/ai/mock", { words: ws.map((w) => ({ word: w.word, definition: w.definition })) });
        setQs(r.questions.length ? r.questions : localQuestions(ws, activeWords));
      } else {
        setQs(localQuestions(ws, activeWords));
      }
    } catch (e) {
      setErr((e as Error).message + " — using offline questions instead.");
      setQs(localQuestions(ws, activeWords));
    }
    setI(0); setSel([]); setSubmitted(false); setResults([]);
    setBusy(false);
  }

  if (!qs) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageTitle title="Mock test" sub="10 GRE-style questions built from the words you find hardest." back="/play" />
        <div className="card space-y-3 p-6 text-sm">
          <p><b>Text Completion</b> — pick the one word that best fits the blank.</p>
          {features.ai && <p><b>Sentence Equivalence</b> — pick the <i>two</i> words that give the sentence the same meaning.</p>}
          <button className="btn btn-primary w-full" onClick={start} disabled={busy}>{busy ? "Writing your test…" : "Start test"}</button>
          {err && <p className="text-bad">{err}</p>}
        </div>
      </div>
    );
  }

  if (i >= qs.length) {
    const score = results.filter(Boolean).length;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageTitle title="Test results" back="/play" />
        <div className="card space-y-2 p-6 text-center">
          <div className="text-4xl font-semibold">{score} / {qs.length}</div>
          <p className="text-muted">{score / qs.length >= 0.8 ? "Excellent — exam-ready on these words!" : "Missed words were added back to your reviews."}</p>
          <div className="flex justify-center gap-2 pt-2">
            <button className="btn btn-primary" onClick={start} disabled={busy}>{busy ? "…" : "New test"}</button>
            <Link className="btn btn-ghost" href="/study">Review now</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const need = q.answers.length;
  const correct = submitted && sel.length === need && sel.every((s) => q.answers.includes(s));

  function toggle(k: number) {
    if (submitted) return;
    if (need === 1) setSel([k]);
    else setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : s.length < need ? [...s, k] : s));
  }
  function submit() {
    setSubmitted(true);
    const ok = sel.length === need && sel.every((s) => q.answers.includes(s));
    setResults((r) => [...r, ok]);
    const w = words.find((x) => x.word === q.target.toLowerCase());
    if (w) practice(w.id, ok);
  }
  function next() { setI((x) => x + 1); setSel([]); setSubmitted(false); }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex justify-between text-sm text-muted">
        <span>Question {i + 1} of {qs.length}</span>
        <span>{q.type === "se" ? "Sentence Equivalence" : "Text Completion"}</span>
      </div>
      <div className="card p-6">
        <p className="font-serif text-xl leading-relaxed">{q.sentence}</p>
        <p className="mt-3 text-xs text-muted">{need === 2 ? "Select TWO answers" : "Select ONE answer"}</p>
      </div>
      <div className="grid gap-2">
        {q.options.map((o, k) => {
          const isSel = sel.includes(k);
          const cls = !submitted ? (isSel ? "border-accent bg-accent-soft" : "hover:border-accent") : q.answers.includes(k) ? "border-good bg-good/10" : isSel ? "border-bad bg-bad/10" : "opacity-60";
          return (
            <button key={k} onClick={() => toggle(k)} className={`card flex items-center gap-3 px-4 py-3 text-left ${cls}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center border ${need === 2 ? "rounded" : "rounded-full"} ${isSel ? "border-accent bg-accent text-white" : "border-line"}`}>{isSel ? "✓" : ""}</span>
              {o}
            </button>
          );
        })}
      </div>
      {submitted ? (
        <div className="space-y-3">
          <p className={`font-semibold ${correct ? "text-good" : "text-bad"}`}>{correct ? "✓ Correct" : "✗ Incorrect"}</p>
          <p className="text-sm text-muted">{q.explanation}</p>
          <button className="btn btn-primary w-full" onClick={next}>Next →</button>
        </div>
      ) : (
        <button className="btn btn-primary w-full" disabled={sel.length !== need} onClick={submit}>Submit</button>
      )}
    </div>
  );
}
