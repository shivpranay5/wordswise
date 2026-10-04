"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { dayKey } from "@/lib/srs";
import { daysUntil, statusCounts, streak } from "@/lib/stats";
import { GameGrid, Progressbar } from "@/components/ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { settings, logs, dueWords, newWordsToday, activeWords, progress } = useApp();
  const due = dueWords().length;
  const fresh = newWordsToday().length;
  const today = logs[dayKey()];
  const s = streak(logs);
  const counts = statusCounts(activeWords, progress);
  const left = daysUntil(settings.examDate);
  const doneToday = due === 0 && fresh === 0 && (today?.reviews ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{greeting()}{settings.name ? `, ${settings.name}` : ""}</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {doneToday ? "All done for today 🎉" : "Today’s words are ready"}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <div className="text-2xl font-semibold">🔥 {s}</div>
          <div className="text-xs text-muted">day streak</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-semibold">{counts.mastered}</div>
          <div className="text-xs text-muted">mastered</div>
        </div>
        <Link href="/settings" className="card p-3">
          <div className="text-2xl font-semibold">{left === null ? "—" : left < 0 ? "✓" : left}</div>
          <div className="text-xs text-muted">{left === null ? "set exam date" : `days to ${settings.examName}`}</div>
        </Link>
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Daily session</div>
            <div className="mt-1 text-lg">
              <b>{due}</b> to review · <b>{fresh}</b> new
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            today: {today?.reviews ?? 0} cards
            <br />
            {today ? Math.round((today.correct / Math.max(1, today.correct + today.wrong)) * 100) : 0}% correct
          </div>
        </div>
        <Progressbar value={today?.newLearned ?? 0} max={settings.dailyNew} />
        <Link href="/study" className={`btn w-full ${due + fresh ? "btn-primary" : "btn-ghost"}`}>
          {due + fresh ? "Start today’s session" : "Nothing due — study extra words"}
        </Link>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Practice & play</h2>
        <GameGrid />
      </div>

      <div className="card p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold">Your word list</span>
          <span className="text-muted">
            {activeWords.length - counts.new} / {activeWords.length} started
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-line">
          {(["mastered", "familiar", "learning"] as const).map((k) => (
            <div
              key={k}
              className={k === "mastered" ? "bg-good" : k === "familiar" ? "bg-sky-500" : "bg-amber-500"}
              style={{ width: `${(counts[k] / Math.max(1, activeWords.length)) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted">
          <span>🟢 mastered {counts.mastered}</span>
          <span>🔵 familiar {counts.familiar}</span>
          <span>🟠 learning {counts.learning}</span>
        </div>
      </div>
    </div>
  );
}
