import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayLog, Progress, Settings, Word } from "./types";

export interface Snapshot {
  progress: Record<string, Progress>;
  logs: Record<string, DayLog>;
  settings: Settings | null;
  custom: Word[];
}

export interface Store {
  load(): Promise<Snapshot>;
  saveProgress(p: Progress): Promise<void>;
  saveLog(l: DayLog): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  saveCustom(w: Word): Promise<void>;
  deleteCustom(id: string): Promise<void>;
  reset(): Promise<void>;
}

/* ---------------- Browser-only store (no account) ---------------- */

const KEY = "vocab:v1";

function readLocal(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Snapshot;
  } catch {
    /* ignore */
  }
  return { progress: {}, logs: {}, settings: null, custom: [] };
}

function writeLocal(s: Snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

export function localStore(): Store {
  let snap: Snapshot = { progress: {}, logs: {}, settings: null, custom: [] };
  return {
    async load() {
      snap = readLocal();
      return snap;
    },
    async saveProgress(p) {
      snap.progress[p.wordId] = p;
      writeLocal(snap);
    },
    async saveLog(l) {
      snap.logs[l.date] = l;
      writeLocal(snap);
    },
    async saveSettings(s) {
      snap.settings = s;
      writeLocal(snap);
    },
    async saveCustom(w) {
      snap.custom = [...snap.custom.filter((c) => c.id !== w.id), w];
      writeLocal(snap);
    },
    async deleteCustom(id) {
      snap.custom = snap.custom.filter((c) => c.id !== id);
      delete snap.progress[id];
      writeLocal(snap);
    },
    async reset() {
      snap = { progress: {}, logs: {}, settings: snap.settings, custom: snap.custom };
      writeLocal(snap);
    },
  };
}

/* ---------------- Supabase store (synced) ---------------- */

async function fetchAll<T>(sb: SupabaseClient, table: string, userId: string): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb
      .from(table)
      .select("data")
      .eq("user_id", userId)
      .range(from, from + page - 1);
    if (error) throw error;
    out.push(...(data ?? []).map((r: { data: T }) => r.data));
    if (!data || data.length < page) break;
  }
  return out;
}

export function supabaseStore(sb: SupabaseClient, userId: string): Store {
  const check = (r: { error: unknown }) => {
    if (r.error) throw r.error;
  };
  return {
    async load() {
      const [progress, logs, custom, settingsRes] = await Promise.all([
        fetchAll<Progress>(sb, "progress", userId),
        fetchAll<DayLog>(sb, "day_logs", userId),
        fetchAll<Word>(sb, "custom_words", userId),
        sb.from("settings").select("data").eq("user_id", userId).maybeSingle(),
      ]);
      return {
        progress: Object.fromEntries(progress.map((p) => [p.wordId, p])),
        logs: Object.fromEntries(logs.map((l) => [l.date, l])),
        custom,
        settings: (settingsRes.data?.data as Settings) ?? null,
      };
    },
    async saveProgress(p) {
      check(
        await sb.from("progress").upsert({ user_id: userId, word_id: p.wordId, due: p.due, data: p, updated_at: new Date().toISOString() }),
      );
    },
    async saveLog(l) {
      check(await sb.from("day_logs").upsert({ user_id: userId, day: l.date, data: l }));
    },
    async saveSettings(s) {
      check(await sb.from("settings").upsert({ user_id: userId, data: s }));
    },
    async saveCustom(w) {
      check(await sb.from("custom_words").upsert({ user_id: userId, id: w.id, data: w }));
    },
    async deleteCustom(id) {
      check(await sb.from("custom_words").delete().eq("user_id", userId).eq("id", id));
      check(await sb.from("progress").delete().eq("user_id", userId).eq("word_id", id));
    },
    async reset() {
      check(await sb.from("progress").delete().eq("user_id", userId));
      check(await sb.from("day_logs").delete().eq("user_id", userId));
    },
  };
}
