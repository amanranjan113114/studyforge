# StudyForge

A full-stack AI study platform. Users sign up, paste or upload a syllabus (text or PDF), and get:

- a structured breakdown (units, topics, subtopics, prerequisites, priority, time estimates)
- a day-by-day study plan built around their exam date and daily hours
- AI-generated quizzes and flashcards for every topic
- progress tracking per topic

## Stack

| Layer | Choice |
|---|---|
| Frontend + backend | Next.js 15 (App Router, TypeScript) |
| Auth | Own implementation: bcrypt password hashes, JWT in an httpOnly cookie, route protection in middleware |
| Database | Postgres via `pg` (Neon free tier recommended). Tables are created automatically |
| AI | Switchable: Anthropic (Claude), OpenAI, or any OpenAI-compatible server |
| PDF text | unpdf |

## Run it

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

1. Set `JWT_SECRET` to a long random string:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
2. Create a free Postgres database at https://neon.tech and paste its connection string into `DATABASE_URL`.
3. Pick a provider with `AI_PROVIDER` and fill in its key.

```bash
npm run dev
```

Open http://localhost:3000, create an account, and add a syllabus.

## Switching AI providers

Change one line in `.env.local`, no code changes:

```
AI_PROVIDER=anthropic          # uses ANTHROPIC_API_KEY, ANTHROPIC_MODEL
AI_PROVIDER=openai             # uses OPENAI_API_KEY, OPENAI_MODEL
AI_PROVIDER=openai-compatible  # Ollama, Groq, OpenRouter, vLLM... uses OPENAI_COMPATIBLE_*
```

For a free local setup, run Ollama and use `openai-compatible` with
`OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1`.

## Project layout

```
src/
  middleware.ts            redirects logged-out users away from protected pages
  lib/
    db.ts                  Postgres pool + auto-created schema (users, subjects, progress, practice)
    auth.ts                password hashing, JWT cookie session, getCurrentUser()
    ai.ts                  provider-agnostic model call + JSON validation with one retry
    prompts.ts             the prompts for structure and practice generation
    schemas.ts             types + zod schemas that validate AI output
    planner.ts             deterministic study-plan builder (no AI call)
    ratelimit.ts           in-memory rate limiting
  app/
    api/auth/*             signup, login, logout
    api/extract            PDF / text file -> plain text
    api/subjects/*         create, delete, rebuild plan, progress, practice
    dashboard, subjects/[id], login, signup
  components/              forms, subject view (structure / plan / practice tabs)
```

## Security notes

- Passwords are hashed with bcrypt (cost 12). The login error is the same for unknown email and wrong password.
- The session cookie is `httpOnly`, `sameSite=lax` and `secure` in production.
- Every subject query is scoped by `user_id`, so users cannot read each other's data.
- Login, signup and AI calls are rate limited. The limiter is in memory, so on serverless hosts like Vercel it only limits per server instance. Use Redis (Upstash) for strict limits.
- In production the app refuses to start without `JWT_SECRET`.
- API keys stay on the server and are never sent to the browser.

## Deploying (Vercel + Neon, both free)

1. Push the project to a GitHub repository. Do not commit `.env.local` (the `.gitignore` already excludes it).
2. Create a Neon project, copy the connection string (with `?sslmode=require`).
3. On https://vercel.com, choose "Add New Project", import the repository, and add these Environment Variables:
   `JWT_SECRET` (a NEW random value, not your local one), `DATABASE_URL`, `AI_PROVIDER`, and your AI key variables.
4. Click Deploy. Open the Vercel URL, sign up, and test.

Notes:
- Vercel limits upload size to about 4.5 MB, so PDF uploads are capped at 4 MB.
- AI generation can take up to a minute. If requests time out on your Vercel plan, use a faster model or lower `maxDuration` in the API routes.
- Any host that runs Node 20+ and can reach Postgres also works (Railway, Render, Fly.io, a VPS).

## Ideas for next steps

- Password reset by email and email verification
- OCR for scanned PDFs
- Streaming AI responses for faster perceived speed
- Spaced-repetition scheduling for flashcards
- An ORM (Drizzle or Prisma) instead of raw SQL
- Tests (Vitest for the planner, Playwright for the auth flow)
