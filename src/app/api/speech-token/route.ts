import { env, handle, json } from "@/lib/server";

// Issues a short-lived (10 min) Azure Speech token so the key never reaches the browser.
export const POST = handle(async () => {
  if (!env.azureSpeechKey || !env.azureSpeechRegion) return json({ error: "Speaking practice is not configured (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)." }, 501);
  const r = await fetch(`https://${env.azureSpeechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": env.azureSpeechKey },
  });
  if (!r.ok) return json({ error: `Azure token error ${r.status}` }, 502);
  return json({ token: await r.text(), region: env.azureSpeechRegion });
});
