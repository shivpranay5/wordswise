# WordWise — GRE & TOEFL vocabulary trainer

A daily vocabulary app: spaced-repetition flashcards, 5 games, an AI tutor, speaking practice, mock GRE questions, and progress tracking. Installs on a phone like an app.

**1,054 words included** (775 GRE + 290 TOEFL, some on both), each with a definition, 2 examples, a fill-in-the-blank sentence, synonyms and antonyms, a memory tip and a theme.

## What's inside

| Feature | Where | Needs |
|---|---|---|
| Daily session: due reviews + N new words (SM-2 spaced repetition, Again/Hard/Good/Easy) | `/study` | — |
| Multiple choice, Fill-in-the-blank, Synonym match, Spelling scramble, 60s Speed round | `/play/*` | — |
| Word browser: search, filter by list/status/theme, pronunciation, "tricky words" | `/words` | — |
| Progress: streak, study calendar, mastery per list, 7-day review forecast | `/stats` | — |
| Exam countdown, daily goal, list choice | `/settings` | — |
| Login + sync across devices | — | Supabase |
| AI tutor ("ask anything about this word"), custom words filled in automatically | word sheet / Add word | Anthropic |
| "Use it in a sentence", graded by AI | `/sentence` | Anthropic |
| GRE mock test (Text Completion + Sentence Equivalence) from her weakest words | `/mock` | Anthropic (offline version without) |
| Pronunciation scoring (accuracy / fluency / per-word colors) | `/speak` | Azure Speech |
| Meaning in Telugu, Hindi, Tamil… | flashcard back / word sheet | Sarvam (or Anthropic) |
| Offline + "Add to Home Screen" | PWA | — |

Missed answers in any game go back into that day's review pile, so games and flashcards stay connected.

## 1. Run it locally (2 minutes)

```bash
npm install
npm run dev        # http://localhost:3000
```
It works immediately, saving progress in the browser. Add keys whenever you're ready.

## 2. Supabase (login + sync), about 5 minutes

1. Go to supabase.com → **New project**.
2. **SQL Editor** → paste `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Authentication → Sign In / Providers → Email**: turning off **Confirm email** is easiest for a family app. Otherwise your sister clicks the link in her inbox once.

## 3. Other keys (all optional)

Copy `.env.example` to `.env.local` and fill in what you have:

- **Anthropic**: console.anthropic.com → API Keys. The default model is `claude-haiku-4-5` (cheap and fast). One student costs cents per month.
- **Azure Speech**: Azure Portal → Create resource → **Speech** → **Keys and Endpoint**. Use KEY 1 and the Region (e.g. `eastus`). The free F0 tier is enough.
- **Sarvam**: dashboard.sarvam.ai → API key.

Keys stay on the server. The browser only receives short-lived tokens. With Supabase on, the AI routes require a signed-in user.

## 4. Deploy

**Vercel (fastest):** push to GitHub → vercel.com → Import → add the env vars → Deploy.

**Azure (uses your credits):** Azure Portal → **Static Web Apps** → Create → connect the GitHub repo → Build preset **Next.js** → add the env vars under *Configuration*. Or use **App Service** (Node 20+) with `npm run build && npm start`.

> No Supabase in production? Set `APP_ACCESS_CODE` so strangers can't use your AI credits. Your sister enters the code once in Settings.

## 5. Install on her phone

Open the deployed URL →
- **iPhone:** Safari → Share → **Add to Home Screen**
- **Android:** Chrome → ⋮ → **Install app**

## Add more words

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-words.mjs more-words.txt gre
```
`more-words.txt` is one word per line. Words already in the list are skipped. She can also add single words from the app (Words → **+ Add word**).

## Project map

```
src/lib/srs.ts           spaced-repetition scheduler
src/lib/app-context.tsx  state, daily queue, sync
src/lib/store.ts         browser storage / Supabase storage
src/lib/server.ts        API auth guard + Claude helper
src/app/api/*            AI, translation, speech-token routes
public/data/words.json   the word list
supabase/schema.sql      database tables + row-level security
```
