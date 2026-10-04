"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseEnabled } from "./supabase";
import { localStore, supabaseStore, type Store } from "./store";
import { dayKey, isDue, practiceUpdate, schedule, statusOf, type Grade } from "./srs";
import { DEFAULT_SETTINGS, type DayLog, type Progress, type Settings, type Word } from "./types";

export interface Features {
  ai: boolean;
  speech: boolean;
  sarvam: boolean;
  accessCodeRequired: boolean;
}

interface AppState {
  ready: boolean;
  needsLogin: boolean;
  session: Session | null;
  words: Word[]; // all words (built-in + custom)
  activeWords: Word[]; // words in the selected lists + custom
  byId: Record<string, Word>;
  progress: Record<string, Progress>;
  logs: Record<string, DayLog>;
  settings: Settings;
  features: Features;
  syncError: string | null;
  review: (wordId: string, grade: Grade) => { requeue: boolean };
  practice: (wordId: string, correct: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addCustom: (w: Word) => Promise<void>;
  deleteCustom: (id: string) => Promise<void>;
  resetProgress: () => Promise<void>;
  signOut: () => Promise<void>;
  dueWords: () => Word[];
  /** next new words in study order; with a limit, ignores the daily goal */
  newWordsToday: (limit?: number) => Word[];
  practicePool: (n: number) => Word[];
  api: <T>(path: string, body: unknown) => Promise<T>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

function emptyLog(date: string): DayLog {
  return { date, reviews: 0, newLearned: 0, correct: 0, wrong: 0 };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [builtIn, setBuiltIn] = useState<Word[] | null>(null);
  const [custom, setCustom] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(!supabaseEnabled);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [features, setFeatures] = useState<Features>({ ai: false, speech: false, sarvam: false, accessCodeRequired: false });
  const storeRef = useRef<Store | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const logsRef = useRef(logs);
  logsRef.current = logs;

  // Built-in word list
  useEffect(() => {
    fetch("/data/words.json")
      .then((r) => r.json())
      .then((w: Word[]) => setBuiltIn(w))
      .catch(() => setBuiltIn([]));
    fetch("/api/config")
      .then((r) => r.json())
      .then(setFeatures)
      .catch(() => {});
  }, []);

  // Auth
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Load user data
  useEffect(() => {
    if (!authChecked) return;
    let store: Store;
    if (supabaseEnabled) {
      if (!userId) {
        storeRef.current = null;
        setLoaded(false);
        return;
      }
      store = supabaseStore(getSupabase()!, userId);
    } else {
      store = localStore();
    }
    storeRef.current = store;
    let cancelled = false;
    store
      .load()
      .then((snap) => {
        if (cancelled) return;
        setProgress(snap.progress);
        setLogs(snap.logs);
        setCustom(snap.custom);
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.settings ?? {}) });
        setLoaded(true);
      })
      .catch((e) => {
        setSyncError(String(e?.message ?? e));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authChecked, userId]);

  const persist = useCallback((fn: (s: Store) => Promise<void>) => {
    const s = storeRef.current;
    if (!s) return;
    fn(s)
      .then(() => setSyncError(null))
      .catch((e) => setSyncError(String(e?.message ?? e)));
  }, []);

  const bumpLog = useCallback(
    (patch: Partial<Omit<DayLog, "date">>) => {
      const key = dayKey();
      const cur = logsRef.current[key] ?? emptyLog(key);
      const next: DayLog = {
        ...cur,
        reviews: cur.reviews + (patch.reviews ?? 0),
        newLearned: cur.newLearned + (patch.newLearned ?? 0),
        correct: cur.correct + (patch.correct ?? 0),
        wrong: cur.wrong + (patch.wrong ?? 0),
      };
      logsRef.current = { ...logsRef.current, [key]: next };
      setLogs(logsRef.current);
      persist((s) => s.saveLog(next));
    },
    [persist],
  );

  const setOneProgress = useCallback(
    (p: Progress) => {
      progressRef.current = { ...progressRef.current, [p.wordId]: p };
      setProgress(progressRef.current);
      persist((s) => s.saveProgress(p));
    },
    [persist],
  );

  const review = useCallback(
    (wordId: string, grade: Grade) => {
      const prev = progressRef.current[wordId];
      const { progress: p, requeue } = schedule(prev, wordId, grade);
      setOneProgress(p);
      bumpLog({
        reviews: 1,
        newLearned: prev ? 0 : 1,
        correct: grade > 1 ? 1 : 0,
        wrong: grade === 1 ? 1 : 0,
      });
      return { requeue };
    },
    [setOneProgress, bumpLog],
  );

  const practice = useCallback(
    (wordId: string, correct: boolean) => {
      const prev = progressRef.current[wordId];
      setOneProgress(practiceUpdate(prev, wordId, correct));
      bumpLog({ correct: correct ? 1 : 0, wrong: correct ? 0 : 1, newLearned: prev ? 0 : 1 });
    },
    [setOneProgress, bumpLog],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((cur) => {
        const next = { ...cur, ...patch };
        persist((s) => s.saveSettings(next));
        return next;
      });
    },
    [persist],
  );

