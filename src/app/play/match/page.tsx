"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle, useApp } from "@/lib/app-context";
import { PageTitle } from "@/components/ui";
import type { Word } from "@/lib/types";

interface Tile { key: string; wordId: string; text: string; kind: "word" | "syn" }

const PAIRS = 6;

/** Picks words whose synonyms don't overlap, so every tile has exactly one partner. */
function pickPairs(pool: Word[]): { w: Word; syn: string }[] {
  const out: { w: Word; syn: string }[] = [];
  const taken = new Set<string>(); // every word + synonym already on the board
  for (const w of pool) {
    const syns = w.synonyms.map((s) => s.toLowerCase());
    const word = w.word.toLowerCase();
    if (taken.has(word) || syns.some((s) => taken.has(s))) continue;
    const syn = w.synonyms.find((s) => s.toLowerCase() !== word);
    if (!syn) continue;
    taken.add(word);
    syns.forEach((s) => taken.add(s));
    out.push({ w, syn });
    if (out.length === PAIRS) break;
  }
  return out;
}

export default function Match() {
  const { practicePool, practice, settings } = useApp();
  const [round, setRound] = useState(0);
  const pairs = useMemo(() => pickPairs(practicePool(40)), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const wordTiles = useMemo<Tile[]>(
    () => shuffle(pairs.map(({ w }) => ({ key: w.id + ":w", wordId: w.id, text: w.word, kind: "word" as const }))),
    [pairs],
  );
  const synTiles = useMemo<Tile[]>(
    () => shuffle(pairs.map(({ w, syn }) => ({ key: w.id + ":s", wordId: w.id, text: syn, kind: "syn" as const }))),
    [pairs],
  );
  const [sel, setSel] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<Record<string, number>>({});
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => () => {
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
  }, []);

  function tap(t: Tile) {
    if (matched.has(t.wordId) || wrongPair.length) return;
    if (!sel) return setSel(t);
    if (sel.key === t.key) return setSel(null);
    if (sel.kind === t.kind) return setSel(t); // changed their mind within the same column
    if (sel.wordId === t.wordId) {
      setMatched((m) => new Set(m).add(t.wordId));
      setSel(null);
      return;
    }
    const word = sel.kind === "word" ? sel : t;
    setWrongPair([sel.key, t.key]);
    setMistakes((m) => ({ ...m, [word.wordId]: (m[word.wordId] ?? 0) + 1 }));
    setTotalMistakes((n) => n + 1);
    wrongTimer.current = setTimeout(() => { setWrongPair([]); setSel(null); }, 700);
  }

  function again() {
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    setRound((r) => r + 1); setMatched(new Set()); setMistakes({}); setTotalMistakes(0); setWrongPair([]); setSel(null); setStart(Date.now()); setNow(Date.now());
  }

  const secs = Math.round((now - start) / 1000);
  const hint = wrongPair.length
    ? "Not a match — try again."
    : !sel
      ? "Tap a word on the left."
      : sel.kind === "word"
        ? `Now tap the synonym of “${sel.text}” on the right.`
        : `Now tap the word that means “${sel.text}” on the left.`;

  function column(title: string, tiles: Tile[]) {
    return (
      <div className="space-y-2">
        <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
        {tiles.map((t) => {
          const isM = matched.has(t.wordId);
          const isSel = sel?.key === t.key;
          const isWrong = wrongPair.includes(t.key);
          const state = isM
            ? "border-good bg-good/15 text-good"
            : isWrong
              ? "shake border-bad bg-bad/15 text-bad"
              : isSel
                ? "border-accent bg-accent-soft text-accent"
                : "hover:border-accent";
          return (
            <button key={t.key} onClick={() => tap(t)} disabled={isM} aria-pressed={isSel}
              className={`card flex min-h-14 w-full items-center justify-center gap-1.5 border-2 px-2 py-3 text-center leading-tight transition ${t.kind === "word" ? "font-serif text-lg font-semibold" : "text-[15px]"} ${state}`}>
              {isM && <span className="text-sm">✓</span>}
              <span className="break-words">{t.text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Synonym match" sub="Pair each word with its synonym." back="/play" />
      <div className="flex justify-between text-sm text-muted">
        <span>⏱ {secs}s</span>
        <span>{matched.size}/{pairs.length} pairs · {totalMistakes} mistake{totalMistakes === 1 ? "" : "s"}</span>
      </div>
      {pairs.length === 0 ? (
        <div className="card p-8 text-center text-muted">Not enough words with synonyms to build a board yet.</div>
      ) : done ? (
        <div className="card space-y-3 p-6 text-center">
          <div className="text-5xl">🧩</div>
          <div className="text-xl font-semibold">
            {settings.name ? `Well done, ${settings.name}! ` : ""}Solved in {secs}s with {totalMistakes} mistake{totalMistakes === 1 ? "" : "s"}
          </div>
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
        <>
          <div className={`rounded-lg px-3 py-2 text-center text-sm ${wrongPair.length ? "bg-bad/10 text-bad" : "bg-accent-soft text-accent"}`}>{hint}</div>
          <div className="grid grid-cols-2 gap-3">
            {column("Words", wordTiles)}
            {column("Synonyms", synTiles)}
          </div>
        </>
      )}
    </div>
  );
}
