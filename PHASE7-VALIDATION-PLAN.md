# Phase 7 — Validation Plan

Defines how Phase 7's implementation (whenever it proceeds) will be validated, extending this project's established live/evidence-based validation discipline to a phase whose central risk is data migration correctness, not just new-feature rendering.

## 1. Form validation

For all four forms (Contact, Assessment, Quote, Newsletter):

- **Field-level validation parity**: for each form, submit deliberately invalid data (missing required fields, malformed email, too-short message) via a direct server-action call or a real form submission, confirm the exact same Zod error messages as today's live behavior — a regression here would be invisible until a real visitor hit it.
- **Successful submission → correct Payload record**: submit valid data, confirm a `Leads` (or `NewsletterSubscribers`) document is created with every field correctly mapped, `status` correctly defaulted to `submitted` (or unset for newsletter), and `leadType` correctly set for the 3 lead-form types.
- **Honeypot behavior**: submit with the honeypot field populated, confirm a silent success response (no record created) — reused test method from validating this exact behavior would need to exist newly, since it was never previously validated this way; the current behavior is inferred from code reading, not live-tested, in this planning phase.
- **Throttle behavior, post-fix**: submit past the rate limit, confirm the request is correctly blocked — and specifically confirm the fix persists across a simulated cold start (a fresh process/connection), not just within one process, directly testing the fix for the Risk Assessment's core spam-risk finding.

## 2. Notification validation

- Confirm the `afterChange`-hook-driven admin notification email fires on every new Lead/Newsletter record, with content matching the existing `notifyAssessmentApplication`/`notifyContactSubmission`/`notifyNewsletterSubscriber` templates (extended with a `notifyQuoteRequest` for the new type).
- Confirm the fail-soft guarantee still holds: simulate a Resend failure (e.g., temporarily invalid `RESEND_API_KEY` in a test environment) and confirm the Lead record is still saved correctly — this is the single most important behavior to re-prove after the storage migration, since "a lead must never be lost because email is down" was the explicit design intent of the original Drizzle-based system and must survive the migration intact.
- If a visitor-facing confirmation email is implemented (Forms Strategy §7, Quote/Contact only): confirm it's sent, confirm it does NOT block the redirect-to-thank-you-page flow if it fails (same fail-soft principle).

## 3. CRM validation

Out of scope for MVP validation since CRM integration itself is deferred (`PHASE7-CRM-ARCHITECTURE.md` §9) — this section instead validates the **readiness point**, not an actual integration:

- Confirm the `afterChange` hook on `Leads` fires correctly on a `status` change specifically (not just on create) — this is the exact hook point a future CRM webhook would attach to, so proving it fires reliably on updates (not just creates) is the concrete deliverable that makes "CRM-ready" a verified claim rather than an aspiration.

## 4. Production validation

Following the exact precedent set by every prior phase (Phase 5B/5C/6A/6B): create real test submissions against the production database via the real forms (not just Local API scripts) at least once per form type, confirm they appear correctly in the Payload admin dashboard, confirm the admin notification email arrives, then delete the test records and confirm zero remain — the same test-then-clean-up discipline used throughout this project.

**Migration-specific production validation** (the part with no prior-phase precedent, since no earlier phase has migrated live data between two storage systems):
- Before migration: record exact row counts for `assessment_applications`, `contact_submissions`, `newsletter_subscribers` in the live Drizzle tables.
- After migration: confirm the new `Leads`/`NewsletterSubscribers` Payload collections contain exactly that many migrated records (split correctly by `leadType` for the unified collection), with a spot-check of several individual records' field values matching their Drizzle source exactly (name, email, message/business-name content — not just row counts, which could match by coincidence while individual fields are wrong).
- Confirm the live `/contact/`, `/digital-assessment/`, and newsletter footer forms are pointed at the new Payload-backed server actions (not silently still writing to the old Drizzle tables) — a real, concrete regression this specific migration could introduce if a server action file were only partially updated.

## 5. Security validation

- **Access control**: confirm `Leads`/`NewsletterSubscribers` are NOT readable or writable via Payload's public REST/GraphQL API by an unauthenticated request (the same check already proven for every drafts-enabled collection's `access.read` gate, applied here to a stricter "no public access at all" rule) — this is the single most important security check in this phase, since a misconfigured `create` access rule could either block real leads from saving (a business-critical bug) or, worse, allow public read access to other people's PII (a real data breach).
- **Server-action-only create path**: confirm the `create` access rule genuinely restricts writes to the server action's elevated Local API call and rejects a direct, unauthenticated REST API `POST` attempt — a concrete, scriptable test (attempt a raw `fetch()` POST to `/api/leads` with no session, confirm rejection).
- **Honeypot/throttle regression**: re-confirm (§1) that spam mitigations survived the migration unchanged or improved, not silently dropped in the rewrite from Drizzle-backed to Payload-backed server actions.
- **PII in logs**: confirm no new `console.log`/`console.error` calls introduced during this phase accidentally log full lead PII (email, message content) to server logs — a quick, targeted code-review pass, not a heavy security audit, proportionate to this phase's actual scope.

## 6. What stays unchanged from prior phases' validation approach

- Real, live, evidence-based testing over assumption — this project's standing discipline, applied here to a data-migration context for the first time, which raises the bar specifically on before/after reconciliation (§4) rather than changing the underlying philosophy.
- Full test-artifact cleanup with an explicit 0-remaining-records confirmation.
- Transparent disclosure of any validation-methodology mistakes or environment quirks encountered (e.g., the recurring Supabase pooler flakiness already documented across every phase) rather than either hiding them or misreporting them as product defects.
