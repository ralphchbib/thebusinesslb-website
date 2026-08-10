# Phase 7 — Effort Estimate

Sized against Phase 6A/6B as reference units (this project's only prior "add new Payload collections + wire them into existing infrastructure" phases), adjusted for Phase 7's genuinely different risk profile: a live data migration, not just additive new schema.

## Workstream breakdown

### A. `Leads` + `NewsletterSubscribers` Payload collections

New collection configs, access control, admin list-view column configuration. Directly comparable to Phase 6A's original block-collection-design effort — **~1 block-unit-equivalent** (see `PHASE6B-EFFORT-ESTIMATE.md` for this project's established sizing unit), since the conditional-field pattern (`leadType`-driven) is a direct reuse of an already-proven technique, not new design work.

### B. Migrate 3 existing server actions from Drizzle to Payload

Rewrite `saveAssessmentApplication`/`saveContactSubmission`/`saveNewsletterSubscriber` (in a new Payload-backed equivalent of `lib/db/queries.ts`) to call Payload's Local API instead of Drizzle. Mechanical but must preserve the fail-soft guarantee exactly (Validation Plan §2) — **~1 block-unit-equivalent**, since the pattern being replaced is simple and well-understood (3 near-identical functions), but the "must not regress the fail-soft behavior" requirement demands real care, not just search-and-replace.

### C. New Quote Request form (schema, component, server action, thank-you page)

A direct clone of the Contact form's already-proven shape (Forms Strategy §2.3) — **~0.75 block-unit-equivalent**, smaller than a full new pattern since every piece (validation, spam checks, notification, redirect) is copy-adapted from working code, not designed from scratch.

### D. One-time data migration script (Drizzle → Payload)

A script reading the existing `assessment_applications`/`contact_submissions`/`newsletter_subscribers` tables and creating equivalent Payload documents, run once against production, with the before/after reconciliation described in the Validation Plan §4. Given confirmed low current row counts, this is **small but not zero** — budget **~0.5 day**, most of it in the reconciliation/spot-check rigor, not the migration logic itself.

### E. Persistent spam throttle (replacing the in-memory `Map`)

A `RateLimitEvents` Payload collection (or equivalent) + rewriting `checkThrottle()` to query it instead of an in-process `Map`. Small, contained — **~0.5 day**.

### F. Attribution-capture fix (populate `utm_source`/`utm_medium`/`utm_campaign`/`referrer_url`)

Add the missing hidden-field population to all 4 form components (currently only `landing_path` is wired) — a small, well-scoped client-side fix, **~0.25 day**.

### G. Newsletter honeypot + unsubscribe-path confirmation/fix

Add the honeypot field to the newsletter form (Risk Assessment); confirm and, if missing, build the unsubscribe route/page — **~0.5 day**, assuming the unsubscribe gap is confirmed real; smaller if it turns out to already exist and this review's inference was wrong (a genuine unknown, explicitly flagged as needing confirmation, not assumed).

### H. `afterChange` hook wiring for notifications + CRM-readiness point

Move notification-sending from direct server-action calls to a collection `afterChange` hook (CRM Architecture §8) — **~0.5 day**, small because it's a direct reuse of the `payload/hooks/revalidate.ts` pattern already proven on 9 collections.

### I. Drizzle infrastructure cleanup

Remove `lib/db/*`, `drizzle.config.ts`, `drizzle-kit`/`drizzle-orm` dependencies, and the `db:*` npm scripts once migration is validated and stable (Risk Assessment — operational complexity). **~0.25 day**, deliberately sequenced *after* production validation confirms the migration succeeded, not bundled into the same release.

### J. Validation (per the Validation Plan)

Form/notification/CRM-readiness/production/security validation, including the migration-specific before/after reconciliation — the single most rigor-intensive validation pass of any phase so far in this project, given it's the first phase validating a live data migration rather than purely additive schema. **~1.5–2 days**, meaningfully more than Phase 6B's validation effort specifically because of the reconciliation requirement.

## Rough calendar estimate

| Workstream | Effort |
|---|---|
| A. New collections | ~1 day |
| B. Migrate 3 server actions | ~1 day |
| C. Quote Request form | ~0.75 day |
| D. Data migration script + reconciliation | ~0.5 day |
| E. Persistent throttle | ~0.5 day |
| F. Attribution-capture fix | ~0.25 day |
| G. Newsletter honeypot + unsubscribe | ~0.5 day |
| H. `afterChange` hook wiring | ~0.5 day |
| I. Drizzle cleanup | ~0.25 day |
| J. Validation | ~1.5–2 days |
| Release review + PR + deployment + production validation (fixed overhead, per every prior phase) | ~1 day |

**Total: roughly 7.5–9.5 working days end-to-end**, in the same order of magnitude as Phase 6B despite touching a live data migration, because most of the individual pieces are small, well-scoped, and — per the Architecture Review's central finding — reusing already-proven patterns rather than inventing new ones. The realistic risk to this estimate is workstream D (migration) and J (validation) running longer than budgeted if the unverified newsletter-unsubscribe question (workstream G) turns out to require more than a quick fix, or if production data volume is higher than every prior phase's checks suggest — both are explicitly flagged uncertainties, not hidden ones.

## Key assumption driving this estimate

This estimate assumes CRM integration (an actual HubSpot/Zoho/Pipedrive webhook) is **out of scope** for this phase, per `PHASE7-CRM-ARCHITECTURE.md`'s recommendation — only the `afterChange`-hook readiness point (workstream H) is built. Adding a real CRM integration would be a separately-scoped, materially larger workstream (vendor account setup, field-mapping design, webhook auth, error-handling for a third-party API that can be down or rate-limited) — not a fractional addition to this number, consistent with how Phase 6B's estimate treated the deferred Contact Form block.
