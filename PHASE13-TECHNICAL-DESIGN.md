# Phase 13 — Technical Design (Discovery Only)

**Status:** Design only. No branch created, no collections built, no code written, no PR opened.
**Source of truth:** `THE_BUSINESS_Network_Blueprint_v3.docx` (read in full for this document), cross-checked against `PHASE10-COMPLETION-REPORT.md`, `PHASE11-COMPLETION-REPORT.md`, `PHASE12-COMPLETION-REPORT.md`.

---

## A. Blueprint Sequence Analysis

Blueprint §53 ("Recommended Release Sequence") defines five releases:

| Release | Blueprint Focus |
|---|---|
| **Release 1 — Identity and Discovery** | Registration, profiles, portfolios, directory, search, dashboard, contact requests |
| **Release 2 — Trust** | Verification, confirmed projects, reviews, recommendations, Digital Assessment, Growth Roadmap |
| **Release 3 — Engagement and SaaS** | Analytics, AI tools, booking, lead inbox, opportunity alerts, paid plans |
| **Release 4 — Market Connections** | Offers and Needs, jobs, opportunities, concierge, assisted matchmaking, Collaboration Builder |
| **Release 5 — Market Infrastructure** | Digital Neighborhoods, Diaspora Bridge, institutional portals, Market Pulse, Market Missions, white-label networks |

**What's actually been built (Phases 9–12) does not map 1:1 onto this table**, and that deviation is already established practice, not a new decision this document is introducing:

- **Phase 9 (9A–9D)** = Release 1, largely complete, *except* "contact requests" — there is still no in-platform inquiry/quote-capture mechanism. Contact today is static profile fields (phone, email, WhatsApp) consumed off-platform.
- **Phase 10** = Release 2, partially — Verification, Reviews, Recommendations shipped; Confirmed Projects / Proof of Work (§12), Digital Business Assessment (§21), and the 90-Day Growth Roadmap (§23) were explicitly deferred (`PHASE10-COMPLETION-REPORT.md`, "Remaining Blueprint Work").
- **Phase 11** (Saved Profiles, Following, Saved Searches, Activity Feed) doesn't correspond to any single numbered release — it fills out the Consumer Dashboard (§15, §38) that Release 1 named but didn't finish.
- **Phase 12** (Business Circles §34, Introduction Economy §58, Messaging) is part of the blueprint's **CONNECTIONS** pillar (§5), which §53 itself spreads across Release 1 ("contact requests"), Release 3 (booking-adjacent), and Release 4 (concierge, matchmaking, Collaboration Builder) — it isn't cleanly "one release" either.

**Conclusion:** this project has consistently built the next *technically ready, highest-leverage* slice rather than executing §53 as a literal checklist — the same judgment call Phase 10 made explicitly when it narrowed the six-tier verification ladder to one tier. This document continues that practice: §53 informs the analysis below but does not mechanically dictate the answer.

## B. Current Platform Readiness

What exists and is production-validated today (per Phases 9–12 completion reports):

- **Identity & Auth**: 5 account types, register/login/logout/verify/reset, session layer. (Phase 9A)
- **Profiles & Directory**: Business/Professional profiles, public pages, filtered directories, search. (Phase 9B/9C)
- **Dashboard shell**: role-aware nav, profile completion, settings. (Phase 9D)
- **Trust layer**: staff-reviewed Verification, Reviews (1–5 star, DB-unique-per-account-per-profile), Recommendations, `ContentReports` (shared, polymorphic `target` relationship — currently `reviews | recommendations | messages`). (Phase 10)
- **Consumer engagement**: Saved Profiles, Following (with duplicate/self-follow prevention), Saved Searches, request-time-composed Activity Feed. (Phase 11)
- **Connections & Messaging**: `Connections` (mutual, typed, reason/value/outcome-required — §34/§58), `Conversations` (auto-created on Accept), `Messages` (read-tracking, unread counts, freeze/end). (Phase 12)
- **Infrastructure**: production email (Resend, verified sending domain), rate limiting (`lib/cms/rate-limit.ts`, sliding-window per `kind`), REST access control proven closed-by-default across every collection shipped so far.

**Not yet built, relevant to this decision**: any in-platform lead-capture/inquiry mechanism, analytics, AI tools, booking, paid plans, Offers/Needs, Opportunity Radar, CRM/pipeline tooling, Market Pulse, and everything in Release 5.

## C. Option A Analysis — Market Connections / Opportunity Layer

