import { env } from "@/lib/server";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ai: Boolean(env.anthropicKey),
    speech: Boolean(env.azureSpeechKey && env.azureSpeechRegion),
    sarvam: Boolean(env.sarvamKey),
    accessCodeRequired: Boolean(env.accessCode) && !(env.supabaseUrl && env.supabaseAnon),
  });
}
