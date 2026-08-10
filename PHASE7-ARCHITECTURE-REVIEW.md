# Phase 7 — Architecture Review

Scope: a from-first-principles review of everything Phase 7's Lead Generation Platform would build on, read directly from the current codebase as of the Phase 6B merge (`0462725`). No code changes in this document.

## 0. The single most important finding: lead capture already exists, in production, and it's not in Payload

Before this review, Phase 7's brief framed "Contact Forms," "Digital Assessment Forms," and "Newsletter Signup Forms" as work to be designed. **They are already built, deployed, and working.** This review found a complete, independent, production system:

- `lib/validation/schemas.ts` — Zod schemas for a 2-step Digital Assessment form, a Contact form, and a Newsletter signup.
- `lib/db/schema.ts` — a **Drizzle ORM** schema (`drizzle-orm`, raw Postgres via `postgres-js`) defining `assessment_applications`, `contact_submissions`, and `newsletter_subscribers` tables — **entirely separate from Payload's `cms` schema**, though both connect to the same `DATABASE_URL` (the same shared Supabase instance every other phase in this project has worked against).
- `lib/actions.ts` — three Next.js Server Actions (`submitAssessmentAction`, `submitContactAction`, `subscribeNewsletterAction`) that validate, throttle, save, and notify.
- `lib/email/notifications.ts` + `lib/email/send.ts` — a fail-soft Resend wrapper; a failed email never blocks or loses a saved submission.
- `components/forms/{assessment,contact,newsletter}-form.tsx` — the actual rendered forms, using React's `useActionState` against the server actions above.
- Live routes: `/contact/`, `/digital-assessment/`, and a newsletter form embedded in the footer (per `SiteSettings`'s Newsletter tab copy fields).
- `drizzle/0000_nosy_sentinels.sql` — one migration, applied once, unchanged since.

This is not a green field. **Phase 7's real job is to close the gaps in an already-working system, not to build forms from zero.** The gaps, found by reading the actual code rather than assumed:

### 1.1 Gap: no way for a human to see a lead after it's submitted

Every submission is written straight to a raw Postgres table with **zero admin UI**. The only way to see a new lead today is `npx drizzle-kit studio` (a local developer tool) or a direct SQL query — not something THE BUSINESS lb's own staff can use. This is the single largest gap relative to the Phase 7 brief's "Lead Dashboard" and "Lead Status Management" requirements, and it's a pure UI/access gap, not a data-model gap — see §1.2.

### 1.2 Gap: a status field already exists but nothing uses it

`lib/db/schema.ts` already defines `submissionStatusEnum = pgEnum("submission_status", ["new", "reviewing", "contacted", "closed"])`, applied to both `assessment_applications.status` and `contact_submissions.status`, defaulting to `"new"`. **No code anywhere reads or writes this column except its own default.** The brief's requested pipeline (`Lead Submitted → Qualified → Discovery Call → Proposal → Won / Lost`) is a different, more granular set of stages than this existing 4-value enum — Phase 7 needs to decide whether to extend/replace this enum or design fresh, not assume it already matches (it doesn't).

### 1.3 Gap: attribution capture is half-wired

`lib/db/schema.ts`'s `attributionColumns` (`utmSource`, `utmMedium`, `utmCampaign`, `referrerUrl`, `landingPath`) and `lib/actions.ts`'s `readAttribution()` (which reads `formData.get("utm_source")` etc.) are both fully built and ready. **But none of the three form components actually populate `utm_source`, `utm_medium`, `utm_campaign`, or `referrer_url` as hidden fields** — confirmed by grepping every `components/forms/*.tsx` file: only `landing_path` (via `usePathname()`) is wired up in any of them. In production today, **`utmSource`/`utmMedium`/`utmCampaign`/`referrerUrl` are always null** for every row ever saved. This is a real, currently-silent gap, not a hypothetical one — Phase 7's Analytics section must address it directly.

### 1.4 Gap: spam protection is real but has a load-bearing weakness

Confirmed via `lib/actions.ts`:
- A honeypot field (`company_website`) — wired into **Contact and Assessment only**, confirmed absent from Newsletter.
- A 3-second minimum time-on-form guard — **Assessment only**.
- An IP-hash-based rate limiter (max 3/hour per kind) — applied to all three, **but stored in a plain in-process `Map`** (`const throttleLog = new Map(...)`). This is a real weakness specific to this app's deployment target: Vercel serverless functions do not guarantee the same in-memory `Map` persists across invocations, cold starts, or concurrent instances — under real traffic, this throttle is far weaker in practice than it appears in code, since a new cold-started instance starts with an empty `Map`. Not a defect introduced by this review's reading — a structural characteristic of using in-memory state on a serverless platform, worth fixing if spam becomes a real problem.

