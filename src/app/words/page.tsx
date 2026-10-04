"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { isTricky, statusOf } from "@/lib/srs";
import { THEMES, type Word } from "@/lib/types";
import { PageTitle } from "@/components/ui";
import WordDetail, { StatusPill } from "@/components/WordDetail";
import AddWord from "@/components/AddWord";

export default function Words() {
  const { words, progress } = useApp();
  const [q, setQ] = useState("");
  const [list, setList] = useState("all");
  const [status, setStatus] = useState("all");
  const [theme, setTheme] = useState("all");
  const [open, setOpen] = useState<Word | null>(null);
  const [adding, setAdding] = useState(false);
  const [limit, setLimit] = useState(60);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return words
      .filter((w) => {
        if (list === "all") return true;
        if (list === "mine") return w.custom;
        if (list === "magoosh") return !!w.magoosh;
        if (list.startsWith("mg-")) return w.magoosh === list.slice(3);
        return w.lists.includes(list as "gre");
      })
      .filter((w) => theme === "all" || w.theme === theme)
      .filter((w) => {
        if (status === "all") return true;
        if (status === "tricky") return isTricky(progress[w.id]);
        return statusOf(progress[w.id]) === status;
      })
      .filter((w) => !needle || w.word.includes(needle) || w.definition.toLowerCase().includes(needle) || w.synonyms.some((s) => s.includes(needle)))
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [words, progress, q, list, status, theme]);

  const sel = "input py-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <PageTitle title="Words" sub={`${words.length} words · tap one for details`} />
        <button className="btn btn-primary text-sm" onClick={() => setAdding(true)}>+ Add word</button>
      </div>
      <input className="input" placeholder="Search words, meanings, synonyms…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} />
      <div className="grid grid-cols-3 gap-2">
        <select className={sel} value={list} onChange={(e) => setList(e.target.value)}>
          <option value="all">All lists</option><option value="gre">GRE</option><option value="toefl">TOEFL</option>
          <option value="magoosh">Magoosh 1000</option><option value="mg-common">· Magoosh Common</option>
          <option value="mg-basic">· Magoosh Basic</option><option value="mg-advanced">· Magoosh Advanced</option>
          <option value="mine">My words</option>
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option><option value="new">New</option><option value="learning">Learning</option>
          <option value="familiar">Familiar</option><option value="mastered">Mastered</option><option value="tricky">Tricky 🔥</option>
        </select>
        <select className={sel} value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="all">All themes</option>
          {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="text-xs text-muted">{filtered.length} shown</div>
      <ul className="card divide-y divide-line overflow-hidden">
        {filtered.slice(0, limit).map((w) => (
          <li key={w.id}>
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent-soft/40" onClick={() => setOpen(w)}>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-lg font-semibold">
                  {w.word} <span className="font-sans text-xs font-normal italic text-muted">{w.pos}</span>
                  {w.magoosh && <span className="ml-1.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-accent">M·{w.magoosh}</span>}
                </div>
                <div className="truncate text-sm text-muted">{w.definition}</div>
              </div>
              <StatusPill status={statusOf(progress[w.id])} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="p-6 text-center text-muted">No words match.</li>}
      </ul>
      {filtered.length > limit && <button className="btn btn-ghost w-full" onClick={() => setLimit((l) => l + 100)}>Show more</button>}
      <WordDetail word={open} onClose={() => setOpen(null)} />
      {adding && <AddWord onClose={() => setAdding(false)} />}
    </div>
  );
}