  const addCustom = useCallback(
    async (w: Word) => {
      setCustom((c) => [...c.filter((x) => x.id !== w.id), w]);
      persist((s) => s.saveCustom(w));
    },
    [persist],
  );

  const deleteCustom = useCallback(
    async (id: string) => {
      setCustom((c) => c.filter((x) => x.id !== id));
      const { [id]: _, ...rest } = progressRef.current;
      void _;
      progressRef.current = rest;
      setProgress(rest);
      persist((s) => s.deleteCustom(id));
    },
    [persist],
  );

  const resetProgress = useCallback(async () => {
    progressRef.current = {};
    logsRef.current = {};
    setProgress({});
    setLogs({});
    persist((s) => s.reset());
  }, [persist]);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
  }, []);

  const words = useMemo(() => [...(builtIn ?? []), ...custom], [builtIn, custom]);
  const byId = useMemo(() => Object.fromEntries(words.map((w) => [w.id, w])), [words]);
  const activeWords = useMemo(
    () => words.filter((w) => w.custom || w.lists.some((l) => (settings.lists as string[]).includes(l))),
    [words, settings.lists],
  );

  const dueWords = useCallback(() => {
    const now = new Date();
    return Object.values(progress)
      .filter((p) => isDue(p, now) && byId[p.wordId])
      .sort((a, b) => a.due.localeCompare(b.due))
      .map((p) => byId[p.wordId]);
  }, [progress, byId]);

  const newWordsToday = useCallback(
    (limit?: number) => {
      const learnedToday = logs[dayKey()]?.newLearned ?? 0;
      const remaining = limit ?? Math.max(0, settings.dailyNew - learnedToday);
      if (!remaining) return [];
      const TIER: Record<string, number> = { common: 0, basic: 1, advanced: 2 };
      const rank = (w: Word) => (settings.magooshFirst && w.magoosh ? TIER[w.magoosh] : settings.magooshFirst ? 3 : 0);
      const fresh = activeWords.filter((w) => !progress[w.id]);
      // her own words first
      const ordered: Word[] = fresh.filter((w) => w.custom);
      let rest = fresh
        .filter((w) => !w.custom)
        .sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty || a.theme.localeCompare(b.theme) || a.word.localeCompare(b.word));
      // learn related words together: take theme blocks from the current tier
      while (ordered.length < remaining && rest.length) {
        const first = rest[0];
        const block = rest.filter((w) => rank(w) === rank(first) && w.theme === first.theme);
        ordered.push(...block);
        const ids = new Set(block.map((w) => w.id));
        rest = rest.filter((w) => !ids.has(w.id));
      }
      return ordered.slice(0, remaining);
    },
    [activeWords, progress, logs, settings.dailyNew, settings.magooshFirst],
  );

  const practicePool = useCallback(
    (n: number) => {
      const seen = Object.values(progress)
        .filter((p) => byId[p.wordId])
        .sort((a, b) => b.wrong - b.correct - (a.wrong - a.correct) || a.due.localeCompare(b.due));
      // weakest half + random others, so games focus on what she's studying
      const weak = seen.slice(0, Math.ceil(n / 2)).map((p) => byId[p.wordId]);
      const others = shuffle(seen.slice(Math.ceil(n / 2)).map((p) => byId[p.wordId]));
      let pool = [...weak, ...others].slice(0, n);
      if (pool.length < n) {
        const ids = new Set(pool.map((w) => w.id));
        const fresh = shuffle(activeWords.filter((w) => !ids.has(w.id))).slice(0, n - pool.length);
        pool = [...pool, ...fresh];
      }
      return shuffle(pool);
    },
    [progress, byId, activeWords],
  );

  const api = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`;
      if (settings.accessCode) headers["x-access-code"] = settings.accessCode;
      const r = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
      return data as T;
    },
    [session, settings.accessCode],
  );

  const needsLogin = supabaseEnabled && authChecked && !session;
  const ready = builtIn !== null && authChecked && (needsLogin || loaded);

  const value: AppState = {
    ready,
    needsLogin,
    session,
    words,
    activeWords,
    byId,
    progress,
    logs,
    settings,
    features,
    syncError,
    review,
    practice,
    updateSettings,
    addCustom,
    deleteCustom,
    resetProgress,
    signOut,
    dueWords,
    newWordsToday,
    practicePool,
    api,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { statusOf };
