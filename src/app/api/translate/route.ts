import { claude, clip, env, handle, json } from "@/lib/server";
import { LANGUAGES } from "@/lib/types";

export const POST = handle(async (req) => {
  const b = await req.json();
  const lang = String(b.lang ?? "");
  const name = LANGUAGES.find((l) => l.code === lang && l.code)?.name;
  if (!name) return json({ error: "Unsupported language" }, 400);
  const word = clip(b.word, 40);
  const definition = clip(b.definition, 200);

  if (env.sarvamKey) {
    const r = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "api-subscription-key": env.sarvamKey },
      body: JSON.stringify({
        input: `${word}: ${definition}`,
        source_language_code: "en-IN",
        target_language_code: `${lang}-IN`,
      }),
    });
    if (r.ok) {
      const d = (await r.json()) as { translated_text?: string };
      if (d.translated_text) return json({ text: d.translated_text, by: "sarvam" });
    }
    // fall through to Claude if Sarvam fails
  }
  const text = await claude(
    `You translate English vocabulary meanings into ${name} for a student. Reply with ONLY the ${name} meaning (a few words to one short sentence, in ${name} script), no English, no quotes.`,
    `Word: ${word}\nMeaning: ${definition}`,
    200,
  );
  return json({ text: text.trim(), by: "claude" });
});