**Blueprint sections:** §18 Offer and Need Exchange, §19 Opportunity Radar, §20 Collaboration Builder; "OPPORTUNITIES" pillar (§5): Jobs, Freelance Projects, Customer Requests, Supplier Requests, Partnerships, Tenders, Business Challenges, Opportunity Radar. Named revenue model in §18: free limited listings, Pro unlimited, featured requests, verified opportunities, priority matching, human-assisted matching, success fees.

- **Blueprint order:** Release 4.
- **Dependencies:** authenticated accounts ✓, profiles ✓ (postings can optionally reference a business/professional profile but don't require one), notification infrastructure ✓. Critically, **responding to a posting can be modeled as creating a `Connection`** — reusing Phase 12's entire mutual-approval, reason/value/outcome, accept-creates-conversation machinery outright, rather than inventing a parallel relationship system.
- **Missing prerequisites:** none that block a reasonably-scoped MVP. Full scope (§19 Opportunity Radar's proactive push alerts, §20 Collaboration Builder's multi-role project assembly, paid "priority matching") is explicitly larger than an MVP needs — see §G scope narrowing.
- **Business value:** **High.** This is new user-generated commercial signal (who needs what, right now) — the thing the Blueprint's own Executive Concept (§1) calls the difference between "only a directory" and "trusted digital infrastructure." It's also the first genuinely new *content type* since Phase 9B profiles — directly monetizable per §18's own listed pricing levers, and it's the natural extension of what Phase 12 just shipped: instead of only browsing a directory and connecting to one known business, a member posts a need once and lets qualified responses come to them, closing through the same Connections/Messaging pipes.
- **Technical complexity:** **Medium.** One new collection (postings), a public browse/filter page (near-identical shape to the Phase 9C directory work), a "respond" action that creates a `Connection` with a new provenance field, and self-response/ownership/rate-limit checks that are near-copies of already-proven Phase 11/12 patterns.

## D. Option B Analysis — Market Pulse / Intelligence

**Blueprint sections:** §37 Market Pulse, §58 (listed as a Signature Creative Feature).

- **Blueprint order:** Release 5.
- **Dependencies:** purely additive read-side aggregation over data that **already exists** — Reviews (Phase 10), Follows/SavedSearches (Phase 11), Connections (Phase 12), directory category/location fields (Phase 9B/9C). No new write-side collection is strictly required for a basic public-insights panel.
- **Missing prerequisites:** not a technical blocker, but a *data-volume* one. §37's own framing — "most searched services," "fast-growing categories," "active locations" — only means something with real traffic behind it. Production today runs on the small set of real accounts plus this project's own test accounts (all deleted after each validation pass); there isn't yet a large enough real population to produce a trend that isn't noise. Building this now risks shipping a page that's technically correct but visibly empty/uninteresting, which undercuts the "the homepage must feel active" principle §48 explicitly states.
- **Business value:** **Medium now, high later.** The bigger revenue line named in §37 — "Paid Institutional Dashboards" for universities, municipalities, chambers, researchers — is a distinct, larger scope (external stakeholder accounts, custom reporting, likely a sales-assisted motion) that shouldn't be conflated with a first public-insights MVP.
- **Technical complexity:** **Low–Medium.** Aggregation queries plus a display page; the main design question is request-time computation (Activity Feed's proven pattern, Phase 11) vs. a cached/scheduled rollup, which matters more as volume grows — not a blocker today, but a reason this is *more* valuable after Option A adds another data source (postings) to aggregate over.

## E. Option C Analysis — CRM Lite

**Blueprint sections:** §39 CRM Lite; "MANAGEMENT" pillar (§5): Lead Inbox, CRM Lite, Contacts, Proposals, Appointments, Reviews, Analytics; §38 SaaS Dashboard Structure lists "Leads" under Business Dashboard Sections.

- **Blueprint order:** Not given its own release number in §53's table; its precursor, "lead inbox," is named under Release 3 (Engagement and SaaS).
- **Dependencies:** CRM Lite's entire premise is a pipeline of **leads** moving through stages (New → Qualified → Contacted → Proposal Sent → Negotiating → Won → Lost). A pipeline needs something to put in stage "New."
- **Missing prerequisites — this is the blocking finding of this analysis:** there is currently **no mechanism on the platform that produces a lead**. Release 1's own scope named "contact requests," but that was never built — profiles today expose static contact fields (phone/email/WhatsApp) consumed entirely off-platform, and Phase 12's `Connections` model mutual peer-to-peer B2B relationships (both sides must accept), not one-directional inbound customer inquiries. Shipping CRM Lite today means shipping an empty pipeline tool with nothing to manage — the tool would be technically functional and practically useless on day one.
- **Business value:** potentially high long-term (§43 prices it into the $49–99/mo "Business Growth" tier, the platform's stated highest-value SaaS tier), but **near-zero immediate value** without a lead source feeding it.
- **Technical complexity:** **Medium–High.** A pipeline-stage state machine, notes/tasks/reminders, business-scoped CRUD UI — more surface area than Option A or B, and all of it would sit idle until a lead-generating feature exists.

## F. Dependency Review

| | Option A — Market Connections | Option B — Market Pulse | Option C — CRM Lite |
|---|---|---|---|
| Blocking prerequisite missing? | No | No (technical) / Yes (data volume) | **Yes — no lead source exists** |
| Reuses existing infra? | Yes — Connections/Conversations/Messages (Phase 12) wholesale | Yes — reads Reviews/Follows/Connections (Phase 10–12) | No — net-new subsystem |
| Produces new data others can build on? | Yes — postings become a future lead source *and* a future Market Pulse input | No — consumes, doesn't produce | No — consumes leads that don't exist yet |
| Blueprint release order | 4 | 5 | (unnumbered; precursor "lead inbox" is Release 3) |

The dependency chain that falls out of this table: **a working lead-generating surface is a prerequisite for CRM Lite, and Option A is that surface.** Building Option A first doesn't just avoid the current blocker — it directly produces what Option C is missing (a posting response *is* a qualified lead candidate). Option B has no hard blocker but is strictly more valuable once Option A exists, since it has more real signal to aggregate and Release 4 is explicitly sequenced before Release 5 in the Blueprint's own table.

## G. Recommended Next Phase

**Option A — Market Connections / Opportunity Layer**, scoped to an MVP of **§18 Offer and Need Exchange** only.

Explicitly deferred out of this phase (same "MVP subset of a larger blueprint section" narrowing Phase 10 applied to the six-tier verification ladder):

- §19 Opportunity Radar's proactive push-notification matching engine — v1 ships as a browsable/filterable board, not a "we alert you" engine.
- §20 Collaboration Builder's multi-role project assembly (suggesting a full team of consultant/designer/developer/etc. for one project) — a distinct, larger feature that depends on Offers/Needs existing first.
- Paid tiers/monetization levers named in §18 (featured requests, priority matching) — no billing infrastructure exists anywhere in the platform yet; out of scope until a dedicated payments phase.
- Jobs/Tenders/Business Challenges — related but distinct posting types from the Blueprint's OPPORTUNITIES pillar; can extend the same collection later via `postingType` if warranted, not built now.

## H. Architecture Overview

Mirrors the Phase 12 pattern of a small number of new collections plus deliberate reuse of what already exists, rather than a parallel subsystem:

1. **New `market-postings` collection** — the Offer/Need listing itself. Owned directly by a `network-accounts` record (not polymorphic — a posting belongs to an account the same way a `Connection`'s `requestedBy` does, not to a specific business/professional profile document).
2. **Responding to a posting reuses the existing `connections` collection**, not a new response/matching table. A "Respond" action on a posting creates a `Connection` exactly as Phase 12's `Connect` button does today, with one addition: a nullable `originPosting` relationship field on `Connections` for provenance (which posting this connection came from, if any — `null` for direct profile-to-profile connects as today). Everything downstream — accept/decline, auto-created `Conversation`, ownership isolation, self-connect prevention, REST 403s — is inherited unmodified.
3. **Reporting reuses `content-reports`** — extend its existing polymorphic `target.relationTo` array (currently `["reviews", "recommendations", "messages"]`) to add `"market-postings"`, following the exact precedent already set when Phase 12 added `"messages"` to a collection built in Phase 10.
4. **Public browse/filter page** (`/network/opportunities` or similar) follows the Phase 9C directory pattern (shared filter-form/pagination components) rather than introducing a new UI paradigm.
5. **Rate limiting** on posting creation reuses `lib/cms/rate-limit.ts`'s existing `kind`-keyed sliding-window mechanism (new `kind: "market-posting-create"`), the same mechanism already proven under load during every phase's production validation.

## I. Collections Required

**New:**
- `market-postings` — fields: `owner` (relationship → `network-accounts`, required), `postingType` (select: `offer` | `need`, required), `category`/`subcategory` (reuse the same taxonomy fields as `business-profiles`/`professional-profiles` where possible, for consistent directory filtering), `title` (text, required), `description` (textarea, required), `location` (text, optional), `budgetRange` (text, optional — mainly for needs), `status` (select: `active` | `fulfilled` | `expired` | `closed`, default `active`), `expiresAt` (date, optional).

**Modified (additive only, no breaking changes):**
- `connections` — add nullable `originPosting` relationship field (→ `market-postings`).
- `content-reports` — extend `target.relationTo` to include `"market-postings"`.

**Access control (new file, following the `access-messaging.ts` / `access-trust.ts` naming precedent):** `access-market.ts` exporting `readPublishedPostings` (public read for `status: active`), `createPosting` (any authenticated network account, rate-limited), `updateOwnPosting`/`closeOwnPosting` (owner-only, direct ownership match — no polymorphic lookup needed since `owner` is a direct relationship, simpler than Phase 10's `getProfileOwnerId()` pattern), `denyDelete` (soft-close via `status`, not hard delete — matching the `Connections`/`Reviews` precedent of never allowing destructive deletes through the API).

## J. Security Considerations

- **Self-response prevention** — an account cannot respond to its own posting. Same pattern as Phase 12's self-connect prevention (UI hides the affordance; access-control layer independently rejects it, since UI-only enforcement was never trusted anywhere else in this codebase).
- **Ownership isolation** — only a posting's `owner` can edit or close it. Direct relationship match (simpler than Phase 10's polymorphic `profileKey` resolution, since postings aren't attached to a profile document).
- **Contact-info exposure** — per §58's "Introduction Economy" principle (reason/value/outcome before contact), a posting's public listing must not expose the owner's private contact fields; those only become reachable through an accepted `Connection`, exactly as profile-to-profile connects work today.
- **Spam/abuse** — rate-limited creation (reuses proven `rate-limit.ts` mechanism); reportable via the extended `content-reports` collection; staff moderation through the existing `/admin` review flow (Phase 10's precedent — no new RBAC layer needed).
- **REST access controls** — every new collection must be verified closed-by-default (403 on unauthenticated/cross-account REST access) before merge, matching the standard this project has enforced on every collection shipped since Phase 9A.
- **No payment/escrow** — this phase is listings and matching only; §18's monetization levers require billing infrastructure that doesn't exist yet and is explicitly out of scope (same boundary §40's Proposals section draws around itself: supports commercial transactions "without immediately requiring a full payment marketplace").

## K. Validation Plan

Same discipline applied to every phase since Phase 9A — implement → self-validate → independent release review from a clean checkout → merge → full production validation with real accounts → completion report. Required proof points for this phase specifically:

- Create an Offer; create a Need.
- Browse/filter postings publicly (by type, category, location).
- Respond to a posting → creates a `Connection` with `originPosting` set correctly.
- Accept a posting-originated connection → conversation created, identical to a direct-profile connect.
- Decline a posting-originated connection.
- Self-response block (UI + access-control layer, both).
- Ownership isolation: a non-owner cannot edit/close another account's posting.
- Posting expiration/closure removes it from public browse.
- Report a posting via the extended `content-reports` flow.
- REST access controls: unauthenticated and cross-account checks against `market-postings` return 403/404 as appropriate.
- Rate limiting on posting creation triggers correctly under rapid submission.
- Full regression sweep of Phases 9–12 (the same sweep performed in `PHASE12-PRODUCTION-DEPLOYMENT-REPORT.md`), since this phase touches the shared `connections` collection.

## L. Effort Estimate

**Medium — comparable to Phase 11, smaller than Phase 12.** Phase 12 had to design and build three new collections and an entire relationship/messaging subsystem from nothing; this phase adds one new collection and two small additive fields, deliberately routing everything else through infrastructure that is already built, already access-controlled, and already production-validated. Realistic shape: one design→implement→review→merge→validate cycle of similar duration to Phase 11, not Phase 12.

## M. Go / No-Go Recommendation

- **Option A (Market Connections / Offer & Need Exchange): GO.** No blocking prerequisite, high business value, medium complexity, and it directly produces the missing input (a lead candidate) that a future CRM Lite phase requires.
- **Option B (Market Pulse): DEFER, not reject.** Technically buildable today with zero new write-side collections, but strictly more valuable after Option A ships (more real signal to aggregate, matches Blueprint's own Release-4-before-Release-5 ordering). Natural candidate for Phase 14.
- **Option C (CRM Lite): NO-GO at this time.** Blocked on a missing prerequisite — no lead-generation mechanism exists on the platform today. Revisit once Option A (and/or a future dedicated "Request a Quote" contact-capture feature) is live and producing real inbound leads to manage; building the pipeline tool before the pipeline has anything in it would ship a feature with nothing to do.

---

*Per user instruction: this is a design document only. No branch was created, no code was written, no PR was opened. Awaiting direction to proceed with Phase 13 implementation (Market Connections / Offer & Need Exchange) or further discussion of this recommendation.*
