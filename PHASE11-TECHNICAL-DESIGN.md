# Phase 11 — Consumer Experience & Network Expansion: Technical Design

Design only, per this task's instruction — no implementation, no PR. Grounded in a fresh read of `THE_BUSINESS_Network_Blueprint_v3.docx` (parsed directly from `word/document.xml`, not recalled from memory), `PHASE9-COMPLETION-REPORT.md`, and `PHASE10-COMPLETION-REPORT.md`, plus the actual current codebase (`payload.config.ts`'s registered collections, `payload/access-trust.ts`'s proven access-control shape, `app/(network)/dashboard/layout.tsx`'s nav model, and `lib/cms/business-profiles.ts`'s filter shape) — every recommendation below is checked against what the code and the Blueprint actually say, not assumed.

## A. Executive Summary

Blueprint v3 §52 ("What to Build This Month") lists **"Consumer save and follow"** under `ACTIVATE IMMEDIATELY`, alongside registration, profiles, directory, and search — it was always meant to ship in Release 1 (Identity and Discovery), not deferred. It got deferred anyway: `PHASE9D-TECHNICAL-DESIGN.md` explicitly scoped Consumer Dashboard and Saved Profiles out of Phase 9D, and Phase 10 built Trust (verification/reviews/recommendations) on schedule per §53's Release 2 without touching this gap. Phase 11 is the belated Release-1 item, now built on top of a materially stronger foundation than it would have had in Phase 9 — real verified profiles, real reviews, and a proven access-control pattern (`access-trust.ts`) to extend rather than invent from scratch.

