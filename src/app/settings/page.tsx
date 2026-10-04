"use client";

import { useApp } from "@/lib/app-context";
import { supabaseEnabled } from "@/lib/supabase";
import { LANGUAGES } from "@/lib/types";
import { PageTitle } from "@/components/ui";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <div className="sm:w-56">{children}</div>
    </label>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, features, session, signOut, resetProgress } = useApp();
  const toggleList = (l: "gre" | "toefl") => {
    const has = settings.lists.includes(l);
    const next = has ? settings.lists.filter((x) => x !== l) : [...settings.lists, l];
    if (next.length) updateSettings({ lists: next });
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Settings" />
      <div className="card divide-y divide-line px-5">
        <Row label="Your name">
          <input className="input" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="e.g. Priya" />
        </Row>
        <Row label="Word lists" hint="Which words appear in your daily sessions">
          <div className="flex gap-2">
            {(["gre", "toefl"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleList(l)}
                className={`btn flex-1 border text-sm ${settings.lists.includes(l) ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Magoosh 1000 first" hint="New words come from Magoosh Common → Basic → Advanced before other words">
          <button
            type="button"
            onClick={() => updateSettings({ magooshFirst: !settings.magooshFirst })}
            className={`btn w-full border text-sm ${settings.magooshFirst ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
          >
            {settings.magooshFirst ? "On" : "Off"}
          </button>
        </Row>
        <Row label="New words per day" hint="15–20 is a good pace; reviews add up over time">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={40}
              step={5}
              value={settings.dailyNew}
              onChange={(e) => updateSettings({ dailyNew: Number(e.target.value) })}
              className="flex-1 accent-[var(--accent)]"
            />
            <span className="w-8 text-right font-semibold tabular-nums">{settings.dailyNew}</span>
          </div>
        </Row>
        <Row label="Exam">
          <div className="flex gap-2">
            <select className="input w-24" value={settings.examName} onChange={(e) => updateSettings({ examName: e.target.value })}>
              <option>GRE</option>
              <option>TOEFL</option>
            </select>
            <input className="input" type="date" value={settings.examDate} onChange={(e) => updateSettings({ examDate: e.target.value })} />
          </div>
        </Row>
        <Row label="Meaning in my language" hint={features.sarvam ? "Translated by Sarvam AI" : features.ai ? "Translated by Claude" : "Needs an AI key on the server"}>
          <select className="input" value={settings.language} onChange={(e) => updateSettings({ language: e.target.value })}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </Row>
        {features.accessCodeRequired && (
          <Row label="Access code" hint="Unlocks the AI features on this device">
            <input className="input" value={settings.accessCode} onChange={(e) => updateSettings({ accessCode: e.target.value })} />
          </Row>
        )}
      </div>

      <div className="card space-y-2 p-5 text-sm">
        <div className="font-semibold">Features</div>
        <div>{features.ai ? "✅" : "⚪️"} AI tutor, sentence grading, mock tests (Anthropic)</div>
        <div>{features.speech ? "✅" : "⚪️"} Pronunciation scoring (Azure Speech)</div>
        <div>{features.sarvam ? "✅" : "⚪️"} Indian-language meanings (Sarvam AI)</div>
        <div>{supabaseEnabled ? "✅ Progress syncs to your account" : "⚪️ Progress is saved on this device only"}</div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="text-sm font-semibold">Install on your phone</div>
        <p className="text-sm text-muted">
          iPhone: open in Safari → Share → <b>Add to Home Screen</b>. Android: Chrome menu → <b>Install app</b>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {session && (
          <button className="btn btn-ghost" onClick={signOut}>
            Sign out ({session.user.email})
          </button>
        )}
        <button
          className="btn btn-ghost text-bad"
          onClick={() => {
            if (confirm("Erase all study progress and streaks? This can't be undone.")) resetProgress();
          }}
        >
          Reset progress
        </button>
      </div>
    </div>
  );
}
