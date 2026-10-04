"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { THEMES, type Word } from "@/lib/types";
import { WordBody } from "./WordDetail";

export default function AddWord({ onClose }: { onClose: () => void }) {
  const { features, api, addCustom, byId } = useApp();
  const [word, setWord] = useState("");
  const [preview, setPreview] = useState<Word | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // manual fallback
  const [def, setDef] = useState("");
  const [ex, setEx] = useState("");

  const id = "my-" + word.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const builtInMatch = Object.values(byId).find((w) => !w.custom && w.word === word.trim().toLowerCase());

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const w = await api<Word>("/api/ai/word", { word: word.trim() });
      setPreview({ ...w, id, lists: ["mine"], custom: true });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  function saveManual(e: React.FormEvent) {
    e.preventDefault();
    const wd = word.trim().toLowerCase();
    if (!wd || !def.trim()) return;
    const sentence = ex.trim() || `Today I learned the word ${wd}.`;
    const re = new RegExp(`\\b(${wd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "i");
    const cloze = re.test(sentence) ? sentence.replace(re, "{{$1}}") : `${sentence} ({{${wd}}})`;
    save({ id, word: wd, pos: "", definition: def.trim(), examples: ex.trim() ? [ex.trim()] : [], cloze, synonyms: [], antonyms: [], mnemonic: "", difficulty: 2, theme: "other", lists: ["mine"], custom: true });
  }

  function save(w: Word) {
    addCustom({ ...w, theme: THEMES.includes(w.theme) ? w.theme : "other" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="card pop max-h-[88dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between">
          <h2 className="font-serif text-2xl font-semibold">Add a word</h2>
          <button onClick={onClose} className="text-2xl leading-none text-muted" aria-label="Close">×</button>
        </div>
        <p className="text-sm text-muted">Found a new word while reading? Add it — it’ll be the first new card in your next session.</p>
        {features.ai ? (
          <form onSubmit={generate} className="flex gap-2">
            <input className="input" placeholder="e.g. perspicacious" value={word} onChange={(e) => { setWord(e.target.value); setPreview(null); }} maxLength={40} autoFocus />
            <button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Look up"}</button>
          </form>
        ) : (
          <form onSubmit={saveManual} className="space-y-2">
            <input className="input" placeholder="Word" value={word} onChange={(e) => setWord(e.target.value)} maxLength={40} autoFocus />
            <input className="input" placeholder="Meaning" value={def} onChange={(e) => setDef(e.target.value)} />
            <input className="input" placeholder="Example sentence (optional)" value={ex} onChange={(e) => setEx(e.target.value)} />
            <button className="btn btn-primary w-full">Save word</button>
            <p className="text-xs text-muted">Tip: add an Anthropic API key and this fills itself in automatically.</p>
          </form>
        )}
        {builtInMatch && <p className="text-sm text-muted">“{builtInMatch.word}” is already in the {builtInMatch.lists.join("/").toUpperCase()} list.</p>}
        {err && <p className="text-sm text-bad">{err}</p>}
        {preview && (
          <div className="space-y-3 border-t border-line pt-4">
            <div className="font-serif text-2xl font-semibold">{preview.word} <span className="font-sans text-sm italic text-muted">{preview.pos}</span></div>
            <WordBody w={preview} />
            <button className="btn btn-primary w-full" onClick={() => save(preview)}>Save to my words</button>
          </div>
        )}
      </div>
    </div>
  );
}
