"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { scramble } from "@/lib/quiz";
import { PageTitle, Progressbar, SpeakButton } from "@/components/ui";

export default function Spell() {
  const { practicePool, practice } = useApp();
  const [round, setRound] = useState(0);
  const words = useMemo(() => practicePool(10).filter((w) => !w.word.includes(" ")), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | "ok" | "bad" | "gave">(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const w = words[i];
  const letters = useMemo(() => (w ? scramble(w.word) : ""), [w]);

  if (!w) {
    return (
      <>
        <PageTitle title="Spelling scramble" back="/play" />
        <div className="card space-y-3 p-6 text-center">
          <div className="text-5xl">🔤</div>
          <div className="text-2xl font-semibold">{score} / {words.length}</div>
          <div className="flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => { setRound((r) => r + 1); setI(0); setScore(0); }}>Play again</button>
            <Link href="/play" className="btn btn-ghost">Other games</Link>
          </div>
        </div>
      </>
    );
  }

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (result === "ok" || result === "gave") return next();
    const ok = input.trim().toLowerCase() === w.word.toLowerCase();
    if (ok) {
      setResult("ok");
      setScore((s) => s + 1);
      practice(w.id, tries === 0 && !hint);
    } else {
      setResult("bad");
      setTries((t) => t + 1);
    }
  }
  function giveUp() {
    setResult("gave");
    setInput(w.word);
    practice(w.id, false);
  }
  function next() {
    setI((x) => x + 1);
    setInput("");
    setResult(null);
    setHint(false);
    setTries(0);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Spelling scramble" sub="Unscramble the word that matches the meaning." back="/play" />
      <div className="flex items-center gap-3">
        <Progressbar value={i} max={words.length} />
        <span className="text-xs text-muted">{i + 1}/{words.length}</span>
      </div>
      <div className="card pop space-y-4 p-6" key={i}>
        <p className="text-xl">{w.definition}</p>
        <p className="text-sm italic text-muted">{w.pos} · {w.word.length} letters{hint ? ` · starts with “${w.word[0]}”` : ""}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {letters.split("").map((c, k) => (
            <button key={k} type="button" onClick={() => result !== "ok" && setInput((s) => s + c)} className="h-10 w-9 rounded-lg border border-line bg-bg font-mono text-lg font-semibold uppercase hover:border-accent">
              {c}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={check} className="space-y-2">
        <div className="flex gap-2">
          <input autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`input font-mono text-lg ${result === "bad" ? "shake border-bad" : result === "ok" ? "border-good" : ""}`} value={input} onChange={(e) => { setInput(e.target.value); if (result === "bad") setResult(null); }} placeholder="Type the word" />
          <button type="button" className="btn btn-ghost" onClick={() => setInput("")}>Clear</button>
        </div>
        {result === "ok" && <p className="flex items-center text-good">✓ Correct! <SpeakButton text={w.word} /></p>}
        {result === "gave" && <p className="text-muted">The word was <b>{w.word}</b>.</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1">{result === "ok" || result === "gave" ? "Next →" : "Check"}</button>
          {!result || result === "bad" ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setHint(true)}>Hint</button>
              <button type="button" className="btn btn-ghost" onClick={giveUp}>Show</button>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}
