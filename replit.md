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

## Premium datasets (scanner / printer)
- Premium users pick a device type (scanner or printer) when uploading a dataset; it is stored in `premium_datasets.device_type` (added in `scripts/006_premium_dataset_device_type.sql`).
- Admin "Run Predictions" no longer asks for a model branch. The Next.js route `app/api/datasets/[id]/predict/route.ts` posts the file to the FastAPI endpoint `POST /predict/dataset/auto?device_type=scanner|printer`.
- That endpoint runs the 3 corresponding model branches (scanner → `branch_1/2/3`, printer → `branch_1/2/3_printer`), and for each device keeps the row with the highest `failure_probability_next_7d`. The winning branch is returned per row as `best_branch` and is shown in both the admin and premium-user result tables.
