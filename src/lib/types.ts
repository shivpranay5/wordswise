export type ListId = "gre" | "toefl" | "mine";

export interface Word {
  id: string;
  word: string;
  pos: string;
  definition: string;
  examples: string[];
  /** sentence with the answer wrapped once in {{ }} */
  cloze: string;
  synonyms: string[];
  antonyms: string[];
  mnemonic: string;
  difficulty: number;
  theme: string;
  lists: ListId[];
  /** tier in the Magoosh 1000 list, if the word is on it */
  magoosh?: "common" | "basic" | "advanced";
  custom?: boolean;
}

export interface Progress {
  wordId: string;
  ease: number;
  /** days until next review; 0 = still learning */
  interval: number;
  reps: number;
  lapses: number;
  due: string; // ISO
  correct: number;
  wrong: number;
  lastReviewed: string | null;
  firstSeen: string;
}

export interface DayLog {
  date: string; // YYYY-MM-DD local
  reviews: number;
  newLearned: number;
  correct: number;
  wrong: number;
}

export interface Settings {
  name: string;
  dailyNew: number;
  lists: ("gre" | "toefl")[];
  examName: string;
  examDate: string; // YYYY-MM-DD or ""
  language: string; // "" | "te" | "hi" ...
  accessCode: string;
  /** introduce Magoosh words first: Common → Basic → Advanced */
  magooshFirst: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  dailyNew: 15,
  lists: ["gre", "toefl"],
  examName: "GRE",
  examDate: "",
  language: "",
  accessCode: "",
  magooshFirst: true,
};

export const MAGOOSH_TIERS = ["common", "basic", "advanced"] as const;

export type Status = "new" | "learning" | "familiar" | "mastered";

export const LANGUAGES: { code: string; name: string }[] = [
  { code: "", name: "Off" },
  { code: "te", name: "Telugu" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "bn", name: "Bengali" },
  { code: "gu", name: "Gujarati" },
];

export const THEMES = [
  "praise & approval", "criticism & disapproval", "speech & talkativeness", "honesty & deception",
  "courage & fear", "generosity & greed", "pride & humility", "anger & calm", "change & stability",
  "knowledge & learning", "size & quantity", "difficulty & ease", "agreement & conflict",
  "time & duration", "emotion & mood", "behavior & character", "science & nature",
  "society & government", "economy & business", "logic & argument", "other",
];
