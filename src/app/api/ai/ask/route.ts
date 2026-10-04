import { claude, clip, handle, json } from "@/lib/server";

export const POST = handle(async (req) => {
  const b = await req.json();
  const answer = await claude(
    "You are a warm, concise vocabulary tutor helping a student prepare for the GRE and TOEFL. Answer in under 120 words. Use plain text (no markdown headers); short lists with '-' are fine.",
    `Word: ${clip(b.word, 40)} (${clip(b.definition, 200)})\nStudent's question: ${clip(b.question, 300)}`,
    400,
  );
  return json({ answer: answer.trim() });
});
