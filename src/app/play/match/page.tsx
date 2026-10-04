"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { shuffle, useApp } from "@/lib/app-context";
import { PageTitle } from "@/components/ui";

interface Tile { key: string; wordId: string; text: string; kind: "word" | "syn" }

export default function Match() {
  const { practicePool, practice } = useApp();
  const [round, setRound] = useState(0);
  const pairs = useMemo(() => {
    const pool = practicePool(30).filter((w) => w.synonyms.length > 0);
    const used = new Set<string>();
    const out = [];
    for (const w of pool) {
      const syn = w.synonyms.find((s) => !used.has(s.toLowerCase()) && s.toLowerCase() !== w.word);
      if (!syn) continue;
      used.add(syn.toLowerCase());
      out.push({ w, syn });
      if (out.length === 6) break;
    }
    return out;
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const tiles = useMemo<Tile[]>(
    () => shuffle(pairs.flatMap(({ w, syn }) => [
      { key: w.id + ":w", wordId: w.id, text: w.word, kind: "word" as const },
      { key: w.id + ":s", wordId: w.id, text: syn, kind: "syn" as const },
    ])),
    [pairs],
  );
  const [sel, setSel] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const done = pairs.length > 0 && matched.size === pairs.length;

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (!done) return;
    pairs.forEach(({ w }) => practice(w.id, !mistakes[w.id]));
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  function tap(t: Tile) {
    if (matched.has(t.wordId) || wrongPair.length) return;
    if (!sel) return setSel(t);
    if (sel.key === t.key) return setSel(null);
    if (sel.wordId === t.wordId && sel.kind !== t.kind) {
      setMatched((m) => new Set(m).add(t.wordId));
      setSel(null);
    } else if (sel.kind === t.kind) {
      setSel(t);
    } else {
      setWrongPair([sel.key, t.key]);
      setMistakes((m) => ({ ...m, [sel.wordId]: (m[sel.wordId] ?? 0) + 1, [t.wordId]: (m[t.wordId] ?? 0) + 1 }));
      setTimeout(() => { setWrongPair([]); setSel(null); }, 600);
    }
  }

  function again() {
    setRound((r) => r + 1); setMatched(new Set()); setMistakes({}); setSel(null); setStart(Date.now()); setNow(Date.now());
  }

  const secs = Math.round((now - start) / 1000);
  const totalMistakes = Object.values(mistakes).reduce((a, b) => a + b, 0) / 2;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Synonym match" sub="Tap a word, then its synonym." back="/play" />
      <div className="flex justify-between text-sm text-muted">
        <span>⏱ {secs}s</span>
        <span>{matched.size}/{pairs.length} pairs · {totalMistakes} mistakes</span>
      </div>
      {done ? (
        <div className="card space-y-3 p-6 text-center">
          <div className="text-5xl">🧩</div>
          <div className="text-xl font-semibold">Solved in {secs}s with {totalMistakes} mistake{totalMistakes === 1 ? "" : "s"}</div>
          <ul className="mx-auto max-w-sm space-y-1 text-left text-sm">
            {pairs.map(({ w, syn }) => (
              <li key={w.id}><b>{w.word}</b> = {syn} <span className="text-muted">— {w.definition}</span></li>
            ))}
          </ul>
          <div className="flex justify-center gap-2">
            <button className="btn btn-primary" onClick={again}>New board</button>
            <Link href="/play" className="btn btn-ghost">Other games</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles.map((t) => {
            const isM = matched.has(t.wordId);
            const isSel = sel?.key === t.key;
            const isWrong = wrongPair.includes(t.key);
            return (
              <button key={t.key} onClick={() => tap(t)} disabled={isM}
                className={`card min-h-16 px-3 py-4 text-center transition ${t.kind === "word" ? "font-serif text-lg font-semibold" : "text-[15px]"} ${isM ? "border-good bg-good/10 opacity-40" : isWrong ? "shake border-bad bg-bad/10" : isSel ? "border-accent bg-accent-soft" : "hover:border-accent"}`}>
                {t.text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
