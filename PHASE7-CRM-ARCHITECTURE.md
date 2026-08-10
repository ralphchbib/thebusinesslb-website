# Phase 7 — CRM Architecture

The central architectural decision for Phase 7. Everything else in this phase (the Forms Strategy's storage model, the Effort Estimate, the rollout order) depends on the answer reached here.

## 1. The question, stated precisely

Given `PHASE7-ARCHITECTURE-REVIEW.md`'s finding that lead capture already exists and already writes to Drizzle/Postgres tables outside Payload, the question isn't "should leads be stored in a database" (they already are, safely, in production) — it's: **where should the human-facing lead *management* layer live**, and should new lead types (Quote Requests) join the existing Drizzle tables or go somewhere else?

Three options, evaluated on their actual merits against this specific codebase:

## 2. Option A — Bespoke admin UI on top of the existing Drizzle tables

Build a new, custom `/admin-leads/` (or similar) section in the Next.js app itself, reading Drizzle directly, with its own auth, list views, filters, and a status-update action.

- **Pro**: no data migration; the existing, proven, fail-soft write path (`lib/actions.ts` → `lib/db/queries.ts`) is untouched.
- **Con**: this project has zero prior custom-admin-UI code to build on — every other "let staff manage content" need in this project has been solved by Payload's admin panel, never a bespoke one. Building list views, filters, sortable tables, role-based access, and a status-change UI from scratch duplicates significant functionality Payload already provides for free.
- **Con**: a second, parallel authentication/authorization system would need to exist alongside Payload's `Users` collection (`admin`/`editor` roles) — unless it reuses Payload's own session (technically possible via Payload's Local API from a custom route, but adds real integration complexity for a UI that's fundamentally the same shape of problem Payload already solves).

## 3. Option B — Migrate lead storage into new Payload collections

Add new Payload collections (`Leads`, `NewsletterSubscribers`) as the write target going forward; server actions call Payload's Local API `create()` instead of Drizzle's `db.insert()`.

- **Pro**: Payload's admin UI — list view, column sorting, filtering, search — is inherited **for free**, exactly matching the "Lead Dashboard" requirement with zero new UI code.
- **Pro**: the existing 2-role access model (`adminOrEditor`/`adminOnly` from `payload/access.ts`) applies immediately and consistently with how every other collection in this project is secured — no new authorization system.
- **Pro**: a `status` field as a Payload `select` (options matching the requested pipeline: Submitted/Qualified/Discovery Call/Proposal/Won/Lost) gives "Lead Status Management" a working UI immediately — an editor changes a dropdown in the admin panel, exactly like every other status-bearing field in this project.
- **Pro**: Payload's `afterChange` collection hooks (already the established pattern for revalidation across every collection) are a natural, idiomatic integration point for a future CRM webhook — "on lead status change, notify CRM" is a one-function hook, consistent with how this codebase already does "do X when Y changes."
- **Con**: requires a one-time migration of existing Drizzle-stored leads (current volume is very low — this is a young, low-traffic site per every prior phase's data checks — so this is a small, low-risk migration, not a large one) — or a decision to leave historical Drizzle data as an archived, read-only reference and start fresh in Payload.
- **Con**: Payload's GraphQL/ORM layer carries more overhead per write than a raw Drizzle insert — irrelevant at this business's actual traffic volume, but worth naming as a real (if currently immaterial) tradeoff.
- **Con**: the existing, already-proven fail-soft server-action pattern (validate → save → notify, each failure handled independently) needs its `save*` functions rewritten to call Payload instead of Drizzle — a real but mechanical, low-risk change given how uniform that pattern already is across all three existing forms.

## 4. Option C — Pure hybrid: keep Drizzle as source of truth, sync into Payload for viewing only

Keep `lib/db/queries.ts` writing to Drizzle unchanged; add a one-way sync (on save, also mirror into a Payload collection) so Payload's admin UI becomes a read/status-update surface without becoming the source of truth.

- **Pro**: zero risk to the existing, proven write path.
- **Con**: two systems now need to agree on every record's status — a `status` change made in the Payload admin UI must be written back to Drizzle (or Drizzle becomes stale and inconsistent with what staff actually see), which reintroduces exactly the two-way-sync complexity Option C was meant to avoid. This is a materially more complex design than Option B for a business at this traffic volume, with no corresponding benefit once the migration risk in Option B is correctly sized as small (see §3).

## 5. Recommendation: Option B — migrate to Payload collections, newsletter included

Given this project's own repeated pattern — every "give non-technical staff a way to manage X" need across 6+ prior phases has been solved by extending Payload, never by building bespoke admin surfaces — and given the current lead volume is low enough that a full data migration is a small, low-risk, one-time script (not a large or risky undertaking), **Option B is the correct fit for this specific codebase**, not a generic best practice imported from elsewhere.

Two new Payload collections:

### 5.1 `Leads` — the sales pipeline (Assessment, Contact, Quote)

One unified collection, not three, with a `leadType` discriminator (`assessment` | `contact` | `quote`) and conditional fields per type — the exact pattern already proven in this codebase (`FAQs.service`'s `condition: scope === "service"`, `RichContent.content`'s `blockType`-conditional fields). A unified collection is the right shape here specifically *because* the brief's pipeline (`Submitted → Qualified → Discovery Call → Proposal → Won/Lost`) is meant to apply across all three lead sources in one dashboard — three separate collections would mean three separate list views for what should be one sales pipeline.

Core shared fields: `leadType`, `status` (select, the 5-stage pipeline — see §6), `fullName`, `email` or `whatsapp` (contact channel), attribution fields (`utmSource`/`utmMedium`/`utmCampaign`/`referrerUrl`/`landingPath` — same names as today's Drizzle columns, so the fix to actually populate them from `PHASE7-ARCHITECTURE-REVIEW.md` §1.3 applies identically regardless of storage backend), `createdAt` (Payload provides this natively), and an admin-only `internalNotes` textarea for sales follow-up context (new — didn't exist in the Drizzle version, a natural fit for "Discovery Call"/"Proposal" stage notes).

Type-specific conditional fields (shown only when `leadType` matches, following the `FaqPageBlock`/`RichContent` conditional-field convention):
- `assessment`: `businessName`, `sector`, `websiteUrl`, `instagramHandle`, `teamSize`, `biggestBlocker`, `ninetyDayGoal`, `budget`, `contactPreference`, `consentContact`
- `contact`: `businessName`, `interest`, `message`
- `quote`: fields TBD by `PHASE7-FORMS-STRATEGY.md` (likely `serviceInterest`, `projectDescription`, `budgetRange`, `timeline`)

### 5.2 `NewsletterSubscribers` — kept separate from `Leads`, deliberately

Newsletter signups are not sales-pipeline leads — they don't move through Qualified/Discovery Call/Proposal/Won-Lost, and mixing them into the `Leads` dashboard would dilute it with a fundamentally different kind of record (a marketing list, not a deal in progress). A second, simpler Payload collection: `email` (unique), `confirmed`, `unsubscribedAt`, attribution fields. Directly mirrors the existing `newsletter_subscribers` Drizzle table's shape — the migration here is closer to a rename than a redesign.

### 5.3 Access control

Both collections follow the exact existing pattern: `read`/`update` via `adminOrEditor` (staff need to work leads day-to-day), `create` via a narrower rule — since leads are created by **anonymous site visitors through a server action**, not by a logged-in editor through the admin UI, `create` access should allow the server action's Payload Local API call (which runs with elevated/system access, same as every other server-side Local API write already in this codebase — e.g., the CMS validation/migration scripts throughout this project's history) while still blocking direct public API writes to these collections (unlike, say, `FAQs`, which is `read: anyone` because FAQ content is meant to be public; Leads must never be publicly readable or writable). `delete` restricted to `adminOnly`, consistent with every other collection.

## 6. Lead status pipeline design

The brief's requested stages — `Lead Submitted → Qualified → Discovery Call → Proposal → Won / Lost` — become the `Leads.status` select field's options exactly, replacing (not extending) the old 4-value Drizzle enum, which never matched this pipeline shape in the first place (see Architecture Review §1.2):

```
submitted (default) → qualified → discovery_call → proposal → won
                                                              → lost
```

`won`/`lost` are both terminal; modeled as two separate option values (not a boolean "closed" flag layered on top of the other 4), matching how the brief phrases them as parallel outcomes, not a sub-state of "Proposal." A Payload `select` field with these 6 options, defaulting to `submitted`, is the entire technical implementation — no new infrastructure, direct reuse of the `select`-field pattern already used by `pageType`, `Testimonials.industry`, and a dozen other fields across this codebase.

## 7. Notification strategy

Reviewed against the brief's four questions:

- **Admin notifications**: keep the existing, proven `lib/email/notifications.ts` pattern (fail-soft Resend send after a successful save) — add a `notifyQuoteRequest()` alongside the existing three, and update the two migrated functions to fire from the new Payload `afterChange` hook instead of directly from the server action (see §8) if internal notes/status changes should also notify (e.g., "a lead was marked Won" pinging a Slack/email channel) — that's a natural `afterChange`-hook addition, not new infrastructure.
- **Email confirmations to the visitor**: recommend adding a lightweight visitor-facing confirmation email (distinct from the existing thank-you *page*, which stays) for Quote Requests and Contact specifically — a prospective client emailing/quoting expects an email trail, unlike a newsletter signup (where the existing thank-you page suffices, no email confirmation needed pre-double-opt-in — see the Risk Assessment on newsletter compliance). Assessment already gets a personalized thank-you page (`?name=`); a matching confirmation email is a nice-to-have, not a gap significant enough to block MVP.
- **Internal workflows**: with a real pipeline status field now in Payload, "assign this lead to a follow-up owner" becomes a natural future field (`assignedTo`, a relationship to `Users`) — not required for MVP, flagged as a fast-follow once real usage patterns are observed.
- **Escalation paths**: a lead sitting in `submitted` for more than N days with no status change is the one true "escalation" scenario worth naming now; solving it well (a scheduled digest, not a real-time trigger) is CRM-integration-adjacent territory — deferred to a fast-follow rather than MVP, per the Effort Estimate.

## 8. Migration mechanics (`afterChange` hook reuse)

The exact same `payload/hooks/revalidate.ts` pattern — a small, focused `afterChange` hook function, registered on the collection config — is the natural home for "send an admin notification email when a Lead is created" (replacing the direct call from `lib/actions.ts`) and, later, "POST to a CRM webhook when a Lead's status changes." This is not new architecture; it's the same mechanism already proven on 9 collections for a different purpose (cache revalidation), reused for its next logical purpose (lead-event side effects) — consistent with this project's demonstrated preference for one proven mechanism over inventing a second one.

## 9. CRM vendor evaluation

Evaluated for fit with a small (currently one-founder-led), Lebanon-focused digital agency at early lead volume:

| | HubSpot | Zoho CRM | Pipedrive |
|---|---|---|---|
| Free tier viability | Generous free CRM tier, good fit for low volume | Free tier exists but more limited; cheaper paid tiers than HubSpot | No free tier; cheapest paid plan is inexpensive but still a recurring cost from day one |
| Webhook/API simplicity | Well-documented REST API + native webhooks; easy `afterChange`-hook POST integration | REST API exists, generally less polished docs/tooling than HubSpot | Clean, developer-friendly API; historically popular with small dev teams |
| Ecosystem fit for a marketing-heavy small business | Strongest — HubSpot's free tier already bundles basic email marketing/forms, which overlaps usefully with this business's newsletter/lead-gen needs | Zoho's strength is its broader suite (Zoho Books, etc.) — only a fit if the business already uses other Zoho products (not evidenced anywhere in this codebase/session) | Pipedrive is purely sales-pipeline-focused — a very close conceptual match to the `Leads` pipeline being designed here, but no marketing/forms overlap |
| Learning curve for a non-technical founder | Low — HubSpot's UI is widely considered the most approachable of the three | Moderate | Low-moderate — pipeline-Kanban UI is intuitive |

**Recommendation: HubSpot's free tier, as a future integration, not MVP scope.** It has the best free-tier fit for current lead volume, the simplest webhook integration for the `afterChange`-hook pattern described in §8, and its bundled marketing tools have real overlap with this business's newsletter/lead-nurture needs — a genuine efficiency, not just a CRM choice. Pipedrive is the strongest runner-up specifically for its pipeline-first UX, worth reconsidering if the business's needs turn out to be pure sales-pipeline with no marketing-tool need. Zoho is not recommended absent evidence the business already uses the wider Zoho suite.

**This remains explicitly out of MVP** — see the Final Recommendation in `PHASE7-LEAD-GENERATION-PLAN.md`. The Payload `Leads` collection with a working status pipeline and dashboard (Option B, §5) delivers the actual business value (staff can finally see and manage leads) without depending on a third-party contract, a webhook integration to get right, or field-mapping decisions that are premature before there's real usage data on how the business actually works leads day to day. CRM integration readiness means: the `afterChange` hook point exists and is proven (§8), so adding the actual webhook later is a small, contained addition — not a re-architecture.