Of the nine items the user asked to evaluate, this design recommends building four as one coherent primitive set — **Saved Profiles** (absorbing Favorites and Bookmarks, which name the same action twice), **Follows** (Following Members + Following Businesses, as one polymorphic collection), **Saved Searches** (without match-alerting, which belongs to Blueprint's later Opportunity Radar), and a **minimal, read-time-computed Activity Feed** (not a persisted event log) — and explicitly deferring two: **Profile Collections** (Pinterest-style boards, a real feature but with no Blueprint mandate and no usage evidence yet to justify its complexity) and **persisted Activity Feed infrastructure** (justified only once the follow-graph is large enough that live queries stop being cheap). This is the same "one honest MVP subset" discipline `PHASE10-TECHNICAL-DESIGN.md` applied to verification (one tier, not six) and `PHASE9D-TECHNICAL-DESIGN.md` applied to the dashboard (Business/Professional only, Consumer explicitly deferred to "later").

## B. Recommended Phase 11 Scope

| # | User's item | Recommendation | Reasoning |
|---|---|---|---|
| 1 | Consumer Dashboard | **Build** — but as a universal dashboard extension, not a consumer-only silo | See §C |
| 2 | Saved Profiles | **Build** | Blueprint §52 explicit immediate-build item; §4.3, §15, §38 all name it |
| 3 | Favorites | **Do not build separately** — merge into Saved Profiles | No Blueprint text distinguishes "favorite" from "saved"; two toggles for the same action is confusing UX and doubles the collections/access-control surface for zero product value |
| 4 | Bookmarks | **Do not build separately** — merge into Saved Profiles | Same reasoning as Favorites; the only bookmarkable content type today is profiles, so "bookmark" and "save" are the same primitive until a second content type (products, articles) exists to bookmark |
| 5 | Following Members | **Build**, as part of one `follows` collection | Symmetric with Following Businesses; user-requested; natural extension of §4.3's "follow businesses" |
| 6 | Following Businesses | **Build**, same `follows` collection | Blueprint §15/§38 explicit: "Businesses I Follow", "Offers From Businesses You Follow" |
| 7 | Profile Collections | **Defer** | Not the same concept as Blueprint's "Curated Collections" (§14, staff-editorial lists like "Made in Lebanon" — a discovery feature, not a user save-folder feature). A user-created-boards feature is real but adds meaningful schema/UI complexity with no Blueprint mandate and, at today's near-zero live profile count, no usage signal to size it correctly. Revisit once Saved Profiles usage data shows people saving enough to want grouping |
| 8 | Saved Searches | **Build**, without alerting | Grounded in §14's filter list (already implemented 1:1 in `BusinessProfileFilters`/`ProfessionalProfileFilters`) and §19's mention of "more saved searches" as a premium tier of something more basic. Match-alerting is Opportunity Radar territory (§19, Release 3-4) and needs a notification pipeline this project doesn't have yet — out of scope here |
| 9 | Network Activity Feed | **Build minimal, read-time version only** | Blueprint's closest concept is the personalized homepage's "Offers From Businesses You Follow" / "Recommended for You" sections (§15) — curated/computed, not a stored chronological event log. A full persisted-event-log feed is real infrastructure investment unjustified at the current scale; a live, request-time query over already-existing data (follows + reviews + verification timestamps) delivers the same user value today for a fraction of the engineering cost |

**Net new collections: 3** (`saved-profiles`, `follows`, `saved-searches`) — fewer than Phase 10's 4, and structurally simpler (no approval workflow, no business-reply sub-flow).

## C. Consumer Dashboard Architecture

`app/(network)/dashboard/layout.tsx` currently branches nav on one condition: `hasProfile = accountType === "business" || "professional"`. Business/Professional get Profile + Portfolio + Verification + Reviews; everyone else (consumer, institution, diaspora) gets only Overview + Settings — a bare shell with nothing in it, which is precisely the gap Phase 11 closes.

Rather than build a second, parallel "Consumer Dashboard" nav model, this design extends the existing branch with a third, **universal** group available to every account type — because nothing in the Blueprint or in this codebase's access-control model restricts saving/following to consumer accounts specifically. A business owner researching suppliers has exactly the same reason to save a profile as a consumer does. Blueprint §4.3 describes *consumer* behavior, but that's describing the dominant use case, not an access restriction — the safer, simpler design is one shared mechanism, not a special case per account type.

```
navItems = [
  { href: "/dashboard", label: "Overview" },
  ...(hasProfile ? [Profile, Portfolio, Verification, Reviews] : []),   // unchanged from Phase 9D/10
  { href: "/dashboard/saved", label: "Saved" },                        // new, universal
  { href: "/dashboard/following", label: "Following" },                // new, universal
  { href: "/dashboard/saved-searches", label: "Saved Searches" },      // new, universal
  { href: "/dashboard/settings", label: "Settings" },
]
```

For accounts **without** a profile (consumer/institution/diaspora), `/dashboard` (Overview) is rebuilt as the "My Market" home Blueprint §15 describes: a short "Recently updated from businesses/professionals you follow" panel (§J) above the existing account-summary card. For accounts **with** a profile (business/professional), `/dashboard` is left exactly as Phase 9D built it — a business owner's Overview is about their own profile completion and reviews, not about who they follow; Saved/Following/Saved Searches live under their own dedicated nav items for every account type instead of crowding that page.

## D. Collections Required

Three new collections, following the exact shape and conventions `payload/collections/Reviews.ts`/`Recommendations.ts` and `payload/access-trust.ts` already established and proved correct in Phase 10 — no new patterns invented.

**`saved-profiles`**
```
owner: relationship → network-accounts, required
profile: polymorphic relationship → [business-profiles, professional-profiles], required
profileKey: text, hidden, derived in beforeChange exactly like Reviews' profileKey ("business-profiles:43")
createdAt: (Payload default timestamp)
indexes: [{ fields: ["owner", "profileKey"], unique: true }]
```

**`follows`**
```
owner: relationship → network-accounts, required
profile: polymorphic relationship → [business-profiles, professional-profiles], required
profileKey: text, hidden, derived the same way
createdAt: (Payload default timestamp)
indexes: [{ fields: ["owner", "profileKey"], unique: true }]
```

**`saved-searches`**
```
owner: relationship → network-accounts, required
profileType: select ["business", "professional"], required
label: text, required (user-facing name, e.g. "Bakeries in Tripoli")
filters: json, required — the exact BusinessProfileFilters/ProfessionalProfileFilters shape already used by
         lib/cms/business-profiles.ts / professional-profiles.ts ({ q, industry, category, location, service,
         language } or { q, skill, category, location, service, language }), so replaying a saved search is
         literally building a query string from this JSON — no new filter-serialization logic needed
createdAt: (Payload default timestamp)
```

**Why `saved-profiles` and `follows` are two collections, not one with a `kind` field**: they are structurally identical, which makes a single collection with a `kind: 'saved' | 'follow'` enum tempting. It's rejected here because their *access rules diverge* — saved-profiles is permitted to self-target (see §H) and is never counted or exposed to the target profile's owner; follows blocks self-targeting (see §I) and its aggregate count IS exposed to the target profile's owner. A single collection would need every access-control function to branch on `kind`, which is exactly the kind of conditional-inside-an-access-check this project's own Phase 10 lesson (`access-trust.ts`'s comment on the PR #17 self-review defect) warns against: access control should be as directly verifiable as possible. Two small, single-purpose collections with two simple, non-branching access functions are safer to audit than one collection with branching access logic, even at the cost of one extra collection.

## E. Database Changes

Three new `cms`-schema tables (plus their `_rels` polymorphic-relationship join tables, matching `reviews_rels`/`recommendations_rels`): `saved_profiles` (+`saved_profiles_rels`), `follows` (+`follows_rels`), `saved_searches` (no `_rels` table needed — no polymorphic field). No changes to any existing table — `business_profiles`/`professional_profiles` gain no new columns.

Specifically **not** adding a denormalized `followerCount` column to the profile collections. Reviews' star average is computed live on read and never stored (`PHASE10-TECHNICAL-DESIGN.md`/`lib/cms/trust.ts`'s `getPublishedReviews()`), and this design follows the same precedent for the same reason: a stored counter needs either a transactional increment/decrement on every follow/unfollow (real complexity, a new place to get an off-by-one wrong) or periodic reconciliation (staleness risk) — a `count()` query at read time is correct by construction and, at current profile counts, cheap. Revisit only if profile-detail-page load ever shows this query as a measurable cost.

Compound unique indexes: `(owner, profile_key)` on both `saved_profiles` and `follows` — the exact mechanism already proven live in production to correctly reject duplicates at the database level (`PHASE10-PRODUCTION-DEPLOYMENT-REPORT.md` §C, both for reviews and recommendations). `saved_searches` gets no uniqueness constraint — a user may legitimately want two saved searches for the same profile type with different filters, and even an accidental exact duplicate causes no data-integrity problem, only mild clutter, which is handled at the application layer (§K), not the database layer.

## F. Route Structure

No new public routes. Save/Follow/Save-Search actions are triggered from pages that already exist:

- `/network/businesses/[slug]`, `/network/professionals/[slug]` — add a "Save" button and a "Follow" button next to the existing Report affordance from Phase 10, each a real `<form>` Server Action (see §H's note on why, not a plain `useState` toggle).
- `/network/businesses`, `/network/professionals` — the existing filter form (`components/network/filter-form.tsx`) gains a "Save this search" button that submits the current query string's parsed filters to a new Server Action.

New dashboard routes, all under the existing `/dashboard/*` protection (`getNetworkUser()` gate, unchanged):

| Route | Purpose |
|---|---|
| `/dashboard/saved` | Two lists: Saved Businesses, Saved Professionals (tabbed or stacked, matching the existing Reviews/Recommendations two-section layout on `/dashboard/reviews`) |
| `/dashboard/following` | Two lists: Businesses I Follow, Professionals I Follow |
| `/dashboard/saved-searches` | List of saved searches, each a link that replays the filters as a `/network/businesses?...`/`/network/professionals?...` URL; delete action per row |

`/dashboard` (Overview) gains the read-time Activity panel for accounts without a profile, per §C/§J.

## G. Access Control Model

Every function below follows `access-trust.ts`'s existing `getProfileOwnerId()` helper unchanged — no new polymorphic-resolution logic.

```
saved-profiles:
  create: any network account (including staff); self-targeting IS allowed (see §H)
  read:   owner only — { owner: { equals: user.id } }; staff have no special read here (see §K)
  delete: owner only (unsave)
  update: none — a save is a fact, not an editable record; change it by delete+recreate

follows:
  create: any network account except the target profile's own owner (self-follow blocked,
          via the same createNonSelfContribution() pattern already proven for
          createReview/createRecommendation)
  read:   owner only for the individual record — { owner: { equals: user.id } }
  delete: owner only (unfollow)
  update: none, same reasoning as saved-profiles

saved-searches:
  create: any network account
  read:   owner only
  update: owner only (rename the label; filters are replaced wholesale, not merged)
  delete: owner only
```

The one deliberately asymmetric piece: a profile's **follower count** (not the follow list) must be readable by that profile's own owner, so a business can see "12 people follow you" on their dashboard. This is served by a small dedicated query function (`getFollowerCount(profileType, profileId)` in a new `lib/network/follows.ts`, mirroring `getPublishedReviews()`'s shape), not by relaxing `follows`' `read` access — the function runs with `overrideAccess: true` internally (server-only, never exposed as a generic collection query) and returns only a number, never the underlying records. This keeps the privacy boundary (§K) intact while still answering the one legitimate cross-account question that exists.

## H. Saved Profiles Design

A save is unconditional: any account, including a business saving its own profile, is allowed. Unlike a review or a follow, a save has no public or semi-public consequence — it never appears to anyone but its owner, is never counted on anyone's dashboard, and carries no trust or popularity signal. There is nothing to game and nothing to protect against, so no self-targeting check is added — adding one would be complexity with no corresponding risk it defends against, which this project's own review discipline (`PHASE10-RELEASE-REVIEW.md`) has consistently flagged as unnecessary when found in the other direction (over-engineering, not under).

- **Toggle UX**: implemented as a real `<form>` Server Action per profile card/detail page ("Save" → `saveProfileAction`, "Saved ✓" state → `unsaveProfileAction`), not a client `useState` toggle. This is a direct, concrete lesson carried forward from Phase 10's own disclosed finding: the Report button's plain `useState`-driven open/close toggle produced a genuinely inconclusive result under browser-automation testing for most of that validation pass, only later confirmed as a tooling artifact rather than an app defect. A form-submission-based toggle sidesteps that ambiguity entirely — every prior form-submission interaction in this project has tested reliably on the first attempt, every plain `useState` interaction has not. This is a cheap, proven way to avoid re-encountering that exact class of testing friction in Phase 11's own validation pass.
- **Duplicate prevention**: the `(owner, profileKey)` compound unique index, identical mechanism to Reviews/Recommendations, confirmed live in production to correctly reject duplicates via a genuine Postgres unique-violation surfaced as a friendly error.
- **Unsave = delete**, not a soft flag. There is no product reason to retain a history of profiles a user un-saved, unlike Reviews (immutable, retained for trust integrity) — a save is pure personal-organization data, and the simplest correct model is that it either exists or it doesn't.
- **List rendering** (`/dashboard/saved`): query `saved-profiles` where `owner = user.id`, populate the polymorphic `profile` relationship, group by `profileKey`'s collection prefix into two sections — reusing the exact list-card presentation already built for the directory pages (`components/network/...` card components), not a new visual design.

## I. Follows & Network Design

Structurally identical to Saved Profiles at the schema level, divergent at the access-control and product-meaning level (§D, §G):

- **Self-follow is blocked at the access-control layer**, not only hidden in the UI — reusing `createNonSelfContribution()`'s exact shape from `access-trust.ts` (resolve the target profile's real owner via `getProfileOwnerId()`, compare to the acting account, reject on match). This is the same lesson `access-trust.ts`'s own header comment traces back to PR #17: self-action prevention that lives only in a Server Action is bypassable by a direct REST/API call, and this project has independently, directly verified that exact bypass exists for self-review/self-recommendation before fixing it — the same verification step belongs in Phase 11's validation plan for self-follow (§M).
- **Follower count**, not follower list, is the only thing exposed to the target profile's owner (§G) — deliberately not shown publicly on the profile page itself in this phase (§L explains why).
- **"Businesses/Professionals I Follow" list** (`/dashboard/following`): same query shape as Saved Profiles, against the `follows` collection.
- **Follow button placement**: on `/network/businesses/[slug]` and `/network/professionals/[slug]`, next to Save — both are independent actions (a user can save without following, or follow without saving), not a single combined control, matching how Blueprint §4.3 lists "save profiles" and "follow businesses" as two separate consumer behaviors, not one.

## J. Activity Feed Design

Two real architectural options were weighed; this design recommends Option A for Phase 11 and documents Option B as the explicit future path, not a hidden or accidental limitation.

**Option A — read-time computed (recommended for Phase 11)**: on `/dashboard` (for accounts without their own profile — §C), a server-rendered panel queries the account's `follows` records, then for each followed `profileKey` runs three small, already-indexed lookups: (1) has `verifiedAt` changed in the last 30 days (reuses the `verified`/`verifiedAt` fields Phase 10 already added), (2) any `reviews` with that `profileKey` and `createdAt` in the last 30 days, (3) the profile's own `updatedAt` if within the last 30 days. Merge, sort by date descending, cap at 20 items, render as plain text lines ("Phase10 ProdVal Bakery was verified", "New review on Phase10 ProdVal Bakery", "Phase10 ProdVal Bakery updated their profile"). No new collection, no background job, no write-time fan-out — this is a handful of `find()` calls composed at request time, the same category of work `getPublishedReviews()`/`getFollowerCount()` already do.

**Option B — persisted event log (explicitly deferred)**: a dedicated `activity-events` collection, written to on every followable event (new review, verification approval, profile publish), with either a fan-out-on-write model (an `activity-feed-entries` row created per follower at write time — fast reads, expensive/complex writes, real risk of a missed fan-out write leaving a follower's feed silently incomplete) or a fan-in-on-read model with its own caching layer. This is genuine infrastructure investment — the kind of thing worth building once there's a real follow-graph to make it pay for itself. At today's scale (production currently has, per the last completion report, effectively zero real non-test profiles), Option A delivers the identical user-visible result for a small fraction of the engineering and review cost, and nothing about Option A's data model blocks migrating to Option B later — the `follows` collection itself doesn't change either way.

**Explicitly not built this phase**: push notifications, email digests, or any delivery mechanism for feed content beyond the dashboard panel itself. That's the same notification-pipeline gap that keeps Saved Search alerting (§B, item 8) out of scope, and belongs together with Opportunity Radar in a later release per Blueprint §53's own sequencing (Release 3-4, after "Engagement and SaaS" infrastructure exists).

## K. Security Model

- **Self-follow prevented at the Payload access-control layer**, independently verifiable via the same direct `overrideAccess: false` probe methodology `PHASE10-RELEASE-REVIEW.md` §B already used and documented for self-review — Phase 11's validation plan (§M) re-runs that exact class of probe against `follows`.
- **Privacy of saved/follow data**: both collections are owner-only readable, with no staff back-door beyond the aggregate, anonymous follower-count function (§G). This is directly grounded in Blueprint §37 (Market Pulse): *"THE BUSINESS should never sell private or individually identifiable personal information."* A list of who saved or follows a given profile is exactly that kind of individually identifiable data about a *different* account (the follower, not the profile owner) — so even staff moderation access, which every other Phase 10 collection grants for content-moderation reasons, is deliberately **not** extended here, since there is no public content in these collections to moderate.
- **Saved-search growth control**: a simple application-level cap (e.g., 20 saved searches per account, enforced in the create Server Action, not a database constraint) rather than provisioning the `rate-limit-events` mechanism Phase 9A built for login/email-change abuse — that table is IP-hash-based and designed for unauthenticated-endpoint brute-force protection; saved-search creation is an authenticated, owner-scoped, low-consequence action where a soft count cap is the right-sized control, not a heavier mechanism built for a different threat model.
- **No new authentication/session surface**: every new route sits under the existing `/dashboard/*` layout's `getNetworkUser()` gate, unchanged since Phase 9A. No new cookies, no new session logic.
- **Polymorphic-relationship ID coercion**: Phase 10's implementation found and fixed a real bug where a `FormData`-derived string ID failed Payload's polymorphic-relationship validator against a numeric column. Every new Server Action in Phase 11 that writes a `{ relationTo, value }` polymorphic field (`saveProfileAction`, `followProfileAction`) explicitly coerces the target ID with `Number(...)` before the `payload.create()` call, applying that lesson from the start rather than rediscovering it live.

## L. Moderation Considerations

Unlike every Phase 10 collection, none of Saved Profiles, Follows, or Saved Searches produce any content visible to anyone but their own owner — there is no public text, rating, or claim for a `content-reports`-style flow to moderate, and no staff review queue is proposed for any of the three.

The one real, if low-priority, integrity question: **could follow counts be gamed** — a business creating throwaway accounts to inflate its own follower count? This is a genuine risk in principle, but this design deliberately **does not surface follower count publicly** in Phase 11 (§G, §I) — it is visible only to the profile's own owner, privately, on their own dashboard. A number only the profile owner can see has no audience to deceive, so there is nothing to game yet. This is a load-bearing scope decision, not an oversight: Phase 10 established verified badges and reviews as the Network's public trust signals, each backed by a real anti-gaming mechanism (staff approval for verification; DB-level one-review-per-account for reviews). Adding a second, ungated public number this early — before any anti-gaming measure exists for it — would let a manipulable number sit next to two carefully-protected ones on the same profile page, undermining the credibility Phase 10 just established. If a public follower count is wanted in a later phase, it should ship with its own anti-gaming design (e.g., only counting followers from verified/active accounts), not as a Phase 11 afterthought.

## M. Validation Plan

Following the same "verify, don't trust" discipline used throughout Phases 9 and 10 — real accounts via `/register` with real, independently-checkable disposable-email inboxes, live browser interaction, direct database queries to confirm cleanup, never relying on an in-app success message alone:

1. **Standard gates**: `tsc --noEmit`, lint, tests, build — all fresh, matching every prior phase.
2. **Saved Profiles**: save a profile via the real UI, confirm it appears on `/dashboard/saved`; attempt a duplicate save, confirm rejection via the same friendly-error mechanism proven for reviews; unsave, confirm it disappears and the DB row is actually deleted (not soft-flagged); confirm a business can save its own profile without error (§H's deliberate allowance).
3. **Follows**: follow a profile, confirm it appears on `/dashboard/following` and the target's follower count increments by exactly one, visible only on that target's own dashboard; attempt a duplicate follow, confirm rejection; attempt self-follow via the real UI (confirm no Follow button renders on your own profile) **and** via a direct `overrideAccess: false` probe impersonating the profile owner (confirm the access-control layer itself rejects it, not only the UI) — this second check is the specific lesson Phase 10's PR #17 precedent requires, not optional.
4. **Saved Searches**: build a filter combination on `/network/businesses`, save it with a label, confirm it appears on `/dashboard/saved-searches`, click it, confirm the replayed URL reproduces the exact same filtered result set; confirm the per-account cap (§K) is enforced once past the limit.
5. **Activity Feed**: follow a profile, have that profile's owner post a review reply or get verified (reusing the exact staff-approval flow already proven in Phase 10), confirm the event appears in the follower's `/dashboard` panel within the expected 30-day window and disappears once outside it.
6. **Dashboard nav regression**: confirm Business/Professional accounts see Profile/Portfolio/Verification/Reviews unchanged, plus the three new universal sections; confirm Consumer/Institution/Diaspora accounts, which previously saw only Overview + Settings, now see the three new sections plus a populated Overview.
7. **Full Phase 9/10 regression**: homepage, authentication, directories, existing profile pages, reviews/recommendations/verification/reporting — unaffected by this purely additive diff, confirmed by diff review before re-testing live.
8. **Test-data cleanup**: every account/profile/save/follow/saved-search created during validation deleted and confirmed at 0 remaining via a direct database query, matching the exact methodology `PHASE10-PRODUCTION-DEPLOYMENT-REPORT.md` §D used (including for the orphaned account discovered mid-session there) — not assumed clean from the UI alone.

## N. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Self-follow used to inflate a business's own follower count | Low (count is private-only, §L) | Blocked at access-control layer regardless; re-verified via direct probe (§M) |
| Race condition on simultaneous duplicate save/follow | Low | DB-level compound unique index — the exact mechanism already proven correct in production for Reviews/Recommendations |
| Activity Feed (Option A) query cost growing with follow-graph size | Low today, real at scale | Explicit Option B migration path documented (§J); not a silent limitation |
| Saved Searches storage growing unbounded per account | Low | Application-level per-account cap (§K) |
| Follower-count function accidentally exposed as a general query (leaking the underlying list) | Low, but consequential if it happened | Implemented as a single narrow function returning only a number, never a generic collection endpoint; explicitly called out in code review guidance for this phase |
| Scope creep into Profile Collections or persisted Activity Feed mid-implementation | Medium (process risk, not technical) | Both explicitly deferred in this document with stated reasoning — implementation should treat "not in §B's included list" as a hard boundary, the same discipline Phase 10 held for the five deferred verification tiers |

No risk identified here rises to the "Medium-severity, needs a mitigation before merge" bar Phase 9D/10 applied to their own real findings (the email-delivery gap, the transaction-hang bug) — everything above is either already mitigated by an existing, proven mechanism or is a scope-discipline concern rather than a technical one.

## O. Effort Estimate

Comparable in shape to Phase 10 but smaller in a few concrete ways: 3 new collections vs. 4, no approval-workflow hook (Phase 10's most complex single piece — the `NaN` and transaction-hang bugs both came from `VerificationRequests`' `afterChange` hook, which has no analog here), no business-reply sub-flow, and every access-control function is a direct reuse of an already-proven shape rather than a new one.

- Collections + access control (`saved-profiles`, `follows`, `saved-searches`, `access-trust.ts` extensions): smaller than Phase 10's collections/access-control work.
- Server Actions + validation schemas (save/unsave, follow/unfollow, save-search/delete-search): comparable to Phase 10's four-action set, minus the business-reply complexity.
- Dashboard UI (`/dashboard/saved`, `/dashboard/following`, `/dashboard/saved-searches`, Overview panel): comparable to Phase 10's dashboard work, reusing existing card/list components rather than designing new ones.
- Public-page integration (Save/Follow buttons, "Save this search" on the filter form): smaller than Phase 10's public trust-presentation layer — two buttons and one form addition, not a full reviews/recommendations UI.
- Validation (quality gates, browser validation, security probes, production deployment + validation, cleanup): comparable to Phase 10's, following the identical methodology.

**Overall: roughly 70-80% of Phase 10's total effort** — fewer moving parts, no novel hook-transaction complexity to debug, and every access pattern is a direct extension of code that already shipped and was independently verified correct.

## P. Go / No-Go Recommendation

**GO**, with the scope as narrowed in §B: Saved Profiles (absorbing Favorites/Bookmarks as one primitive), Follows (Businesses + Members as one polymorphic collection), Saved Searches (without alerting), and a minimal read-time Activity Feed panel — Profile Collections and persisted Activity Feed infrastructure explicitly deferred, not silently dropped.

Rationale: this is the Blueprint's own designated next step (§52 names it an immediate-build item that simply never shipped in Phase 9), every new collection and access-control function is a direct, low-risk extension of a pattern Phase 10 already built and proved correct in production, no new authentication/session surface is introduced, and the two deferred items are deferred for stated, reasoned cause — not because they're hard, but because building them now would be complexity ahead of evidence, the same discipline this project has applied at every phase boundary so far. No blocking risk was identified in §N that isn't already mitigated by a proven, existing mechanism.

Recommend proceeding to implementation only on explicit approval of this design, per the phase-based workflow's standing rule.
