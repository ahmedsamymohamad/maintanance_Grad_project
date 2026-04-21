# My Project

Next.js 16 app (App Router) with Supabase auth, migrated from Vercel to Replit.

## Stack
- Next.js 16.2.0 (Turbopack), React 19
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Tailwind CSS v4, Radix UI
- Python FastAPI model API in `model_api/`

## Replit setup
- Workflow `Start application` runs `npm run dev` on port `5000` (host `0.0.0.0`).
- `next.config.mjs` includes `allowedDevOrigins` for the Replit proxy iframe.
- Secrets live in `.env` (Supabase URL/keys, `MODEL_API_URL`).

## Scripts
- `npm run dev` — dev server on port 5000
- `npm run build` — production build
- `npm run start` — production server on port 5000
