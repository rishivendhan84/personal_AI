# PAIOS Setup & Integration Checklist

Everything is **env-gated**: with no keys, the app still boots and every page
renders a setup hint instead of crashing. Add integrations incrementally.

## 1. Database (Supabase / Neon)

1. Create a Supabase project (or Neon — avoids inactivity pausing).
2. Run the migrations in order against your database:
   - `supabase/migrations/0001_init.sql` (schema + pgvector)
   - `supabase/migrations/0002_seed.sql` (single user + default habits)
   - `supabase/migrations/0003_match_memory_chunks.sql` (Brain vector RPC)
3. Set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

The seeded user id is `00000000-0000-0000-0000-000000000001` (= `PAIOS_USER_ID`).
Set the user's `telegram_id` so the Direction Engine knows where to send nudges.

## 2. Telegram (capture transport)

1. Create a bot via @BotFather → get `TELEGRAM_BOT_TOKEN`.
2. Pick a random `TELEGRAM_WEBHOOK_SECRET`.
3. Register the webhook (validated on every request, PRD §7.8):
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=$NEXT_PUBLIC_APP_URL/api/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
4. Send your bot a message; copy your chat id into `users.telegram_id`.

## 3. AI providers (free-first, OpenAI fallback)

- `GROQ_API_KEY` — Whisper STT + Llama classify (free tier).
- `GEMINI_API_KEY` — brief/Brain reasoning + **canonical embeddings** (768d).
- `OPENAI_API_KEY` — optional reliability fallback only.

Provider choice lives solely in `src/lib/ai/`. The embedding column is locked to
768 dims (Gemini `text-embedding-004`) — **do not swap embedders mid-corpus**.

## 4. Scheduler + queue (QStash)

`QSTASH_TOKEN` powers async capture and the Direction Engine. Without it, capture
falls back to inline fetch (fine for local/dev).

Schedule these cron triggers (times in your TZ) to hit your deployed routes:

| Schedule | Endpoint |
|---|---|
| `0 7 * * *`  | `POST /api/cron/brief` |
| `0 13 * * *` | `POST /api/cron/midday` |
| `0 * * * *`  | `POST /api/cron/slip` |
| `0 21 * * *` | `POST /api/cron/evening` |
| `*/30 * * * *` | `POST /api/cron/context` |
| `0 6 * * *`  | `POST /api/finance/refresh` (+ a daily DB ping to keep Supabase awake) |
| `0 */2 * * *`| `POST /api/calendar/sync` |

Example (QStash):
```bash
curl -XPOST "https://qstash.upstash.io/v2/schedules/$NEXT_PUBLIC_APP_URL/api/cron/brief" \
  -H "Authorization: Bearer $QSTASH_TOKEN" -H "Upstash-Cron: 0 7 * * *"
```

## 5. Google Calendar (read-only) & Google Sheets (finance)

1. Create an OAuth client (Desktop or Web) in Google Cloud → `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`.
2. Do the one-time consent to obtain a `GOOGLE_REFRESH_TOKEN` with scopes:
   `calendar.readonly` and `spreadsheets.readonly`.
3. Set `GOOGLE_CALENDAR_ID` (default `primary`).
4. For finance, set `GOOGLE_SHEETS_SPREADSHEET_ID` and `GOOGLE_SHEETS_RANGE`
   (columns: Date, Description, Amount, Type [asset/liability/income/expense],
   Category). **All numbers are summed deterministically in code** — AI only
   labels uncategorized rows.

## 6. Deploy (Vercel)

- Import the repo, set all env vars, deploy.
- Add a daily DB-ping cron (or use Neon) to avoid Supabase free-tier pausing.

## Verifying the loop

1. Text your bot "remind me to prep for the AWS interview tomorrow".
2. You should get back `Logged as Task · This Week · #interview — reply 'fix'…`.
3. Open `/` — the task appears in top-3 after the next brief (or hit *Generate
   brief* / `POST /api/cron/brief`).
4. Answer the evening review → tomorrow's ranking adapts (`daily_reviews`).
