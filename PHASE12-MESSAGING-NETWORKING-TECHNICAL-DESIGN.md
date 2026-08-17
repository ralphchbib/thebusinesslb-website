# Phase 12 Technical Design — Messaging & Networking

**Status: design only.** No code was written, no branch was created, no PR was opened for this document.

**Source of truth:** `THE_BUSINESS_Network_Blueprint_v3.docx`, read directly for this document (extracted and searched fresh — not recalled from the prior session's summary). `PHASE11-COMPLETION-REPORT.md` and `PHASE12-TECHNICAL-DESIGN.md` (Market Pulse, accepted) were re-read in full. Every collection, access-control function, and precedent cited below was verified against the current codebase (`payload/collections/`, `payload/access-social.ts`, `payload/access-network.ts`, `lib/network/`), not assumed.

---

## A. Executive Summary

`PHASE12-TECHNICAL-DESIGN.md` (Market Pulse, already accepted) concluded that Market Pulse should *not* be built next, because Blueprint §53's Recommended Release Sequence places it in Release 5 (last) while Messaging sits in Release 4 with zero unbuilt prerequisites, and because §38's SaaS Dashboard Structure already names "Messages" as a Professional- and Consumer-dashboard section that Phases 9–11 never built. This document is that recommendation's follow-through: the full technical design for Messaging & Networking.

A full read of the Blueprint surfaces a design principle that shapes everything below and was not visible from the single §37 quote used in earlier passes: **§58's "Introduction Economy"** —

> "Warm, purposeful introductions instead of random connection requests. Every introduction includes reason, value offered, expected outcome and type of connection. More respectful and commercially effective than unsolicited messaging."

Combined with **§34 Business Circles** ("All connections require approval from both sides, creating a relationship network rather than a simple directory") and **§56's rule** ("Users must control communications and notifications"), the Blueprint describes something structurally different from a LinkedIn-style "Connect" button plus open inbox. It describes a **gated model**: a connection request *is* the structured introduction (reason, value, expected outcome, type), nothing resembling free messaging exists until that request is accepted, and once accepted a conversation opens. This document designs exactly that model — not because it's the only workable one, but because it's the one the Blueprint text actually specifies, and Blueprint v3 remains the source of truth per this phase's instructions.

## B. Blueprint Alignment

Sections read and verified directly against the extracted document text (not from memory):

- **§5 Complete Ecosystem Structure** — the CONNECTIONS pillar: Messaging, Quote Requests, Bookings, Introductions, Matchmaking, Concierge, Collaboration Builder. This document covers the first and fourth items (Messaging, Introductions) directly; Quote Requests/Bookings/Matchmaking/Concierge/Collaboration Builder are named but out of scope for Phase 12, noted where they intersect.
- **§34 Business Circles** — the Blueprint's actual name for what this phase's scope calls "Connections." Verbatim: *"Users create confirmed relationship groups around real commercial connections. All connections require approval from both sides, creating a relationship network rather than a simple directory."* Circle Types: My Suppliers, My Service Providers, My Business Partners, My Customers, My Project Team, My Mentors, My Preferred Businesses, My Alumni Network, My Local Business Community. Public display: "Works With," "Supported By," "Member Of," "Recommended By," "Official Partner."
- **§58 Signature Creative Features, "Introduction Economy"** — quoted in full above. This is the single most load-bearing sentence for this design: it explicitly contrasts purposeful introductions against *both* random connection requests *and* unsolicited messaging, and lists the required fields of a proper introduction (reason, value offered, expected outcome, type of connection) — which become the required fields of the Connection Request collection in Section E.
- **§38 SaaS Dashboard Structure** — checked field-by-field:
  - Professional Dashboard Sections: "...Opportunities, **Messages**, Bookings, Reviews..."
  - Consumer Dashboard Sections: "...Quote Requests, Bookings, **Messages**, Reviews, Businesses I Follow..."
  - Business Dashboard Sections: "...Team, **Leads**, **Customers**, Bookings, Opportunities, Reviews..." — **no literal "Messages" section.** Businesses receive inbound interest through a Leads/Customers lens, not a raw inbox. This is a deliberate distinction the Blueprint makes, not an oversight, and it shapes Section I (Business Dashboard Integration) below: the underlying data is the same Conversations/Messages schema, but the Business-facing surface is framed as an inbox that is explicitly designed to promote into the future CRM Lite (§39) Leads pipeline without a schema rewrite, not as a peer of the Professional/Consumer "Messages" section.
- **§56 Rules That Protect Trust** — two rules directly govern this design: *"Users must control communications and notifications"* (Section on Notifications, below) and *"Aggregated data must protect individual privacy"* (relevant if any cross-account messaging metrics are ever surfaced — none are proposed here).
- **§50 Admin and Moderation System** — lists a "Community Moderator" role and names "disputes" and "content moderation" among what admin already manages. Section J reuses this rather than inventing a new role.
- **§13 Reviews, Recommendations and Resolution, "Resolution Center"** — *"Issue Submitted → Provider Notified → Private Resolution Period → Resolved or Escalated → Outcome Recorded."* This flow, already the Blueprint's own template for handling disputes, is reused for message reports in Section J rather than inventing a parallel process.
- **§53 Recommended Release Sequence, Release 4 — Market Connections**: *"Offers and Needs, jobs, opportunities, concierge, assisted matchmaking, Collaboration Builder."* Messaging itself isn't named in this specific line, but §5 places Messaging in the same CONNECTIONS pillar as Concierge and Collaboration Builder, both of which this line does name for Release 4 — and per `PHASE12-TECHNICAL-DESIGN.md`'s own finding, Concierge/Collaboration Builder/Matchmaking all structurally require a communication primitive underneath them, which doesn't exist yet. Building Messaging is the enabling step for the rest of Release 4, not a parallel, unrelated track.

## C. Connections Architecture

**Two distinct primitives, kept separate rather than merged into Phase 11's `Follows`:**

| | `Follows` (Phase 11, unchanged) | `Connections` (this phase, new) |
|---|---|---|
| Direction | One-way | Mutual — requires approval from both sides (§34, verbatim) |
| Purpose | "Notify me of this profile's activity" | "We have a confirmed commercial relationship" |
| Gate | None — anyone may follow anyone (except self) | Requires a structured request the recipient accepts or declines |
| Unlocks | Activity Feed items (Phase 11) | A Conversation thread (Section D) |
| Typed? | No | Yes — one of the §34 Circle Types |
| Public display | Private follower count only (`getFollowerCount`) | Optional public badges on the profile ("Works With," "Recommended By," etc., §34) — display-only for v1, not designed here in full (see Risk Assessment) |

**Lifecycle:** `pending` → `accepted` / `declined`. A `Connection` is created in `pending` state by the requester, carrying the four required "Introduction Economy" fields (reason, value offered, expected outcome, connection type). The recipient sees it in `/dashboard/connections` and can accept or decline. **Accepting a Connection is the only way a Conversation gets created** (Section D) — this is the mechanism that operationalizes §58's contrast between purposeful introductions and unsolicited messaging: there is structurally no way to send a free-form message to someone who hasn't accepted a structured request from you.

**Self-connection is blocked**, mirroring `access-social.ts`'s existing `createFollow` self-check exactly (an account cannot request a connection to its own profile).

**Duplicate-request prevention**: a compound-unique constraint on the *normalized, order-independent* pair of accounts (store both `accountA`/`accountB` with the lower numeric ID always first, matching the kind of normalization already implied by this codebase's `profileKey`-derivation pattern in Phase 10/11) prevents both "A requests B" and "B requests A" from coexisting as two separate pending rows — if B tries to request A while A's request to B is still pending, the correct behavior is to surface A's existing pending request to B for a decision, not create a second one.

## D. Messaging Architecture

**Two collections, following the thread/message split already standard for this kind of feature and matching this codebase's own pattern of splitting "container" from "items"** (e.g., `business-profiles` vs. `business-profiles.services[]` is a single-collection version of this idea; here the volume justifies two collections instead of one array field, since messages need independent pagination, read-state, and reporting).

- **`Conversations`** — created exactly once, automatically, when a `Connection` transitions to `accepted`. Holds the two participants (same normalized-pair pattern as Connections), a back-reference to the originating `Connection`, `lastMessageAt` (for inbox sorting), and an optional `blockedBy` field (Section I).
- **`Messages`** — individual rows, `conversation` + `sender` (both relationships) + `body` (required, length-capped) + `readAt` (nullable, drives unread-count badges).

**No real-time transport (WebSockets/SSE) for v1.** This codebase has no existing real-time infrastructure, and introducing one would be a new infrastructure class — the same reasoning `PHASE12-TECHNICAL-DESIGN.md` used to reject anything beyond a scheduled Vercel Cron job for Market Pulse. Messages are delivered via request-time reads (the inbox/thread pages query on load and on a short client-side poll interval, e.g. 15–30s while a thread is open) plus the email-notification fallback in Section on Notifications below — an explicitly disclosed tradeoff, not a silent limitation, consistent with how Phase 11 disclosed the Activity Feed's own request-time/no-push-notification design.

**Ordering and pagination**: `messages` indexed on `(conversation, createdAt)` for efficient thread-scoped, newest-first pagination — same indexing shape as `reviews`' existing `(owner, profileKey)` pattern, applied to a different pair.

## 1–10. Scope Items, Mapped to Sections

For traceability against the ten scope items in the request:

1. **Connections** → Section C
2. **Connection Requests** → Section C (lifecycle, required fields)
3. **Member Networking** → Section C (Circle Types, public display badges) + Section G (routes)
4. **Direct Messaging** → Section D
5. **Conversation Threads** → Section D (`Conversations`/`Messages` split)
6. **Inbox Architecture** → Section G (routes) + Section on Business Dashboard Integration below (Leads-lens framing)
7. **Notifications** → covered immediately below
8. **Consumer Dashboard Integration** → covered below
9. **Business Dashboard Integration** → covered below
10. **Professional Dashboard Integration** → covered below

### Notifications

§56's explicit rule — *"Users must control communications and notifications"* — means this cannot be a blanket always-on system. Proposed v1, deliberately narrow (not a general notification-preferences overhaul):

- **In-app**: an unread-message count badge in the dashboard nav (all three account types), computed from `messages.readAt IS NULL` scoped to the account's conversations — a small, owner-scoped aggregate, same shape as `getFollowerCount`.
- **Email**: one new boolean field on `network-accounts` (`messageEmailNotifications`, default `true`) that gates whether a new-message email fires, reusing the already-healthy Resend infrastructure (Phase 10 prework) and the existing verification/reset email-template pattern in `NetworkAccounts.ts`. Toggleable from `/dashboard/settings`, the same page email-change already lives on.
- **No digest, no push notifications, no SMS** — out of scope for v1, consistent with keeping this phase's surface area comparable to prior phases rather than building a general notification system on top of one feature.

### Consumer Dashboard Integration

Matches §38 exactly: a new **Messages** section alongside the existing Saved/Following/Saved Searches nav items from Phase 11. `/dashboard/connections` (pending requests + accepted circles) and `/dashboard/messages` (inbox) + `/dashboard/messages/[id]` (thread). A consumer can request a connection to any business or professional profile from that profile's public page (a new "Connect" affordance alongside Phase 11's existing Save/Follow buttons — visually and behaviorally distinct from Follow, since it opens the structured-introduction form rather than firing immediately).

### Professional Dashboard Integration

Identical shape to Consumer — §38 lists "Messages" under Professional Dashboard Sections too. Professionals additionally receive connection requests *from* businesses/consumers (e.g., a business requesting "My Service Providers" type) and can request connections to businesses (e.g., seeking "My Business Partners").

### Business Dashboard Integration

Per Section B's finding, §38 does **not** list "Messages" for Business accounts — it lists "Leads" and "Customers." Proposed: the Business dashboard gets an **Inbox** section reading the identical `Conversations`/`Messages` data as Consumer/Professional, but framed and labeled around incoming interest rather than a peer-to-peer chat list — each conversation row shows the counterpart's profile, the original Connection's `connectionType`/`reason` (so a business immediately sees *why* someone connected, per the Introduction Economy fields), and a status the business can optionally set going forward. **This status field is deliberately designed as the seam for future CRM Lite (§39) promotion**: it starts as a simple `contacted` boolean for Phase 12, but its presence on `Conversations` (not bolted on later) means a future CRM Lite phase can extend it into the full New → Qualified → Contacted → Proposal Sent → Negotiating → Won → Lost pipeline without migrating the underlying thread data.

## E. Collections Required

**Three new collections**, following this codebase's established access-control/comment conventions:

```ts
// payload/collections/Connections.ts (illustrative — not implemented)
export const Connections: CollectionConfig = {
  slug: "connections",
  labels: { singular: "Connection", plural: "Connections" },
  admin: { useAsTitle: "id", defaultColumns: ["accountA", "accountB", "connectionType", "status"] },
  access: {
    read: readOwnConnection,      // participant on either side, or staff
    create: createConnection,     // any network account, blocks self-target (mirrors createFollow)
    update: respondToConnection,  // recipient only, and only pending -> accepted/declined
    delete: denyUpdate,           // a declined/accepted connection is a fact, not deletable — matches Follows/SavedProfiles precedent (delete via unfollow-style removal is a separate, explicit "end connection" action, not a raw delete)
  },
  fields: [
    { name: "accountA", type: "relationship", relationTo: "network-accounts", required: true }, // lower numeric ID, normalized at create time
    { name: "accountB", type: "relationship", relationTo: "network-accounts", required: true },
    { name: "requestedBy", type: "relationship", relationTo: "network-accounts", required: true },
    { name: "connectionType", type: "select", required: true, options: [
      { label: "Supplier", value: "supplier" }, { label: "Service Provider", value: "service-provider" },
      { label: "Business Partner", value: "business-partner" }, { label: "Customer", value: "customer" },
      { label: "Project Team", value: "project-team" }, { label: "Mentor", value: "mentor" },
      { label: "Preferred Business", value: "preferred" }, { label: "Alumni Network", value: "alumni" },
      { label: "Local Business Community", value: "local-community" },
    ]}, // directly the §34 Circle Types
    { name: "reason", type: "textarea", required: true, maxLength: 500 },        // §58 "reason"
    { name: "valueOffered", type: "textarea", required: true, maxLength: 500 },  // §58 "value offered"
    { name: "expectedOutcome", type: "textarea", required: true, maxLength: 500 }, // §58 "expected outcome"
    { name: "status", type: "select", required: true, defaultValue: "pending", options: [
      { label: "Pending", value: "pending" }, { label: "Accepted", value: "accepted" }, { label: "Declined", value: "declined" },
    ]},
    { name: "respondedAt", type: "date" },
  ],
};

// payload/collections/Conversations.ts (illustrative)
export const Conversations: CollectionConfig = {
  slug: "conversations",
  access: { read: readOwnConversation, create: denyUpdate, update: updateOwnConversation /* block/unblock only */, delete: denyUpdate },
  fields: [
    { name: "accountA", type: "relationship", relationTo: "network-accounts", required: true },
    { name: "accountB", type: "relationship", relationTo: "network-accounts", required: true },
    { name: "connection", type: "relationship", relationTo: "connections", required: true }, // provenance — why this thread exists
    { name: "lastMessageAt", type: "date" },
    { name: "blockedBy", type: "relationship", relationTo: "network-accounts" }, // nullable
    { name: "businessContacted", type: "checkbox", defaultValue: false }, // Business Dashboard Integration seam, see above
  ],
};

// payload/collections/Messages.ts (illustrative)
export const Messages: CollectionConfig = {
  slug: "messages",
  access: { read: readOwnMessage, create: createOwnMessage, update: denyUpdate, delete: denyUpdate },
  fields: [
    { name: "conversation", type: "relationship", relationTo: "conversations", required: true, index: true },
    { name: "sender", type: "relationship", relationTo: "network-accounts", required: true },
    { name: "body", type: "textarea", required: true, maxLength: 4000 },
    { name: "readAt", type: "date" },
  ],
};
```

Server-created automatically (not user-facing forms): the `Conversation` row itself, on Connection acceptance — created by the same Server Action that flips `connections.status` to `accepted`, using `overrideAccess: true`, exactly matching the pattern `payload/collections/BusinessProfiles.ts`'s `verified`/`verifiedAt` fields already use for hook-driven, non-client-writable state changes.

## F. Database Changes

- **One new field on the existing `network-accounts` collection**: `messageEmailNotifications` (checkbox, default `true`), client-editable by the account owner only (same `ownAccountOrStaff` access this collection already uses for its other owner-editable fields). No other change to any Phase 9/10/11 collection or field.
- **Extend `ContentReports.target`'s `relationTo` array** to include `messages` (currently `["reviews", "recommendations"]`) — directly reusing the "one shared reporting collection... rather than two near-duplicate ones" precedent already stated in that file's own header comment, rather than creating a `MessageReports` collection.
- **Indexes**: compound unique on `connections(accountA, accountB)` (normalized pair, prevents duplicate/crossed requests); index on `conversations(accountA)` and `conversations(accountB)` for inbox listing; compound index on `messages(conversation, createdAt)` for thread pagination — same indexing rationale already documented in `Reviews.ts`/`Follows.ts` for their own compound-unique needs.
- **New `kind` value on the existing `rate-limit-events` throttle mechanism**: `"network-connection-request"`, reusing `lib/cms/rate-limit.ts`'s `checkAndRecordThrottle` unchanged — the exact pattern Phase 9A established for `network-login`/`network-register`/`network-forgot-password` and Phase 10 extended for `network-verification-request`/`network-content-report`. No new throttle infrastructure.

## G. Route Structure

Following the exact `/dashboard/*` convention Phase 11 established:

| Route | Purpose | Precedent |
|---|---|---|
| `/dashboard/connections` | Pending requests (incoming/outgoing) + accepted circles, grouped by `connectionType` | Same list-page shape as `/dashboard/saved`, `/dashboard/following` |
| `/dashboard/messages` | Inbox — one row per conversation, sorted by `lastMessageAt` | Same list-page shape as `/dashboard/saved-searches` |
| `/dashboard/messages/[id]` | Thread view, paginated messages + send box | New page shape, no direct Phase 9–11 precedent, but same auth/ownership-check pattern as every other `/dashboard/*` page |
| `/dashboard/inbox` (Business accounts only, or same URL relabeled by account type) | Business-framed view of the same conversation data (Section on Business Dashboard Integration) | Reuses `/dashboard/messages`'s data layer; only the page's copy/framing differs by `accountType`, matching how the existing dashboard Overview already branches by account type |

No new public (unauthenticated) routes — unlike Market Pulse, nothing here is meant to be publicly visible; the only public-facing surface is the new "Connect" button on existing public profile pages (`/network/businesses/[slug]`, `/network/professionals/[slug]`), placed alongside Phase 11's existing Save/Follow buttons.

## H. Access Control Model

Every new access function follows the exact shape and reasoning style already established in `payload/access-social.ts`, extended for the two-participant (rather than single-owner) case:

- **`readOwnConnection`** — `{ or: [{ accountA: { equals: user.id } }, { accountB: { equals: user.id } }] }`, no staff carve-out by default (matching Follows/SavedProfiles' "no cross-account read reason exists" stance from Phase 11) — a `Community Moderator` staff role (§50) gets a narrow, purpose-built read path for investigating a report, not blanket read access to all connections.
- **`createConnection`** — any network account; blocks `requestedBy === target` (self-connection), mirrors `createFollow`'s exact `getProfileOwnerId` ownership-resolution call.
- **`respondToConnection`** — only the non-requesting participant, only while `status === "pending"`, only transitioning to `accepted`/`declined` — never back to `pending`, and the requester cannot "accept their own" request.
- **`readOwnConversation`** / **`readOwnMessage`** — same two-participant `or` shape as `readOwnConnection`, additionally requiring the conversation not be blocked *by the reading account's counterpart* for `createOwnMessage` (a blocked party can still read history, matching how blocking works on most messaging platforms — you can see what was said, you just can't send more).
- **No direct REST write path for any of the three new collections**, matching Phase 11's proven stronger-than-typical posture (confirmed live, both pre- and post-merge, that even authenticated network accounts get 403 on direct REST writes to Follows/SavedProfiles/SavedSearches) — every mutation here goes through a Server Action carrying the additional checks (self-connection block, pending-state check, block-check, rate limit).

## I. Security Model

- **Spam/unsolicited-contact prevention is structural, not just policy**: because no `Conversation` can exist without an `accepted` `Connection`, and every `Connection` request requires the four Introduction Economy fields, there is no code path for a stranger to send a free-form message to another member. This directly satisfies §58's stated goal rather than relying on moderation to catch it after the fact.
- **Rate limiting**: connection requests throttled via the existing `checkAndRecordThrottle` mechanism (Section F) — prevents a compromised or bad-faith account from mass-requesting connections as a spam vector, the same class of protection already applied to registration/login/forgot-password/verification-requests/content-reports.
- **Suspension enforcement**: `network-accounts.status === "suspended"` already blocks login (existing `beforeLogin` hook in `NetworkAccounts.ts`) — since every action here requires an authenticated session, a suspended account is already fully blocked from creating connections or messages with zero new code; this is confirmed reuse, not a new mechanism to build.
- **Block/mute is self-service, not admin-gated**: either participant can set `conversations.blockedBy` to themselves at any time (an "end conversation" action, not a delete — matching the "a save/follow is a fact, change it by delete+recreate" philosophy `access-social.ts` already documents, adapted here to "a blocked conversation is a fact, not an undo-able toggle" — unblocking requires a fresh accepted Connection, not a checkbox flip, to prevent block/unblock cycling as a harassment vector).
- **Message content length caps** (`maxLength: 4000` on `messages.body`) — basic abuse-surface reduction, same spirit as `reviews`'/`recommendations`' existing length caps.
- **No new PII exposure**: message content is only ever readable by its two participants and, narrowly, staff investigating an active report (Section J) — never aggregated, never exposed via any public API, consistent with §56's "personal information must not be sold" and "aggregated data must protect individual privacy" rules.

## J. Moderation Model

Reuses two already-proven Blueprint-and-codebase patterns rather than inventing new ones:

1. **Reporting**: extend the existing `ContentReports` collection's `target.relationTo` to include `messages` (Section F). A member reports an individual message; staff review in `/admin`, same reactive (not pre-approval) moderation posture Phase 10 established for Reviews/Recommendations, matching §50's "Community Moderator" role.
2. **Resolution flow**: reuse §13's Resolution Center template verbatim — *Issue Submitted → Provider Notified → Private Resolution Period → Resolved or Escalated → Outcome Recorded* — applied to message reports instead of review disputes. No new dispute-handling process to design.
3. **Enforcement**: a resolved-and-upheld report can lead to the reported account being set to `status: "suspended"` (existing field, existing enforcement — Section I) — the same lever Phase 10's moderation already assumes exists for any trust violation, not a new suspension mechanism specific to messaging.
4. **Self-service first line**: blocking (Section I) requires no staff involvement and takes effect immediately — reporting is for cases that need staff attention (harassment patterns, safety concerns), not the first response to an unwanted contact, matching the general principle that member self-service should be exhausted before staff time is spent (already the implicit model for Save/Unfollow in Phase 11).

## K. Validation Plan

Following the same discipline as every prior phase's release review (clean clone, fresh quality gates, DB-level verification, not just UI-level):

1. **Standard gates**: `tsc --noEmit`, lint, tests, build — clean checkout.
2. **Connection lifecycle**: request → pending → accept → Conversation auto-created (verified by direct DB query, not just UI state, matching the discipline that caught the Phase 11 list-refresh assumption error); request → decline → no Conversation created; self-connection attempt → tampered-form test (same technique used for Phase 11 self-follow) → 0 rows created.
3. **Duplicate/crossed-request prevention**: A requests B, then B requests A while A's request is still pending → confirm exactly one `connections` row exists, not two, via direct DB query.
4. **Messaging gate**: attempt to create a `Messages` row for a `Conversation` that doesn't exist (i.e., before any Connection is accepted) via a tampered/direct-API request → confirm rejection, confirmed at the DB layer.
5. **Isolation**: account C (uninvolved third party) attempts to read A/B's conversation via direct REST and via a tampered form → confirmed 403/rejected, mirroring the exact isolation tests already proven for Follows/SavedProfiles in both the Phase 11 release review and production validation.
6. **Block enforcement**: A blocks the conversation → B's subsequent send attempt rejected at the access-control layer, not just hidden in the UI; A can still read prior history.
7. **Rate limiting**: 4th rapid connection-request attempt within the throttle window → rejected, matching the exact test pattern already used for login/registration throttling.
8. **Notification toggle**: `messageEmailNotifications = false` → confirm no email sent on a new message (checked against the real Resend-backed inbox, same "verify real delivery, don't trust the toggle" discipline used for Phase 10's email-infrastructure validation).
9. **Regression sweep**: Phase 9/10/11 auth, profiles, directory, search, dashboard, trust, and social features unaffected — this phase adds three new collections and one new field, touches no existing collection's access logic.
10. **Production validation**: same pattern as `PHASE11-PRODUCTION-DEPLOYMENT-REPORT.md` — fresh real accounts, live production check including a real end-to-end connection-request-to-message flow between two genuinely separate accounts, full cleanup, confirmed zero leftover test data.

## L. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Unsolicited/spam contact | High if unmitigated | Structural gate (Section I) — no messaging without an accepted, structured Connection; rate-limited requests |
| Harassment within an accepted conversation | Medium | Self-service block (immediate) + report/Resolution Center escalation (Section J) + existing suspension enforcement |
| No real-time delivery (polling only) creates a laggy feel | Low–Medium | Explicitly disclosed tradeoff; email-notification fallback narrows the practical gap; matches this codebase's existing "no new infrastructure class" discipline |
| Business Dashboard framing (Inbox vs. Leads) undersells or overpromises relative to future CRM Lite | Medium | `businessContacted` field designed as an explicit seam now rather than retrofitted later (Section on Business Dashboard Integration) |
| Public "Works With"/"Recommended By" badges (§34) implemented hastily, becoming a new source of unverified trust claims | Medium | Explicitly **not** designed in this document beyond noting it exists in the Blueprint — deferred to a follow-up design pass once core Connections/Messaging is validated, consistent with not shipping an incomplete feature as functional (§52) |
| Connection-request volume between a small real account base makes the feature feel empty at launch | Low–Medium | Structurally lower risk than Market Pulse's equivalent concern — a single successful connection is useful the moment it happens, unlike an aggregate insight that needs volume to be meaningful or safe |
| Scope creep into full CRM Lite / Concierge / Opportunities during implementation | Medium | Explicitly out of scope; Section D's "no real-time transport," Section I's "Business Dashboard Integration" seam, and this table all name the boundary directly |

## M. Effort Estimate

Calibrated against Phase 10 (4 collections: verification-requests/reviews/recommendations/content-reports) and Phase 11 (3 collections: saved-profiles/follows/saved-searches) as the two closest comparable data points:

- **3 new collections** (`connections`, `conversations`, `messages`) — between Phase 11 and Phase 10 in count, but with a materially new access-control shape (two-participant `or`-based ownership vs. Phase 11's single-owner scoping), so not a straight line-count comparison.
- **1 modified existing collection** (`ContentReports.target` relationTo extension) — small, additive.
- **1 new field** on `network-accounts` (`messageEmailNotifications`) — trivial.
- **~5–6 new Server Actions**: `sendConnectionRequestAction`, `respondToConnectionRequestAction`, `sendMessageAction`, `blockConversationAction`, `reportMessageAction`, plus the notification-toggle action on Settings — more than Phase 11's 3, reflecting the extra state machine (pending/accepted/declined, blocked/unblocked) messaging inherently needs.
- **~5 new routes**: `/dashboard/connections`, `/dashboard/messages`, `/dashboard/messages/[id]`, plus the "Connect" affordance on both existing public profile page types — comparable to Phase 11's 4 dashboard routes plus its two profile-page integrations.
- **New throttle `kind`** — trivial, reuses existing infrastructure.
- **Net estimate: the largest single phase since Phase 9's initial auth foundation** — larger than both Phase 10 and Phase 11 individually, driven by the two-participant access-control model and the connection→conversation state machine, not by raw collection count. Still meaningfully smaller than Option C (Opportunities Marketplace) would be, per `PHASE12-TECHNICAL-DESIGN.md`'s own comparison, since this phase needs no matching engine, posting moderation, or revenue-tier logic.

## N. Go / No-Go Recommendation

**Go.**

- **Confirms the prior design document's own conclusion.** `PHASE12-TECHNICAL-DESIGN.md` recommended Messaging over Market Pulse specifically because it has zero unbuilt prerequisites and closes a named, acknowledged gap (§38). This full design pass found nothing that changes that — if anything, the discovery of §58's Introduction Economy and §34's Business Circles gives the feature a clearer, more specific shape than "generic messaging" would have had, and one that structurally solves its own biggest risk (spam) rather than needing a separate mitigation bolted on.
- **No architectural blocker.** Every new access-control function is a direct extension of patterns already proven correct in production (`createFollow`'s self-check, `readOwnSocialRecord`'s owner-scoping, the throttle mechanism, the shared `ContentReports` pattern, the suspension-enforcement hook). No new infrastructure class is required (no real-time transport, no new email provider, no new billing).
- **The one open design question — public Circle-badge display (§34's "Works With"/"Recommended By")** — is deliberately deferred rather than blocking Go: it's a presentation layer on top of accepted Connections, addable in a follow-up pass once the core request→accept→message flow is live and validated, not a prerequisite for it.
- **Sizing is real but not disqualifying.** Section M's "largest phase since Phase 9" estimate is a genuine cost, not a rounding error — but it's still smaller than the alternative (Option C, Opportunities Marketplace), and per `PHASE12-TECHNICAL-DESIGN.md`'s comparison, Opportunities Marketplace itself depends on this feature existing first.

---

Design only. No implementation, no branch, no PR was created for this document.
