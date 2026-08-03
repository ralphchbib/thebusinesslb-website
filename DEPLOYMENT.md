# Deployment checklist

Follow in order — each section depends on the one before it. Nothing here
requires code changes; it's account setup and configuration.

## 1. Supabase (database)

1. Create a project at [supabase.com](https://supabase.com) (free tier is
   plenty for Wave 1 volume).
2. Once provisioned: **Project Settings → Database → Connection string →
   Transaction pooler** (not "Session" or "Direct connection"). Copy it —
   it looks like:
   ```
   postgres://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
   ```
   The transaction pooler (port 6543) is required, not optional — Vercel's
   serverless functions each open their own connection, and a handful of
   concurrent form submissions would exhaust Postgres's direct connection
   limit (default 60) almost immediately without it.
3. Replace `[YOUR-PASSWORD]` with your database password (set at project
   creation, or reset it under Database settings).
4. Save this full string — it's your `DATABASE_URL`.
5. `pgcrypto` (needed for `gen_random_uuid()` primary keys) is enabled by
   default on all Supabase projects — no action needed.

## 2. Resend (email)

1. Create an account at [resend.com](https://resend.com).
2. **API Keys → Create API Key** — save it as `RESEND_API_KEY`.
3. **Domains → Add Domain** → enter `thebusinesslb.com`.
4. Add the DNS records Resend shows you (SPF, DKIM — usually 2–3 TXT/CNAME
   records) at your domain registrar. This is the step that's currently
   blocking real delivery — until it's done, `RESEND_FROM_EMAIL` /
   `NOTIFICATION_EMAIL` addresses on that domain will fail with a 403.
5. Wait for verification (a few minutes to ~30 min for DNS propagation).
   Resend's dashboard shows a green "Verified" badge when it's done.
6. Until then, you can test the send path only (not real delivery to
   arbitrary inboxes) by setting `RESEND_FROM_EMAIL=onboarding@resend.dev`
   — Resend's shared sandbox domain, which works instantly but only
   delivers to the email address on your Resend account.

## 3. GitHub

1. Push this repository to a new GitHub repo (private is fine).
2. **Do not commit `.env.local`** — it's already gitignored. Double-check
   with `git status` before your first push that no `.env*` file is staged.
3. Confirm `.data/` (old local lead storage, no longer used) isn't present
   or tracked — also gitignored.

## 4. Vercel

1. **Import Project** from the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: Next.js (auto-detected). Root directory: `web/` if the
   repo root is `THE-BUSINESS-LB` with the app inside `web/` — set this in
   the import screen's "Root Directory" field, or move `web/`'s contents to
   the repo root first, whichever matches how you pushed it.
3. **Environment Variables** — add every variable from `.env.example`,
   for **Production** (and Preview if you want preview deploys to also
   write real data — usually you don't; see note below):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase pooler string from step 1 |
   | `RESEND_API_KEY` | from step 2 |
   | `RESEND_FROM_EMAIL` | `hello@thebusinesslb.com` (once domain verified) |
   | `NOTIFICATION_EMAIL` | `hello@thebusinesslb.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://thebusinesslb.com` |
   | `NEXT_PUBLIC_WHATSAPP_NUMBER` | `96176126860` |
   | `IP_HASH_SALT` | any random string (`openssl rand -hex 32`) |
   | `NEXT_PUBLIC_GA4_ID` | leave blank until analytics is set up |
   | `NEXT_PUBLIC_META_PIXEL_ID` | leave blank until analytics is set up |
   | `CALENDAR_BOOKING_URL` | leave blank until call booking is set up |

   Consider using a **separate Supabase project** (or at least a note to
   yourself) if you want Preview deployments to avoid writing test leads
   into the same database real applicants land in.

4. Deploy. Vercel will run `npm run build` — this succeeds even if env vars
   are momentarily misconfigured (the app fails gracefully at request time,
   not at build time — verified during development, see README).
5. Once deployed, **run the migration against the production database**
   from your local machine (Vercel doesn't do this automatically):
   ```bash
   DATABASE_URL="<the same pooler string>" npm run db:migrate
   ```
6. Add your custom domain under **Project → Settings → Domains**, and point
   its DNS at Vercel per their instructions.

## 5. Post-deploy verification

Do these in order, on the real production URL:

1. Submit the assessment form with real (but clearly marked, e.g. "TEST —")
   data. Confirm it redirects to `/thank-you/assessment/`.
2. In Supabase, **Table Editor → assessment_applications** — confirm the
   row landed.
3. Check the inbox at `NOTIFICATION_EMAIL` for the notification. If it
   didn't arrive, check Vercel's function logs for a `[email:failed]` or
   `[email:error]` line — it will name the exact reason (commonly: domain
   not yet verified).
4. Repeat for the contact form and the newsletter form (footer).
5. Delete the test rows from Supabase once confirmed (Table Editor → select
   row → delete), so they don't pollute Ralph's real lead list.

## Ongoing

- `npm run db:generate` after any change to `lib/db/schema.ts`, commit the
  new file under `drizzle/`, then `npm run db:migrate` against production
  before or right after deploying the code change that depends on it.
- Rotate `RESEND_API_KEY` and `DATABASE_URL`'s password periodically; both
  are plain secrets with full read/write access to real customer data.