### 1.5 Gap: no Quote Request form

Confirmed via search — no dedicated "request a quote" form, schema, table, or route exists anywhere. This is genuinely new scope for Phase 7, not a gap-fix.

### 1.6 Gap: no CRM integration of any kind

Confirmed — no outbound webhook, API call, or third-party CRM SDK anywhere in the codebase. Fully new scope.

### 1.7 Minor gap: no visitor-facing confirmation email

Each server action redirects to a `/thank-you/{type}/` page (a real, working confirmation experience) but does not email the visitor themselves — only the internal `notifyAddress` gets an email. Not a functional gap (the thank-you page is a legitimate, working confirmation UX), but worth deciding on deliberately rather than by omission.

### 1.8 Minor, unverified gap: newsletter unsubscribe

`lib/db/queries.ts` has a working `unsubscribeNewsletter(email)` function, but this review found no route or link that calls it (no `/unsubscribe` route found). If true, this is a compliance-relevant gap (CAN-SPAM/GDPR expect a working unsubscribe path) worth explicit confirmation before Phase 7 implementation, not before this planning document — flagged here as "verify before building," not asserted as fact.

## 2. Payload CMS architecture (for context — mostly unaffected by Phase 7)

9 collections (`Pages`, `Services`, `Articles`, `CaseStudies`, `FAQs`, `Testimonials`, `Media`, `Navigation`, `Users`) + 2 globals (`Homepage`, `SiteSettings`). Two roles only: `admin` and `editor` (`payload/collections/Users.ts`) — admin can do everything, editor can edit content but not users/settings/navigation. 6 of the 9 collections use `versions.drafts: true` + the proven `access.read` published-only-for-anonymous gate; Media, FAQs, and Navigation don't (no draft concept needed for those). Preview infrastructure (`/api/draft`, `/api/exit-draft`, `PREVIEW_ROBOTS`) is fully collection-agnostic and has now been proven working across 6 collections/globals plus, as of Phase 6B, a 14-block Page Builder.

**None of this needs to change for Phase 7's forms/leads work** — the relevant question is whether Phase 7's new lead data should live *inside* this proven system (new Payload collections) or stay in its current, separate, also-proven Drizzle system. See `PHASE7-CRM-ARCHITECTURE.md` for that evaluation.

## 3. SEO, sitemap, revalidation (unaffected)

Nothing in Phase 7's scope touches `lib/seo/*`, `app/(app)/sitemap.ts`, or `payload/hooks/revalidate.ts`. Forms are not indexed content and don't need canonical URLs, structured data, or sitemap entries beyond what their hosting pages (`/contact/`, `/digital-assessment/`, any new `/quote/` route) already have.

## 4. Production deployment architecture

Single Next.js app on Vercel, one Supabase Postgres instance serving both Payload's `cms`-schema tables and Drizzle's default-schema tables via the same `DATABASE_URL`. This matters directly for two Phase 7 decisions:
- **No new database provisioning needed** for any lead-storage option (Payload collections or continuing with Drizzle) — it's the same instance either way.
- The already-documented Supabase pooler flakiness (`ENOTFOUND`/`Connection terminated unexpectedly`, seen repeatedly during this project's own validation scripts) is a shared-infrastructure characteristic that affects lead-submission writes exactly as much as any other write in this system — worth carrying into the Risk Assessment, not a new risk specific to Phase 7.

## 5. What this means structurally for Phase 7

Phase 7 is **not** "build a lead-gen system." It's:
1. **Give humans a way to see and manage the leads that are already being captured** (§1.1, §1.2) — the dominant piece of work.
2. **Add one genuinely new form type** (Quote Request) using the exact proven pattern already in place (§1.5).
3. **Close two real, verified gaps**: attribution capture (§1.3) and spam-protection durability (§1.4).
4. **Design and (at MVP) likely defer** CRM integration (§1.6) — genuinely new, evaluated in `PHASE7-CRM-ARCHITECTURE.md`.
5. **Decide deliberately, not by default**, on visitor confirmation emails (§1.7) and confirm/fix newsletter unsubscribe (§1.8).
