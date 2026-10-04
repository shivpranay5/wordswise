"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { speak } from "@/lib/tts";
import { PageTitle, SpeakButton } from "@/components/ui";
import type { Word } from "@/lib/types";

interface WordScore { word: string; accuracy: number; error: string }
interface Result { accuracy: number; fluency: number; completeness: number; pron: number; words: WordScore[]; heard: string }

function color(s: number) {
  return s >= 85 ? "text-good" : s >= 60 ? "text-amber-600 dark:text-amber-400" : "text-bad";
}

export default function Speak() {
  const { features, practicePool, practice, api } = useApp();
  const [w, setW] = useState<Word | undefined>(() => practicePool(1)[0]);
  const [mode, setMode] = useState<"word" | "sentence">("sentence");
  const [state, setState] = useState<"idle" | "listening" | "done">("idle");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!w) return null;
  const ref = mode === "word" ? w.word : w.examples[0] ?? w.word;

  function another() {
    setW(practicePool(1)[0]);
    setRes(null);
    setErr(null);
    setState("idle");
  }

  async function record() {
    setErr(null);
    setRes(null);
    setState("listening");
    try {
      const { token, region } = await api<{ token: string; region: string }>("/api/speech-token", {});
      const sdk = await import("microsoft-cognitiveservices-speech-sdk");
      const cfg = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      cfg.speechRecognitionLanguage = "en-US";
      const audio = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const rec = new sdk.SpeechRecognizer(cfg, audio);
      const pa = new sdk.PronunciationAssessmentConfig(ref, sdk.PronunciationAssessmentGradingSystem.HundredMark, sdk.PronunciationAssessmentGranularity.Word, true);
      pa.applyTo(rec);
      const result = await new Promise<import("microsoft-cognitiveservices-speech-sdk").SpeechRecognitionResult>((resolve, reject) =>
        rec.recognizeOnceAsync(resolve, reject),
      );
      rec.close();
      if (result.reason !== sdk.ResultReason.RecognizedSpeech) throw new Error("Didn't catch that — check your microphone and try again.");
      const r = sdk.PronunciationAssessmentResult.fromResult(result);
      const words: WordScore[] = (r.detailResult?.Words ?? []).map((x) => ({
        word: x.Word,
        accuracy: Math.round(x.PronunciationAssessment?.AccuracyScore ?? 0),
        error: x.PronunciationAssessment?.ErrorType ?? "None",
      }));
      const out = { accuracy: Math.round(r.accuracyScore), fluency: Math.round(r.fluencyScore), completeness: Math.round(r.completenessScore), pron: Math.round(r.pronunciationScore), words, heard: result.text };
      setRes(out);
      practice(w!.id, out.pron >= 70);
      setState("done");
    } catch (e) {
      setErr((e as Error).message ?? String(e));
      setState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Speaking practice" sub="Read it aloud — get a pronunciation score like the TOEFL speaking section." back="/play" />
      <div className="flex gap-2">
        {(["sentence", "word"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setRes(null); }} className={`btn flex-1 border text-sm ${mode === m ? "border-accent bg-accent-soft text-accent" : "border-line"}`}>
            {m === "word" ? "Just the word" : "Full sentence"}
          </button>
        ))}
      </div>
      <div className="card space-y-3 p-6">
        <div className="flex items-center gap-1 text-sm text-muted">
          <b className="font-serif text-lg text-ink">{w.word}</b> — {w.definition}
        </div>
        <p className="font-serif text-2xl leading-relaxed">{ref}</p>
        <div className="flex items-center gap-2 text-sm text-muted">
          <SpeakButton text={ref} /> Listen first
          <button className="ml-auto underline" onClick={() => speak(ref, 0.7)}>slower</button>
        </div>
      </div>
      {features.speech ? (
        <button className={`btn w-full py-4 text-lg ${state === "listening" ? "animate-pulse bg-bad text-white" : "btn-primary"}`} onClick={record} disabled={state === "listening"}>
          {state === "listening" ? "🎙️ Listening… speak now" : "🎙️ Tap and read aloud"}
        </button>
      ) : (
        <div className="card p-4 text-sm text-muted">
          Pronunciation scoring needs Azure Speech (<code>AZURE_SPEECH_KEY</code> and <code>AZURE_SPEECH_REGION</code>). Until then, use the speaker button to listen and repeat.
        </div>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
      {res && (
        <div className="card pop space-y-4 p-5">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[["Overall", res.pron], ["Accuracy", res.accuracy], ["Fluency", res.fluency], ["Complete", res.completeness]].map(([l, v]) => (
              <div key={l as string}>
                <div className={`text-2xl font-semibold ${color(v as number)}`}>{v}</div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
          </div>
          <p className="flex flex-wrap gap-x-1.5 font-serif text-xl">
            {res.words.map((x, i) => (
              <span key={i} className={color(x.accuracy)} title={`${x.accuracy}${x.error !== "None" ? " · " + x.error : ""}`}>
                {x.word}
              </span>
            ))}
          </p>
          <p className="text-xs text-muted">Green = great, orange = okay, red = practice this one. Tap the speaker to hear it again.</p>
        </div>
      )}
      <button className="btn btn-ghost w-full" onClick={another}>Another word →</button>
    </div>
  );
}
