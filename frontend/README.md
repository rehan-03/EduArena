# EduArena Frontend

EduArena is a syllabus-aligned competitive practice platform for K.K. Wagh Semester IV students.

## Features Implemented

- Google OAuth sign-in with Supabase Auth
- MCQ quiz engine with queue + stack navigation and timer auto-submit
- Quiz persistence in `quiz_sessions` and `mcq_attempts`
- Real-time leaderboard powered by Supabase Realtime
- Student dashboard (attempt history, progress, weak units)
- Coding challenge module (`coding_problems` browse + `code_submissions` write)
- Admin panel:
  - manual MCQ create via RPC (`create_mcq_question`)
  - duplicate detection via RPC (`check_question_duplicate`)
  - question delete + undo (stack-based UI)

## Prerequisites

- Node.js 20+
- A Supabase project

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set environment values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. Apply SQL in Supabase SQL editor:

- Root schema: `../sem4_schema.sql`
- Migration for leaderboard + RPCs: `../supabase/migrations/002_leaderboard_and_rpc.sql`

5. Run dev server:

```bash
npm run dev
```

## Build & Lint

```bash
npm run lint
npm run build
```

## Notes

- If Supabase env is missing, the app falls back to mock data for safe local UI testing.
- For production, ensure RLS policies and Google OAuth redirect URLs are configured in Supabase dashboard.
