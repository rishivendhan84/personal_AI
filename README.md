# PAIOS — Personal AI Operating System

A single-user command center that **captures everything, files it automatically,
remembers it, and actively directs your day toward action**. Built per the PAIOS
PRD v2: capture → direct → execute → report → adapt.

> The seven cards are the *substrate*. The **Direction Engine** is the product.

## Stack ($0/month for one user)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind · shadcn-style UI |
| Backend | Next.js route handlers (one self-contained route per card) |
| Database | Supabase Postgres + pgvector |
| Scheduler + queue | Upstash QStash (also solves async capture) |
| Capture | Telegram Bot API (text + voice) |
| AI — STT | Groq Whisper (primary) → OpenAI whisper-1 (fallback) |
| AI — classify | Groq Llama / Gemini Flash-Lite → gpt-4o-mini |
| AI — brief/Brain | Gemini Flash → gpt-4o |
| Embeddings | Gemini `text-embedding-004` (canonical, 768d) |
| Calendar | Google Calendar API (read-only) |
| Finance | Google Sheets API (deterministic sums) |

**Free-first, OpenAI as paid fallback.** Provider choice lives in exactly one
place — `src/lib/ai/` — behind a thin `primary`/`fallback` interface. No feature
card knows who answered.

## Core principles enforced in code

- **No AI on page load.** Pages read the latest snapshot (`daily_briefs`,
  `finance_snapshots`, `calendar_events`). AI fires only on capture, manual
  refresh, or schedule.
- **AI for fuzzy text → structure; deterministic code for every number.** Net
  worth and prioritization scores are computed in `src/lib/` — never by a model.
- **Env-gated integrations.** Missing keys degrade gracefully (setup hints),
  they never crash a page.
- **Capture is confirmable.** Every auto-filed item replies
  `Logged as Task · This Week · #tag — reply 'fix' to change`.

## Project layout

```
src/
  app/
    page.tsx              Operator dashboard (reads cached brief)
    tasks/ goals/ calendar/ habits/ finance/ brain/
    api/
      telegram/webhook/   inbound capture (validates secret, returns 200, enqueues)
      capture/            async pipeline: STT → classify → file → confirm
      cron/               Direction Engine triggers (brief/midday/slip/evening/context)
      tasks/ goals/ habits/ calendar/ finance/ brain/ reviews/ prioritize/
  lib/
    ai/                   provider abstraction (groq/gemini/openai + failover)
    db/                   supabase clients + typed schema
    prioritization.ts     §8.2 scoring (deterministic, feedback-aware)
    brief.ts              §8.1 daily brief assembly
    telegram.ts queue.ts  transport + QStash
supabase/migrations/      schema + seed
```

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys (all optional; features gate on them)
# apply supabase/migrations/0001_init.sql + 0002_seed.sql to your Supabase project
npm run dev
```

Then point your Telegram bot webhook at `/api/telegram/webhook` (with the secret
token) and schedule the QStash cron triggers against `/api/cron/*`.

See `docs/SETUP.md` for the full integration checklist.
