"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Empty, PageTitle, SpeakButton } from "@/components/ui";
import type { Word } from "@/lib/types";

interface Grade { correct: boolean; score: number; feedback: string; improved: string }

export default function Sentence() {
  const { features, practicePool, practice, api } = useApp();
  const [w, setW] = useState<Word | undefined>(() => practicePool(1)[0]);
  const [text, setText] = useState("");
  const [res, setRes] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!features.ai) return (<><PageTitle title="Use it in a sentence" back="/play" /><Empty>This needs the AI tutor. Add <code>ANTHROPIC_API_KEY</code> on the server to turn it on.</Empty></>);
  if (!w) return null;

  function another() {
    setW(practicePool(1)[0]);
    setText("");
    setRes(null);
    setErr(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !w) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<Grade>("/api/ai/grade", { word: w.word, definition: w.definition, sentence: text });
      setRes(r);
      practice(w.id, r.correct);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Use it in a sentence" sub="Writing your own sentence is the fastest way to make a word stick." back="/play" />
      <div className="card p-5">
        <div className="flex items-center gap-1">
          <h2 className="font-serif text-3xl font-semibold">{w.word}</h2>
          <SpeakButton text={w.word} />
          <span className="ml-1 text-sm italic text-muted">{w.pos}</span>
        </div>
        <p className="mt-1 text-muted">{w.definition}</p>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <textarea className="input min-h-28 text-[16px]" placeholder={`Write a sentence using “${w.word}”…`} value={text} onChange={(e) => setText(e.target.value)} maxLength={400} disabled={!!res} />
        {!res ? (
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={busy || !text.trim()}>{busy ? "Checking…" : "Check my sentence"}</button>
            <button type="button" className="btn btn-ghost" onClick={another}>Skip</button>
          </div>
        ) : null}
        {err && <p className="text-sm text-bad">{err}</p>}
      </form>
      {res && (
        <div className="card pop space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className={`text-lg font-semibold ${res.correct ? "text-good" : "text-bad"}`}>{res.correct ? "✓ Nicely used!" : "✗ Not quite"}</span>
            <span className="text-lg">{"★".repeat(res.score)}<span className="text-line">{"★".repeat(5 - res.score)}</span></span>
          </div>
          <p>{res.feedback}</p>
          {res.improved && (
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 font-serif italic">{res.improved}</p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={another}>Next word →</button>
            <button className="btn btn-ghost" onClick={() => { setRes(null); }}>Try again</button>
          </div>
        </div>
      )}
    </div>
  );
}
