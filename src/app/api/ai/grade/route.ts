import { claudeJSON, clip, handle, json } from "@/lib/server";

export const POST = handle(async (req) => {
  const b = await req.json();
  const r = await claudeJSON<{ correct: boolean; score: number; feedback: string; improved: string }>(
    "You are an encouraging but honest English tutor grading a GRE/TOEFL student's sentence.",
    `Target word: "${clip(b.word, 40)}" meaning: ${clip(b.definition, 200)}
Student's sentence: """${clip(b.sentence, 400)}"""

Judge whether the word is used with the correct meaning, correct part of speech and natural grammar.
Return {"correct": true/false (meaning and usage right), "score": 1-5 (5 = flawless and natural), "feedback": "1-3 short sentences, kind and specific", "improved": "a polished version of HER sentence (keep her idea)"}`,
    500,
  );
  return json({
    correct: Boolean(r.correct),
    score: Math.max(1, Math.min(5, Number(r.score) || 1)),
    feedback: String(r.feedback ?? ""),
    improved: String(r.improved ?? ""),
  });
});
