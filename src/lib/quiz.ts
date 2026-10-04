import { shuffle } from "./app-context";
import { clozeParts } from "./tts";
import type { Word } from "./types";

export interface Question {
  wordId: string;
  prompt: string;
  promptKind: "word" | "definition" | "cloze";
  options: string[];
  answer: number;
  explain: string;
  speakText?: string;
}

function distractors(target: Word, all: Word[], n: number): Word[] {
  const samePos = all.filter((w) => w.id !== target.id && w.pos === target.pos && !target.synonyms.includes(w.word));
  const pool = samePos.length >= n ? samePos : all.filter((w) => w.id !== target.id);
  return shuffle(pool).slice(0, n);
}

export function mcQuestion(w: Word, all: Word[], dir?: "w2d" | "d2w"): Question {
  const d = dir ?? (Math.random() < 0.6 ? "w2d" : "d2w");
  const others = distractors(w, all, 3);
  const opts = shuffle([w, ...others]);
  if (d === "w2d") {
    return {
      wordId: w.id,
      prompt: w.word,
      promptKind: "word",
      options: opts.map((o) => o.definition),
      answer: opts.indexOf(w),
      explain: `${w.word} — ${w.definition}`,
      speakText: w.word,
    };
  }
  return {
    wordId: w.id,
    prompt: w.definition,
    promptKind: "definition",
    options: opts.map((o) => o.word),
    answer: opts.indexOf(w),
    explain: `${w.word} — ${w.definition}`,
  };
}

export function clozeQuestion(w: Word, all: Word[]): Question {
  const { before, after, answer } = clozeParts(w.cloze);
  const others = distractors(w, all, 4);
  const opts = shuffle([w, ...others]);
  return {
    wordId: w.id,
    prompt: `${before}_____${after}`,
    promptKind: "cloze",
    options: opts.map((o) => o.word),
    answer: opts.indexOf(w),
    explain: `${before}${answer}${after}  —  ${w.word}: ${w.definition}`,
  };
}

export function scramble(word: string): string {
  if (word.length < 3) return word;
  let s = word;
  for (let i = 0; i < 10 && s === word; i++) s = shuffle(word.split("")).join("");
  return s;
}
