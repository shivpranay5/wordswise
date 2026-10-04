import { claudeJSON, handle, json } from "@/lib/server";

interface Q {
  type: "tc" | "se";
  sentence: string;
  options: string[];
  answers: number[];
  explanation: string;
  target: string;
}

export const POST = handle(async (req) => {
  const b = await req.json();
  const words: { word: string; definition: string }[] = (Array.isArray(b.words) ? b.words : [])
    .slice(0, 10)
    .map((w: { word: unknown; definition: unknown }) => ({ word: String(w.word).slice(0, 40), definition: String(w.definition).slice(0, 160) }));
  if (words.length < 3) return json({ error: "Study a few more words first." }, 400);
  const r = await claudeJSON<{ questions: Q[] }>(
    "You write realistic GRE Verbal questions.",
    `Write ${words.length} GRE questions, one per target word below, alternating types.
- "tc" (Text Completion, one blank): a 1-2 sentence passage with "_____", 5 options (single words), exactly 1 correct = the target word (or a form of it).
- "se" (Sentence Equivalence): one sentence with "_____", 6 options, exactly 2 correct that give the same meaning; one of them is the target word.
Distractors must be plausible GRE words. Shuffle option order.
Targets: ${JSON.stringify(words)}
Return {"questions":[{"type":"tc"|"se","sentence":"...","options":[...],"answers":[indexes of correct options],"explanation":"1-2 sentences on the context clue","target":"the target word"}]}`,
    3500,
  );
  const qs = (r.questions ?? []).filter(
    (q) => Array.isArray(q.options) && Array.isArray(q.answers) && q.answers.length >= 1 && q.answers.every((a) => a >= 0 && a < q.options.length),
  );
  return json({ questions: qs });
});
