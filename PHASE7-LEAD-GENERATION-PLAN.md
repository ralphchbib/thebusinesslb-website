# Phase 7 — Lead Generation Platform: Implementation Strategy

Master plan. Synthesizes `PHASE7-ARCHITECTURE-REVIEW.md`, `PHASE7-FORMS-STRATEGY.md`, `PHASE7-CRM-ARCHITECTURE.md`, `PHASE7-RISK-ASSESSMENT.md`, `PHASE7-VALIDATION-PLAN.md`, and `PHASE7-EFFORT-ESTIMATE.md` into a single recommendation. Planning only — no code, branches, commits, or PRs, per the brief.

## 0. The headline finding

Phase 7's brief frames this as building "Contact Forms," "Digital Assessment Forms," and "Newsletter Signup Forms" from scratch. **They already exist, already work, and are already live in production** — built on Zod validation, Drizzle/Postgres storage, Next.js Server Actions, and fail-soft Resend email notifications (`PHASE7-ARCHITECTURE-REVIEW.md` §1). This changes what Phase 7 actually is: not "build lead capture," but **"give the business a way to see and manage the leads it's already capturing, add the one missing form type, and close a handful of concrete, verified gaps."** Every recommendation below reflects that reframing.

## 1. Existing architecture — what's reused, what changes

Reviewed in full in the Architecture Review. In short: Payload CMS (9 collections, 2 roles, proven draft/preview infrastructure, now 14-block Page Builder) handles all *content*; a separate Drizzle/Postgres layer handles all *lead capture*, invisibly, with no admin UI. SEO, sitemap, and revalidation infrastructure are entirely unaffected by this phase. The one architectural decision this phase must make — where lead data and its management UI should live going forward — is resolved in `PHASE7-CRM-ARCHITECTURE.md`.

## 2. Forms — what's built, what's new, what's fixed

Full detail in `PHASE7-FORMS-STRATEGY.md`. Summary:

| Form | Status | Phase 7 work |
|---|---|---|
| Contact | Exists, working | Storage target migrates to Payload `Leads`; no field changes |
| Digital Assessment | Exists, working, well-designed 2-step qualification | Storage target migrates to Payload `Leads`; no field changes |
| Newsletter | Exists, working | Storage target migrates to Payload `NewsletterSubscribers`; **add honeypot** (currently missing) |
| Quote Request | **Does not exist** | New — built as a direct clone of Contact's proven shape, ~7 fields, single-step |

## 3. Lead management architecture — the core decision

