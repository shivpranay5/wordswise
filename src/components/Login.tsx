"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMsg(null);
    const res =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === "up" && !res.data.session) setMsg("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            Word<span className="text-accent">Wise</span>
          </h1>
          <p className="mt-1 text-sm text-muted">A few words every day, until test day.</p>
        </div>
        <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="input"
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {msg && <p className="text-sm text-bad">{msg}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button type="button" className="w-full text-sm text-muted underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
