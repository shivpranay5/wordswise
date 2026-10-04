"use client";

import Link from "next/link";
import { speak } from "@/lib/tts";

export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Pronounce ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`rounded-full p-2 text-muted hover:bg-accent-soft hover:text-accent ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
      </svg>
    </button>
  );
}

export function PageTitle({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <div className="mb-4">
      {back && (
        <Link href={back} className="mb-1 inline-block text-sm text-muted hover:text-ink">
          ← Back
        </Link>
      )}
      <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Progressbar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export const GAMES = [
  { href: "/play/mc", title: "Multiple choice", desc: "Pick the right meaning", emoji: "🎯" },
  { href: "/play/cloze", title: "Fill in the blank", desc: "GRE-style sentences", emoji: "✍️" },
  { href: "/play/match", title: "Synonym match", desc: "Pair words with synonyms", emoji: "🧩" },
  { href: "/play/spell", title: "Spelling scramble", desc: "Unscramble from the meaning", emoji: "🔤" },
  { href: "/play/speed", title: "Speed round", desc: "60 seconds, go!", emoji: "⚡" },
  { href: "/sentence", title: "Use it in a sentence", desc: "AI tutor grades you", emoji: "🧑‍🏫" },
  { href: "/speak", title: "Speaking practice", desc: "Pronunciation score", emoji: "🎙️" },
  { href: "/mock", title: "Mock test", desc: "GRE-style, from your weak words", emoji: "📝" },
];

export function GameGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {GAMES.map((g) => (
        <Link key={g.href} href={g.href} className="card p-4 transition hover:border-accent">
          <div className="text-2xl">{g.emoji}</div>
          <div className="mt-2 text-sm font-semibold">{g.title}</div>
          <div className="text-xs text-muted">{g.desc}</div>
        </Link>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-8 text-center text-muted">{children}</div>;
}
