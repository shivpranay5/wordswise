import { claudeJSON, clip, handle, json } from "@/lib/server";
import { THEMES } from "@/lib/types";

export const POST = handle(async (req) => {
  const b = await req.json();
  const word = clip(b.word, 40).trim();
  if (!/^[a-zA-Z][a-zA-Z' -]*$/.test(word)) return json({ error: "Please enter a single English word." }, 400);
  const w = await claudeJSON<Record<string, unknown>>(
    "You write vocabulary flashcards for GRE/TOEFL students.",
    `Create a flashcard for the English word "${word}". If it is misspelled, use the correct spelling. Return:
{"word": lowercase base form, "pos": "noun|verb|adjective|adverb", "definition": plain English, max 15 words,
"examples": [2 natural sentences, 10-22 words, context reveals meaning],
"cloze": "a third sentence with the word (or inflected form) wrapped once in {{ }}",
"synonyms": [2-4], "antonyms": [0-3], "mnemonic": "short memory trick, max 20 words",
"difficulty": 1-3, "theme": one of ${JSON.stringify(THEMES)}}`,
    700,
  );
  const cloze = String(w.cloze ?? "");
  return json({
    word: String(w.word ?? word).toLowerCase(),
    pos: String(w.pos ?? ""),
    definition: String(w.definition ?? ""),
    examples: Array.isArray(w.examples) ? w.examples.map(String).slice(0, 2) : [],
    cloze: /\{\{.+?\}\}/.test(cloze) ? cloze : `{{${word}}}`,
    synonyms: Array.isArray(w.synonyms) ? w.synonyms.map(String).slice(0, 4) : [],
    antonyms: Array.isArray(w.antonyms) ? w.antonyms.map(String).slice(0, 3) : [],
    mnemonic: String(w.mnemonic ?? ""),
    difficulty: Number(w.difficulty) || 2,
    theme: THEMES.includes(String(w.theme)) ? String(w.theme) : "other",
  });
});