Full evaluation in `PHASE7-CRM-ARCHITECTURE.md`. **Recommendation: migrate lead storage into two new Payload collections** — a unified `Leads` collection (Contact/Assessment/Quote, via a `leadType` discriminator and conditional fields, directly reusing the conditional-field pattern already proven by `FAQs`/`RichContent`) and a separate `NewsletterSubscribers` collection (kept apart from the sales pipeline deliberately, since newsletter signups don't move through a deal pipeline). This was chosen over a bespoke custom admin UI (Option A) or a Drizzle-source-of-truth-with-Payload-mirror hybrid (Option C) because it's the only option consistent with this project's own established pattern: every "give staff a UI to manage X" need across 6+ prior phases has been solved by extending Payload, never by building something new.

**Lead status pipeline** (the brief's `Submitted → Qualified → Discovery Call → Proposal → Won / Lost`) becomes a single Payload `select` field on `Leads` — 6 options, `won`/`lost` both terminal, replacing the existing-but-unused 4-value Drizzle status enum that never matched this shape anyway.

## 4. Notification strategy

Full detail in `PHASE7-CRM-ARCHITECTURE.md` §7. Admin notifications continue via the existing, proven fail-soft Resend pattern, now triggered from a Payload `afterChange` hook (the same mechanism already proven for cache revalidation on 9 collections) instead of directly from the server action. A lightweight visitor-facing confirmation email is added for Quote and Contact (not Newsletter, where the existing thank-you page already suffices). Lead-assignment and staleness-escalation features are named explicitly as real future needs and explicitly deferred — not silently dropped.

## 5. CRM strategy

Full evaluation in `PHASE7-CRM-ARCHITECTURE.md` §9. HubSpot is recommended as the eventual integration target (best free-tier fit, simplest webhook integration, useful bundled marketing tools) **but CRM integration itself is out of MVP scope**. What ships in MVP is the *readiness point* — a proven, working `afterChange` hook on `Leads` status changes, verified in the Validation Plan — so that adding the actual webhook later is a small, contained addition, not a re-architecture.

## 6. Analytics — future tracking requirements

Reviewed against the brief's five tracking needs:

- **Form submissions**: fully covered — every submission becomes a queryable, filterable Payload record from day one.
- **CTA clicks**: not currently tracked anywhere in the codebase (no analytics/event-tracking library found in this review) — genuinely out of scope for Phase 7, which is about lead *capture and management*, not sitewide behavioral analytics. Flagged as a distinct future phase, not folded in here.
- **Assessment requests / newsletter signups**: covered as a subset of "form submissions" above — filterable by `leadType`/collection in the Payload dashboard.
- **Lead source attribution**: the data model is ready (`utmSource`/`utmMedium`/`utmCampaign`/`referrerUrl`/`landingPath` fields on `Leads`), but the actual *capture* of UTM/referrer values is currently broken (only `landing_path` is wired up — Architecture Review §1.3) and must be fixed as part of this phase for source attribution to mean anything. Fixing capture is in scope (Effort Estimate workstream F); building a dedicated attribution *reporting* view is explicitly not MVP — Payload's own filterable list view is sufficient reporting for current scale (Forms Strategy §6).

**Recommendation**: fix attribution capture now (cheap, and the data is useless without it), defer CTA-click tracking and dedicated analytics dashboards to a future phase once there's real lead volume to analyze.

## 7. Risk assessment summary

Full detail in `PHASE7-RISK-ASSESSMENT.md`. Overall posture: **Medium**, driven by two concrete, already-real issues this phase is the right moment to fix (the non-persistent spam throttle, and an unverified newsletter-unsubscribe path that needs confirmation before implementation). No risk identified blocks a GO decision; every item has either a small, proportionate mitigation already scoped into the Effort Estimate, or is explicitly and deliberately deferred with the reasoning stated plainly (CRM integration, CTA-click analytics, lead assignment/escalation).

## 8. Validation strategy summary

Full detail in `PHASE7-VALIDATION-PLAN.md`. Extends this project's established live-validation discipline with the one genuinely new rigor this phase demands: **before/after data-migration reconciliation** — exact row counts and individual-record field-value spot-checks between the old Drizzle tables and the new Payload collections, plus explicit re-confirmation that the fail-soft "a lead must never be lost if email is down" guarantee survives the rewrite. Security validation centers on confirming `Leads`/`NewsletterSubscribers` are genuinely unreachable via Payload's public API — the single highest-stakes check in this phase, since a misconfigured access rule risks either losing real leads or exposing other people's PII.

## 9. Effort estimate summary

Full detail in `PHASE7-EFFORT-ESTIMATE.md`. **Roughly 7.5–9.5 working days end-to-end**, comparable to Phase 6B despite including a live data migration, because most individual pieces reuse already-proven patterns from this codebase rather than inventing new ones. CRM integration is explicitly excluded from this estimate — it would be a separately-scoped, materially larger addition.

## 10. Final Recommendation

### 10.1 Recommended MVP

Migrate Contact/Assessment/Newsletter to two new Payload collections (`Leads`, `NewsletterSubscribers`); build the new Quote Request form on the same foundation; fix the attribution-capture gap; add a persistent spam throttle and a newsletter honeypot; wire notifications through an `afterChange` hook (proving the CRM-readiness point without building the actual integration); run the one-time data migration with full before/after reconciliation; then remove the now-dead Drizzle infrastructure.

### 10.2 Recommended rollout order

1. New Payload collections (`Leads`, `NewsletterSubscribers`) — foundation everything else depends on
2. Migrate the 3 existing server actions to write to Payload instead of Drizzle (no visitor-facing change yet — same forms, new backend)
3. Data migration script + reconciliation (moves historical data before anything else depends on it being complete)
4. Persistent throttle + newsletter honeypot + attribution-capture fix (harden what already exists, before adding more surface area)
5. New Quote Request form (the one genuinely new form, built last so it inherits every fix from steps 1–4 rather than needing its own follow-up patch)
6. `afterChange` hook notification wiring + CRM-readiness point
7. Drizzle infrastructure cleanup (only after production validation confirms the migration is stable)
8. Full validation pass (including migration reconciliation) → single PR, following the established one-PR-per-phase convention

### 10.3 Technical effort

~7.5–9.5 working days, per the Effort Estimate — in the same order of magnitude as every prior phase in this project, not a step-change in scope, despite the data-migration complexity.

### 10.4 Business impact

This is the first phase in the project's history where the underlying business gets **operational** value, not just marketing/content value: staff go from "leads exist somewhere in a database only a developer can query" to "leads appear in a dashboard the same team already uses daily for every other piece of content, with a working sales pipeline." The Quote Request form adds a genuinely new conversion path. The attribution fix means marketing spend/campaign effectiveness becomes measurable for the first time. CRM integration, deferred, remains the natural next step once there's real usage data to inform how the business actually wants to work leads.

### 10.5 Risks

Summarized from §7: spam-throttle durability and the unverified newsletter-unsubscribe path are the two concrete items requiring engineering attention within this phase; PII-exposure risk is judged acceptable given it uses the same trusted-staff access model already proven safe across every other collection; CRM-integration absence and CTA-click analytics absence are named, deliberate scope exclusions, not overlooked gaps.

### 10.6 Success metrics

Since Payload's dashboard is the only reporting surface at MVP: track (externally, by the business, not by new code) — number of leads with a `status` other than `submitted` within a week of creation (a proxy for "is staff actually working the pipeline, not just letting leads pile up in the default state" — directly addressing the Risk Assessment's named adoption risk); Quote Request submission volume as a new-conversion-path indicator; and, once the attribution fix has been live for a full reporting cycle, whether `utmSource`/`utmMedium` data shows non-null, sensible values (the concrete, checkable proof the attribution fix actually worked, not just that it shipped).

### 10.7 GO / NO-GO Recommendation

# ✅ GO

The hard architectural question — where should leads live and be managed — has a clear, codebase-consistent answer (Payload collections, per the established pattern every other phase has followed), the migration risk is small given confirmed low current data volume, every identified risk has a proportionate mitigation already scoped into the effort estimate, and the phase delivers genuine, previously-unavailable operational value (a real, staff-usable lead dashboard and pipeline) rather than speculative capability. Recommend proceeding to Implementation scoped exactly to §10.1 — explicitly excluding actual CRM-vendor integration and CTA-click/behavioral analytics from this phase, each deferred for a stated, deliberate reason rather than overlooked.
