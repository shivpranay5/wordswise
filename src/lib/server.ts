import "server-only";
import { createClient } from "@supabase/supabase-js";

export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
  azureSpeechKey: process.env.AZURE_SPEECH_KEY ?? "",
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION ?? "",
  sarvamKey: process.env.SARVAM_API_KEY ?? "",
  accessCode: process.env.APP_ACCESS_CODE ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/**
 * Protects paid API routes. With Supabase configured, the caller must be signed in.
 * Without Supabase, set APP_ACCESS_CODE so strangers can't spend your credits.
 */
export async function guard(req: Request): Promise<Response | null> {
  if (env.supabaseUrl && env.supabaseAnon) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Please sign in." }, 401);
    const sb = createClient(env.supabaseUrl, env.supabaseAnon);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return json({ error: "Session expired — sign in again." }, 401);
    return null;
  }
  if (env.accessCode && req.headers.get("x-access-code") !== env.accessCode) {
    return json({ error: "Enter the access code in Settings to use AI features." }, 401);
  }
  return null;
}

export function clip(s: unknown, max: number): string {
  return String(s ?? "").slice(0, max);
}

export async function claude(system: string, user: string, maxTokens = 800): Promise<string> {
  if (!env.anthropicKey) throw new Error("AI is not configured (ANTHROPIC_API_KEY missing).");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Anthropic API error ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = (await r.json()) as { content: { type: string; text?: string }[] };
  return data.content.map((c) => c.text ?? "").join("");
}

export function extractJSON<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("AI returned an unexpected answer. Try again.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export async function claudeJSON<T>(system: string, user: string, maxTokens = 1200): Promise<T> {
  const text = await claude(system + "\nRespond with JSON only, no prose, no code fences.", user, maxTokens);
  return extractJSON<T>(text);
}

export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const denied = await guard(req);
    if (denied) return denied;
    try {
      return await fn(req);
    } catch (e) {
      return json({ error: (e as Error).message || "Something went wrong" }, 500);
    }
  };
}
