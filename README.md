# THE BUSINESS lb — website

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion + Drizzle ORM.
Built from `website-specification.md` at the repo root.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and RESEND_API_KEY
npm run db:migrate           # applies drizzle/*.sql to your database
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL` set, the app still starts
and every page renders — but submitting any form will fail with a clear
on-screen error ("Something went wrong saving your application…") rather
than pretending to succeed. Without `RESEND_API_KEY`, forms save normally
but no notification email is sent (logged to the server console instead).

See `DEPLOYMENT.md` for the full production setup (Supabase + Resend + Vercel).

## What's wired up

- All Wave 1 pages from the sitemap (§2 of the spec): home, services hub + 5
  service pages, digital assessment, pricing, about + founder + how-we-work,
  insights hub + 3 seed articles, contact, thank-you pages, privacy/terms,
  404, sitemap.xml, robots.txt, llms.txt.
- **Database**: Supabase Postgres via Drizzle ORM. Schema in `lib/db/schema.ts`
  defines three tables — `assessment_applications`, `contact_submissions`,
  `newsletter_subscribers` — with Postgres enums mirroring the Zod option
  lists in `lib/validation/schemas.ts`, so a value that passes client
  validation can never be rejected by the database. Migrations live in
  `drizzle/`, generated with `npm run db:generate`, applied with
  `npm run db:migrate`.
- **Forms**: real Next.js Server Actions (`lib/actions.ts`) with Zod
  validation, a honeypot + time-on-form spam guard, and per-IP throttling
  (max 3 submissions/hour, hashed IP — never stored raw). A database write
  failure is caught, logged server-side, and shown to the visitor as a real
  error pointing them to WhatsApp — it never silently pretends to succeed.
- **Email**: Resend (`lib/email/send.ts` + `lib/email/notifications.ts`).
  Every successful save triggers an internal notification to
  `NOTIFICATION_EMAIL` for assessment applications, contact messages, and
  newsletter subscriptions. A failed or unconfigured send is logged clearly
  but never blocks the visitor's confirmation — the database write is the
  record of truth; email is a notification on top of it (§11.5 of the spec:
  a lead must never be lost because mail is down).
- The assessment form is progressively enhanced: with JavaScript disabled it
  renders as one plain page (still a real POST); with JavaScript it becomes
  the two-step wizard with local-storage draft saving described in §6.7.
- Design tokens from §7 live in `app/globals.css` as CSS variables consumed
  by Tailwind v4's `@theme inline`.

## Database commands

```bash
npm run db:generate   # diff lib/db/schema.ts against drizzle/, write new migration SQL
npm run db:migrate     # apply pending migrations to DATABASE_URL
npm run db:push        # (dev only) push schema directly, skipping migration files
npm run db:studio      # open Drizzle Studio, a local GUI for the database
```

Always commit the generated `drizzle/*.sql` files — they're the migration
history, not build output.

## Known gaps to close before launch

These map to Appendix E ("Open decisions") in the spec:

1. **Founder photo** — the only image available (`public/ralph-chbib-source.png`)
   is 375×500px, below the ≥2000px long edge the spec calls for. Replace it.
2. **Monogram / favicon** — `public/monogram.svg` is a placeholder built from
   a system serif font, not the brand's actual Bodoni Moda. Swap it for a
   designed version before launch; it's wired into `app/layout.tsx` icons.
3. **Phone number, street address, LinkedIn URL** — left blank in
   `lib/config.ts` (components render around them rather than invent them).
   Fill in `siteConfig.phoneDisplay` / `linkedinUrl` and they'll appear in
   the footer, contact page and schema automatically.
4. **UI typeface** — the spec calls for Switzer (Fontshare), which isn't
   available via `next/font/google`. Inter is used instead, matching the
   spec's own documented fallback. Swap in `app/layout.tsx` if Switzer's
   font files are licensed later.
5. **Privacy policy / terms** — genuine, functional drafts are published,
   not lorem ipsum, but per the spec they still need a Lebanese lawyer's
   review before launch, especially now that real PII is collected.
6. **OG images** — every page currently shares one default OG image
   (`public/og/default.png`). The spec asks for one per page; that needs a
   dynamic `opengraph-image.tsx` per route or per-article artwork.
7. **Resend sending domain must be verified** before real notification
   emails will deliver — see `DEPLOYMENT.md`.
