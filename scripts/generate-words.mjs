#!/usr/bin/env node
// Add more words to public/data/words.json using your Anthropic API key.
//
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-words.mjs my-words.txt gre
//
// my-words.txt: one word per line. Second argument: gre | toefl (which list to tag them with).
// Words already in the file are skipped. Runs 5 requests at a time.
import fs from "node:fs";

const [, , file, list = "gre"] = process.argv;
const key = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
if (!file || !key) {
  console.error("Usage: ANTHROPIC_API_KEY=... node scripts/generate-words.mjs words.txt [gre|toefl]");
  process.exit(1);
}
const THEMES = ["praise & approval","criticism & disapproval","speech & talkativeness","honesty & deception","courage & fear","generosity & greed","pride & humility","anger & calm","change & stability","knowledge & learning","size & quantity","difficulty & ease","agreement & conflict","time & duration","emotion & mood","behavior & character","science & nature","society & government","economy & business","logic & argument","other"];
const out = "public/data/words.json";
const data = JSON.parse(fs.readFileSync(out, "utf8"));
const have = new Map(data.map((w) => [w.word, w]));
const todo = [...new Set(fs.readFileSync(file, "utf8").split(/\r?\n/).map((s) => s.trim().toLowerCase()).filter(Boolean))];

async function make(word) {
  const prompt = `Create a ${list.toUpperCase()} vocabulary flashcard for "${word}". Return JSON only:
{"word":"${word}","pos":"noun|verb|adjective|adverb","definition":"plain English, max 15 words","examples":["2 natural sentences, 10-22 words, context reveals meaning"],"cloze":"a third sentence with the word (or inflected form) wrapped once in {{ }}","synonyms":["2-4"],"antonyms":["0-3"],"mnemonic":"max 20 words","difficulty":1,"theme":"one of ${JSON.stringify(THEMES)}"}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const text = (await r.json()).content.map((c) => c.text ?? "").join("");
  const w = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  if (!/\{\{.+?\}\}/.test(w.cloze)) throw new Error("bad cloze");
  return {
    id: word.replace(/[^a-z0-9]+/g, "-"), word, pos: w.pos, definition: w.definition, examples: w.examples.slice(0, 2),
    cloze: w.cloze, synonyms: w.synonyms ?? [], antonyms: w.antonyms ?? [], mnemonic: w.mnemonic ?? "",
    difficulty: Number(w.difficulty) || 2, theme: THEMES.includes(w.theme) ? w.theme : "other", lists: [list],
  };
}

let added = 0;
const queue = todo.filter((w) => {
  const existing = have.get(w);
  if (existing) { if (!existing.lists.includes(list)) existing.lists.push(list); return false; }
  return true;
});
console.log(`${queue.length} new words to generate (${todo.length - queue.length} already present)`);
async function worker() {
  while (queue.length) {
    const word = queue.shift();
    for (let attempt = 0; attempt < 2; attempt++) {
      try { const w = await make(word); data.push(w); have.set(word, w); added++; console.log("✓", word); break; }
      catch (e) { if (attempt) console.warn("✗", word, e.message.slice(0, 120)); }
    }
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
data.sort((a, b) => a.word.localeCompare(b.word));
fs.writeFileSync(out, JSON.stringify(data));
console.log(`Added ${added}. Total words: ${data.length}`);
