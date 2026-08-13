# Phase 10 — Trust & Verification: Technical Design

Design only, per instruction — no code, no collections, no PR. Reviewed before writing this: `Master Plan/THE_BUSINESS_Network_Blueprint_v3.docx` (§5 Ecosystem Structure's TRUST pillar, §10 THE BUSINESS Trust System, §11 Trust Passport, §12 Proof of Work, §13 Reviews/Recommendations/Resolution, §50 Admin and Moderation, §53 Recommended Release Sequence, §56 Rules That Protect Trust), `PHASE9-COMPLETION-REPORT.md` (final architecture state, remaining Blueprint work), and `EMAIL-INFRASTRUCTURE-VALIDATION-REPORT.md` (confirms the notification email pipeline this phase will lean on is now proven working end-to-end in production).

## Scope

Explicitly named for this phase, per instruction: **Business Verification, Professional Verification, Recommendations, Reviews, Trust Architecture.**

The Blueprint's own Trust System (§10-§13) is considerably larger than this list — it describes a six-tier verification ladder (Contact/Identity/Business/Credential/Portfolio Confirmed/Trusted Member), a portable shareable "Trust Passport" (URL/QR/PDF/NFC/email-signature), client-confirmed "Proof of Work," and a formal Resolution Center for review disputes. Building all of that now would repeat the mistake Phase 9D's design explicitly avoided (see `PHASE9D-TECHNICAL-DESIGN.md`'s own narrowing) — shipping a wide, shallow feature instead of a narrow, real one. This design deliberately implements a single, honest verification tier and a working review/recommendation system, and defers the rest.

**In scope:**
- One verification tier per profile type (Business Verified / Professional Verified) — a staff-reviewed application, approved or rejected, resulting in a visible badge. Not the six-tier ladder.
- Reviews (rated, consumer-facing) and Recommendations (unrated, peer/client endorsement) on both Business and Professional profiles.
- Basic reporting + a staff moderation queue for both.
- A small "Trust Architecture" — the composite of signals (verified badge, review average, review count, recommendation count, member-since, email-verified) shown together on a profile, computed live, not stored.

**Explicitly out of scope, deferred:**
- The full six-tier verification ladder (Credential Verified, Portfolio Confirmed via client-side project confirmation, algorithmic "Trusted Member" status).
- Proof of Work / client-confirmed projects (Blueprint §12) — has real prerequisites this phase doesn't build (a way for the "client" to be a real, matched account).
- The shareable Trust Passport artifact (URL/QR/PDF/NFC/email signature, Blueprint §9/§11) — a separate, larger feature; this phase's trust signals appear only inline on the existing profile pages.
- A formal Resolution Center workflow (Blueprint §13's Issue → Notify → Resolution Period → Outcome pipeline) — this phase ships reporting + staff removal, not a structured dispute process with defined SLAs.
- Response Rate as a trust signal — requires a messaging system (Blueprint Release 3+), not built yet.
- Any payment-gated verification tier or membership plan — Blueprint's own principle (§10: "payment must never guarantee approval") plus the fact that monetization (§43-44) is a later release regardless.
- The granular 8-role admin system (Blueprint §50: Verification Officer, Community Moderator, etc.) — this phase's moderation actions use the existing `admin`/`editor` roles on `users`, already proven throughout Phase 9. Building out role-specific permissions is a separate, later concern.

## A. Architecture

Builds entirely on the existing Phase 9 foundation — no new app, no new auth system, no new session model:

- Three new Payload collections (`verification-requests`, `reviews`, `recommendations`), each following the polymorphic-`profile` + flat-`owner` pattern already proven by `portfolio-projects` (`payload/collections/PortfolioProjects.ts`) — a relation to `["business-profiles", "professional-profiles"]` for *what it's about*, and a flat relation to `network-accounts` for *who created it*, reusing the exact access-control comparison style already established in `payload/access-profiles.ts` rather than inventing a new one.
- Two new denormalized fields on `business-profiles` and `professional-profiles`: `verified` (checkbox) and `verifiedAt` (date) — set only by the verification-approval path, never client-writable, mirroring `NetworkAccounts.ts`'s existing `status` field pattern (`access: { update: staffOnlyField }`).
- Server Actions layer (new `lib/network/trust-actions.ts` or split into `verification-actions.ts`/`review-actions.ts`, matching the existing split between `actions.ts` and `profile-actions.ts`) — wraps Payload's Local API with the business rules Payload's declarative access control can't express alone (no self-review, one review per reviewer per profile, throttled resubmission), exactly the same division of responsibility already used for registration/login/email-change.
- Public surface: existing public profile pages (`app/(app)/network/{businesses,professionals}/[slug]/page.tsx`) gain a Trust Architecture section (badge + review/recommendation list + a "Write a review"/"Recommend" CTA for logged-in non-owners) — additive to files that already exist, not new routes.
- Owner surface: new dashboard pages under the existing `/dashboard` shell — `/dashboard/verification` (request/track verification) and a "Reviews & Recommendations" section (view received, reply to reviews) — reusing `DashboardNav`, the existing account-type-aware layout, and the existing auth gate. No new session/auth work.
- Staff surface: the three new collections are **visible** in the Payload admin nav (unlike `network-accounts`, which is deliberately hidden) — staff need to work with verification applications and reported content directly, and there is no security reason to hide them the way there was for the public-auth collection.
- Notifications: verification-decision and (optionally, rate-limited) new-review emails reuse `lib/email/send.ts` — the exact pipeline `EMAIL-INFRASTRUCTURE-VALIDATION-REPORT.md` just proved delivers correctly in production. No new email infrastructure.

## B. Collections

### `verification-requests`
| Field | Type | Notes |
|---|---|---|
| `owner` | relationship → `network-accounts` | The submitting account — set server-side, never client-editable after create, same pattern as every other `owner` field in this codebase |
| `profile` | polymorphic relationship → `business-profiles` \| `professional-profiles` | The profile being verified |
| `statement` | textarea, required | Submitter's explanation of what they're claiming (e.g. business registration details, professional license info) — free text, not a structured KYC form in this phase |
| `document` | upload → `media`, optional | Supporting evidence, if the submitter chooses to attach one |
| `status` | select: `pending` \| `approved` \| `rejected`, default `pending` | |
| `reviewNote` | textarea, optional | Staff-only, visible to the submitter on rejection (the *reason*, per Blueprint §10's transparency requirement) |
| `reviewedBy` | relationship → `users`, optional | Staff member who decided |
| `reviewedAt` | date, optional | |

### `reviews`
| Field | Type | Notes |
|---|---|---|
| `owner` | relationship → `network-accounts` | The reviewer |
| `profile` | polymorphic relationship → `business-profiles` \| `professional-profiles` | The target |
| `rating` | number, 1–5, required | |
| `body` | textarea, required | |
| `status` | select: `published` \| `removed`, default `published` | No pre-moderation queue — see §E for why |
| `businessReply` | textarea, optional | Settable only by the target profile's owner (field-level access, see §D) |
| `repliedAt` | date, optional | |
| `createdAt` | auto | |

### `recommendations`
| Field | Type | Notes |
|---|---|---|
| `owner` | relationship → `network-accounts` | The recommender |
| `profile` | polymorphic relationship → `business-profiles` \| `professional-profiles` | The target |
| `body` | textarea, required | No rating — a qualitative endorsement, per Blueprint §13's distinction from star-rated Reviews |
| `status` | select: `published` \| `removed`, default `published` | |
| `createdAt` | auto | |

### `content-reports`
One shared reporting collection for both Reviews and Recommendations, rather than two near-duplicate ones:

| Field | Type | Notes |
|---|---|---|
| `reporter` | relationship → `network-accounts`, required | Anonymous reporting is deliberately not allowed — see §E |
| `target` | polymorphic relationship → `reviews` \| `recommendations` | |
| `reason` | select: `spam` \| `fake` \| `harassment` \| `off-topic` \| `other`, required | |
| `note` | textarea, optional | |
| `resolved` | checkbox, default false | |
| `resolvedBy` | relationship → `users`, optional | |
| `createdAt` | auto | |

### Modified: `business-profiles`, `professional-profiles`
Two additive fields on each (identical on both):

| Field | Type | Notes |
|---|---|---|
| `verified` | checkbox, default false | `access: { update: staffOnlyField }` — set only via the verification-approval Server Action, using `overrideAccess: true` server-side, exactly like `NetworkAccounts.status` |
| `verifiedAt` | date, optional | Same access restriction |

## C. Database Changes

Four new tables (`verification_requests`, `reviews`, `recommendations`, `content_reports`) generated by Payload/Drizzle from the collection configs above, plus two new nullable columns on each of `business_profiles` and `professional_profiles`. All additive — no existing column altered, no backfill required, no migration risk to existing rows (new columns default to `false`/`null`).

One deliberate schema-level constraint beyond what Payload's field config alone provides: a **unique index on `(owner, profile)` for `reviews`**, enforced at the Postgres level (via `drizzle-kit`'s generated migration or a small custom migration if the field config alone doesn't produce it), not just checked in the Server Action. The reasoning: an app-level "does a review already exist?" check in the Server Action has an unavoidable check-then-create race window under concurrent requests; a real database constraint closes it the way `network-accounts.email`'s `unique: true` already does elsewhere in this schema. The same constraint is applied to `recommendations` for consistency (`(owner, profile)` unique), so one account can't recommend the same profile repeatedly to inflate its count.

No changes to `network-accounts`, `rate-limit-events`, or any Phase 9 table's existing shape.

## D. Security Model

- **No self-review, no self-recommendation, no self-verification-approval** — enforced at the actual Payload access-control layer, not only in the Server Action, following the exact lesson `payload/access-profiles.ts`'s own top comment documents (PR #17's release review finding: a direct REST/GraphQL call bypasses UI-path convenience checks, so the real enforcement point is `access.create`). Concretely: `reviews`/`recommendations`' `create` access function loads the target profile's `owner` and rejects if it equals `req.user.id`; `verification-requests`' `update` access is staff-only, full stop — a submitter can never transition their own request to `approved`.
- **Ownership-scoped reads for private states**: `verification-requests` read = owner of the request, or staff (same `ownAccountOrStaff`-style pattern) — a rejected/pending application is not publicly visible, only the resulting `verified` flag on the profile is.
- **Public read for published reviews/recommendations**: unlike `portfolio-projects` (which denies anonymous REST/GraphQL read outright and relies on the public page's own `overrideAccess` local-API call, since it has no independent publish state of its own to check), `reviews`/`recommendations` genuinely need to be publicly readable — that's the whole point of a consumer trust signal. Their `read` access is a real, open `Where` filter (`status: { equals: "published" }`, or `true` for staff), not a values-only bypass. This is a deliberate, explained departure from the portfolio pattern, not an oversight.
- **Field-level access for `businessReply`**: a custom `FieldAccess` function that loads the review's `profile` and checks `profile.owner === req.user.id` (or staff) — the same category of check as `verification-requests`' polymorphic-profile ownership check, reused rather than reinvented.
- **`verified`/`verifiedAt` write protection**: `access: { update: staffOnlyField }` on both new profile fields, identical to the existing `NetworkAccounts.status` field — a network account can never set its own verified flag via any API path, including direct REST.
- **Rate limiting**: verification (re)submission and content reporting both go through the existing `checkAndRecordThrottle`/`rate-limit-events` mechanism (new `kind` values: `network-verification-request`, `network-content-report`) — reusing Phase 9A's proven throttle rather than building a second one.
- **Account-type**: no restriction on who may leave a review or recommendation beyond "not the profile's own owner" — the Blueprint doesn't scope this by account type (a Business account recommending a supplier is exactly the "Supplier and partner recommendations" case named in §13), so an artificial restriction here would contradict the source document rather than simplify it.

## E. Moderation Model

- **No pre-publication moderation queue for reviews/recommendations.** They publish immediately on submission. This matches the "reactive-moderation model" phrase already present in this codebase's own `NetworkAccounts.ts` comment (for account suspension) and avoids a moderation bottleneck this project has no staffing model for yet. Trust is protected reactively — via one-review-per-account, no-self-review, and reporting — not via a pre-approval gate.
- **Reporting requires login** (`reporter` relationship is required, not left anonymous) — anonymous reporting invites trivial abuse (mass-reporting a competitor's genuine reviews) with no accountability.
- **Staff queue**: reported content (`content-reports` where `resolved: false`) is visible and actionable directly in the Payload admin panel — no separate custom moderation UI is built this phase. Staff mark a report `resolved`, and separately may set the underlying review/recommendation's `status` to `removed` if it violates policy.
- **The Blueprint's explicit rule is enforced procedurally, not technically**: "Honest negative reviews cannot be removed merely because they are unfavorable" (§13) is a human-judgment policy, not something code can check. This design doesn't attempt to encode it; it's documented here and should be written into a short internal moderation guideline (not code) before this phase ships, so staff have a consistent standard.
- **Verification review** happens the same way — staff open a `verification-requests` document in admin, read the `statement`/`document`, and set `status` to `approved` (which triggers the Server Action-equivalent side effect of setting `verified`/`verifiedAt` on the profile — see the implementation-time note below) or `rejected` with a `reviewNote`.
- **Implementation-time note, not a design gap**: setting `verified` on the *profile* as a side effect of approving a *verification-requests* document requires either a Payload `afterChange` hook on `verification-requests` (runs regardless of whether the transition happened via admin UI or REST) or a dedicated Server Action if approvals are meant to go through the app's own UI instead of `/admin`. Given staff already work inside `/admin` for moderation in this design, an `afterChange` hook is the more robust choice — it fires consistently no matter which surface staff use.

## F. UX Flows

**Business/Professional Verification**
`/dashboard/verification` (new page) → "Request verification" → statement textarea + optional document upload → submit → "Pending review" state shown, resubmission throttled (1/24h if rejected) → staff decision in `/admin` → dashboard reflects `Verified` (with the `verifiedAt` date and a link to a static "What does Verified mean?" page, per Blueprint §10's transparency requirement) or `Rejected` (with the staff `reviewNote`) → email notification either way, via the now-confirmed-working `lib/email/send.ts`.

**Verified badge display**
Business/Professional directory cards and detail pages show a small badge when `verified === true`. Hover/click reveals: what was checked (staff-submitted statement review), when (`verifiedAt`), and that it doesn't guarantee ongoing quality or dispute outcomes — directly satisfying Blueprint §10's transparency list, scoped honestly to what this MVP tier actually does.

**Leaving a review**
On a published Business/Professional profile page, a logged-in non-owner account sees "Write a review" → star rating (1-5) + body → submit → appears immediately under the profile, average rating recalculated live (computed on read, not stored, consistent with this project's existing profile-completion pattern of never persisting a derived value). Attempting a second review on the same profile is rejected client-side (button becomes "Edit not available — you already reviewed this profile, contact support to change it" — no self-service edit, per §D) and server-side (the unique constraint).

**Leaving a recommendation**
Same entry point, adjacent to the review CTA, body-only form, same one-per-profile constraint.

**Replying to a review**
From the dashboard's Reviews section, the profile owner sees their received reviews and a single "Reply" action per review (once set, becomes read-only — no reply-editing loop).

**Reporting**
A small "Report" affordance under every review/recommendation, visible to logged-in accounts only, opens a reason selector + optional note, submits to `content-reports`.

## G. Validation Plan

Same four-gate discipline as every prior phase (`tsc --noEmit`, `next lint`, `node --test`, `next build`), then live browser validation covering:

1. Verification: submit as owner → confirm pending state; attempt to approve own request via direct REST call as the submitter → confirm rejected (proves the access-control layer, not just the UI, blocks self-approval); approve as staff in `/admin` → confirm `verified`/`verifiedAt` appear on the public profile and the dashboard.
2. Reviews: submit as a non-owner account → confirm it appears publicly and the average updates; attempt a second review from the same account on the same profile → confirm rejected both client-side and via a direct REST call (proves the DB constraint, not just app logic); attempt a review as the profile's own owner → confirm rejected.
3. Recommendations: same shape as reviews, minus the rating-average check.
4. Business reply: confirm only the profile owner can set `businessReply` (direct REST attempt as a different account → rejected).
5. Reporting: submit a report → confirm it appears in the staff moderation queue; confirm anonymous (logged-out) report submission is rejected.
6. Regression: confirm Phase 9's dashboards, portfolio, directory/search/filter/pagination, and the duplicate-ID/email flows are unaffected — diff review plus a light re-run of the existing validation checklist, not a full re-litigation.
7. Draft-profile invisibility: confirm reviews/recommendations/verification badges never leak for an unpublished profile (mirrors the existing 9C draft-invisibility guarantee).
8. Notification email: confirm verification-decision emails actually arrive at a real, independently-checked inbox — same method as `EMAIL-INFRASTRUCTURE-VALIDATION-REPORT.md`, not just an in-app success message.
9. Cleanup: all test accounts/profiles/reviews/recommendations/verification-requests created for validation deleted and confirmed at 0 remaining, as in every prior phase.

## H. Risks

| Risk | Severity | Mitigation / disclosure |
|---|---|---|
| Fake or sock-puppet reviews | Medium | One-review-per-account (DB-enforced) + no self-review + reporting reduces but does not eliminate this; full anti-fraud (device fingerprinting, velocity checks) is out of scope |
| MVP verification is staff judgment on submitted text/optional document, not real registry/KYC integration | Medium | Must be transparently labeled as such in the badge tooltip (§F) — overstating what "Verified" means would itself violate Blueprint §56's own rule ("Credentials should not be displayed as verified without proper review") |
| Inconsistent moderation decisions without a written policy | Low-Medium | Recommend a short internal moderation guideline exists before launch (non-code deliverable) |
| Legal/defamation exposure from user-generated review content | Low-Medium | Standard UGC risk for any review platform; mitigated by reporting + removal capability, not novel to this phase |
| Notification email is a new *use* of the now-fixed pipeline, not a re-validation of it | Low | `EMAIL-INFRASTRUCTURE-VALIDATION-REPORT.md` proved the pipeline works; this phase's own validation plan (§G item 8) still re-proves it for these specific new email templates, not assumed by association |
| Reviewer identity is just "any network account," not a proven customer relationship | Low | Consistent with Blueprint's own MVP framing (Release 2 is "Reviews," not "Confirmed Transaction Reviews" — that distinction is Proof of Work, explicitly deferred) |

No High or Critical risk identified for this narrowed scope.

## I. Effort Estimate

Phase 9D (dashboard-only, one new secure flow) took ~3.5-4.5 days. This phase is broader — it spans three surfaces (public profile pages, owner dashboard, staff admin) and four new collections/tables instead of zero — but each piece individually reuses proven patterns (polymorphic profile relation, Server Action + access-control split, existing throttle, existing email pipeline, existing admin panel for moderation UI rather than a custom one).

Estimate: **~6-8 days** — roughly 1.5-2 days for collections/schema/access control, 2 days for the verification submission + approval flow (dashboard + admin + email), 2-2.5 days for reviews/recommendations (public UX + dashboard reply + one-review constraint), 1 day for reporting/moderation queue, remainder for the four-gate validation pass and both reports.

## J. Go/No-Go Recommendation

**GO**, with the scope boundary in this document held firm during implementation. The narrowed scope (one verification tier, not six; reactive moderation, not a pre-approval queue; existing admin roles, not a new RBAC system; no Trust Passport artifact) is what makes this achievable in the estimated window without repeating past mistakes — every prior phase in this project that stayed disciplined about scope shipped cleanly; the one place this session found a real defect (the duplicate-ID bug) was a small implementation slip, not a scope failure. Recommend the same discipline here: if mid-implementation pressure appears to add Proof of Work, the Trust Passport, or granular admin roles "while we're in here," treat that as a new phase, not scope creep into this one.

Per instruction, no implementation begins from this document — it is design only, pending separate approval.
