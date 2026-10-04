"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";
import { statusOf } from "@/lib/srs";
import { clozePlain } from "@/lib/tts";
import { LANGUAGES, type Word } from "@/lib/types";
import { SpeakButton } from "./ui";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-line text-muted",
  learning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  familiar: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  mastered: "bg-good/15 text-good",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[status]}`}>{status}</span>;
}

/** The full word content, used on flashcard backs and in the word sheet. */
export function WordBody({ w }: { w: Word }) {
  return (
    <div className="space-y-3 text-left">
      <p className="text-lg leading-snug">{w.definition}</p>
      <ul className="space-y-1.5">
        {[...w.examples, clozePlain(w.cloze)].slice(0, 3).map((ex, i) => (
          <li key={i} className="border-l-2 border-line pl-3 font-serif text-[15px] italic text-muted">
            {ex}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {w.synonyms.map((s) => (
          <span key={s} className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">
            {s}
          </span>
        ))}
        {w.antonyms.map((s) => (
          <span key={s} className="rounded-full border border-line px-2 py-0.5 text-muted">
            ≠ {s}
          </span>
        ))}
      </div>
      {w.mnemonic && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
          <span className="font-semibold">💡 Memory tip: </span>
          {w.mnemonic}
        </p>
      )}
    </div>
  );
}

function cacheGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function cacheSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export function Translation({ w }: { w: Word }) {
  const { settings, features, api } = useApp();
  const lang = settings.language;
  const key = `tr:${lang}:${w.id}`;
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setText(lang ? cacheGet(key) : null);
    setErr(null);
  }, [key, lang]);

  if (!lang || !(features.ai || features.sarvam)) return null;
  const name = LANGUAGES.find((l) => l.code === lang)?.name ?? lang;

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ text: string }>("/api/translate", { word: w.word, definition: w.definition, lang });
      setText(r.text);
      cacheSet(key, r.text);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="text-sm">
      {text ? (
        <p className="rounded-lg border border-line px-3 py-2">
          <span className="font-semibold">{name}: </span>
          {text}
        </p>
      ) : (
        <button className="text-accent underline" onClick={load} disabled={busy}>
          {busy ? "Translating…" : `Show meaning in ${name}`}
        </button>
      )}
      {err && <p className="text-bad">{err}</p>}
    </div>
  );
}

function AskTutor({ w }: { w: Word }) {
  const { features, api } = useApp();
  const [q, setQ] = useState("");
  const [a, setA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!features.ai) return null;

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ answer: string }>("/api/ai/ask", { word: w.word, definition: w.definition, question });
      setA(r.answer);
    } catch (e) {
      setA(`⚠️ ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Ask the tutor</div>
      <div className="flex flex-wrap gap-1.5">
        {["How is it different from its synonyms?", "Give me 3 more example sentences", "What's the word origin?"].map((s) => (
          <button key={s} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent" onClick={() => ask(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input className="input text-sm" placeholder={`Ask anything about “${w.word}”`} value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} />
        <button className="btn btn-primary text-sm" disabled={busy}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
      {a && <div className="whitespace-pre-wrap rounded-lg bg-accent-soft/60 px-3 py-2 text-sm">{a}</div>}
    </div>
  );
}

export default function WordDetail({ word, onClose }: { word: Word | null; onClose: () => void }) {
  const { progress, deleteCustom } = useApp();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!word) return null;
  const p = progress[word.id];
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="card pop max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1">
              <h2 className="font-serif text-3xl font-semibold">{word.word}</h2>
              <SpeakButton text={word.word} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="italic">{word.pos}</span>
              <span>·</span>
              <span>{word.theme}</span>
              <StatusPill status={statusOf(p)} />
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-2xl leading-none text-muted" aria-label="Close">
            ×
          </button>
        </div>
        <WordBody w={word} />
        <div className="mt-3">
          <Translation w={word} />
        </div>
        {p && (
          <p className="mt-3 text-xs text-muted">
            Seen correct {p.correct}× · missed {p.wrong}× · next review {new Date(p.due).toLocaleDateString()}
          </p>
        )}
        <div className="mt-4">
          <AskTutor w={word} />
        </div>
        {word.custom && (
          <button
            className="mt-4 text-sm text-bad underline"
            onClick={() => {
              if (confirm(`Delete “${word.word}” from your words?`)) {
                deleteCustom(word.id);
                onClose();
              }
            }}
          >
            Delete this word
          </button>
        )}
      </div>
    </div>
  );
}
