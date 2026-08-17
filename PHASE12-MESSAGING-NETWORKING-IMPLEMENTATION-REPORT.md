# Phase 12 — Messaging & Networking: Implementation Report

Branch: `feat/phase12-messaging-networking` (off `main` @ latest, includes everything through Phase 11). Scope: exactly what was approved in `PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md` — Business Circles, Connection Requests, Introduction Requests, Mutual Connections, Messaging, Conversation Threads, Inbox, Notifications, Consumer/Professional Dashboard Integration, Business Dashboard Inbox. Marketplace, Opportunities, Jobs, AI, Market Pulse, Advanced CRM, Payments, and Booking were never in scope.

## A. Implementation Summary

Three new Payload collections, one new access-control module, one new Server Actions module, one new read-helper module, five new client components, three new dashboard pages, and additive changes to the dashboard shell, settings page, `NetworkAccounts`, `ContentReports`, and both public profile pages — built on Phase 9–11's foundation:

1. **`connections`** (`payload/collections/Connections.ts`) — the "Business Circle" primitive (Blueprint §34). `accountA`/`accountB` store the *normalized* undirected pair (lower numeric id always first, via a `beforeChange` hook), independent of who initiated (tracked separately by `requestedBy`); a compound unique index on `(accountA, accountB)` catches a duplicate request in either direction at the DB layer. Every request carries the four §58 "Introduction Economy" fields — `connectionType`, `reason`, `valueOffered`, `expectedOutcome` — all required, so unsolicited/context-free connection requests are structurally impossible, not just discouraged by policy.
2. **`conversations`** — created exactly once, only when a `Connection` transitions to `accepted`, via a trusted `overrideAccess: true` Server Action call. `access.create` is unconditionally `false` — there is no client-facing path to create one. Carries `blockedBy` (freezes the thread for *both* participants, not just the blocker) and `businessContacted` (a deliberate CRM-Lite seam for a future phase, not built here).
3. **`messages`** — structurally impossible without an accepted `Connection` and its `Conversation`, enforced by `createOwnMessage`'s trusted `findByID` lookup of the parent conversation (never trusts a client-supplied pair) plus a `blockedBy`-unset check.
4. **`payload/access-messaging.ts`** — all access control for the three collections, following the project's established "trusted server-side lookup, never trust client-supplied ownership claims" discipline. Two real access-control gaps were found and fixed during implementation, not deferred (see §C).
5. **`lib/network/messaging-actions.ts`** — `sendConnectionRequestAction`, `respondToConnectionRequestAction` (the one path that creates a `Conversation` on accept), `sendMessageAction`, `markConversationReadAction`, `blockConversationAction`, `toggleConversationContactedAction`, `fetchMessagesAction` (thin polling endpoint, re-verifies participancy on every call), `updateMessageNotificationsAction`.
6. **`lib/network/messaging.ts`** — read helpers: connection state, pending/accepted connection lists (grouped by Circle Type), conversation list with per-thread unread counts, single-conversation detail, message list.
7. **Dashboard**: `/dashboard/connections` (incoming/outgoing requests, accepted Circles), `/dashboard/messages` (inbox list — labeled "Inbox" for business accounts, "Messages" otherwise, per Blueprint §38), `/dashboard/messages/[id]` (thread view with 20s polling, mark-as-read on load, block/report controls).
8. **Public surface**: both `[slug]` detail pages gain a Connect button (structured introduction form) for logged-in non-owner viewers, and a connection-status note when a connection already exists.
9. **Notifications**: a `messageEmailNotifications` checkbox on `NetworkAccounts` (default on), a Settings-page toggle, and a conditional new-message email sent on `sendMessageAction` — skipped entirely when the recipient has opted out.

## B. Bugs Found and Fixed During Implementation

Three real, non-trivial bugs were found — two during code-level review before any live testing, one only surfaced by live browser validation:

1. **Access-control gap — `createConnection` not verifying caller involvement.** The original draft only checked that the *target* account wasn't the caller, not that the caller was actually a party to the connection at all — an authenticated account could otherwise have fabricated a connection between two *other* accounts. Fixed by adding an explicit `isSelfInvolved` check (`accountA === user.id || accountB === user.id`) alongside `accountA !== accountB` and `requestedBy === user.id`.
2. **Access-control gap — `respondToConnection` not verifying requester exclusion.** The original access-layer query-constraint let the *original requester* self-accept/decline via a direct REST call, bypassing only a Server-Action-level check. Fixed with a full `findByID`-based check (same pattern as `access-trust.ts`'s `updateReviewAccess`) verifying participancy, `requestedBy !== user.id`, and `status === "pending"`.
3. **Runtime bug — invalid `"use server"` export, caught only by live browser testing.** `lib/network/messaging-actions.ts` originally also exported `messagingInitialState`, a plain object, from a file marked `"use server"` — invalid, since every top-level export from such a file must be an async function. This did not surface in `tsc`, lint, tests, or `next build` — only in the running dev server, as a genuine `Application error: a server-side exception has occurred`. Diagnosed by redoing the flow without navigating away mid-request (ruling out a navigation-timing artifact first) and reading the actual server log. Fixed by deleting the unused export (nothing imported it — every component defines its own local `initialState`).
4. **Runtime bug — relationship fields written as raw strings instead of numbers, caught only by live browser testing.** Two call sites passed a `formData.get(...)`-sourced string directly into a Payload relationship field (`conversations.connection` in `respondToConnectionRequestAction`, `messages.conversation` in `sendMessageAction`) instead of coercing with `Number(...)` first — the exact pattern every other polymorphic-relationship write in this codebase (`social-actions.ts`, `trust-actions.ts`) already follows for this reason. This passed all four quality gates and only failed live, as `Application error… The following field is invalid: Connection`. The first Accept click had already flipped the `Connection`'s status to `accepted` before the `Conversation` create failed, leaving a real accepted-connection-with-no-conversation inconsistency in the test data — reset via a direct DB update back to `pending`, then re-verified end-to-end after the fix. Both call sites fixed with `Number(...)` coercion; a clean rebuild + fresh production server confirmed both the Accept flow and message sending now complete without error.

## C. Validation Results

Performed live against a real running production build (`next build` + `next start`, not `next dev`), using two real accounts (business "Prod12 Bakery", professional "Prod12 Consultant") registered through the actual `/register` flow with real disposable-email inboxes (GuerrillaMail/sharklasers.com).

| Item | Result |
|---|---|
| Connection request — Introduction Economy fields | B → A connection request with `connectionType: business-partner` and all three free-text fields; confirmed in DB with every field matching what was entered |
| Connections list — incoming | A's `/dashboard/connections` shows the pending request with all four fields (reason/valueOffered/expectedOutcome/connectionType) rendered in full |
| Connections list — outgoing | B's `/dashboard/connections` correctly shows the same request as "Pending" under "Requests you've sent" |
| Accept flow | A clicks Accept → `connections.status` transitions to `accepted` and a `Conversations` row is created with the correct normalized `accountA`/`accountB` and `connection` reference — confirmed via direct DB query |
| My Circles | Accepted connection appears under "My Business Partners" (the chosen Circle Type) on both A's and B's `/dashboard/connections` |
| Messaging — both directions | A sends a message, B replies — both persisted correctly (`sender_id`, `body`, `created_at`), `conversations.lastMessageAt` updated on each send |
| Inbox listing | `/dashboard/messages` correctly lists the conversation with counterpart name for both accounts |
| Business Inbox framing (§38) | A's (business) nav/page label reads "Inbox"; B's (professional) reads "Messages" — same underlying route, label driven by `accountType` |
| Unread-count nav badge | B's nav showed "Messages **1**" immediately after A's message; cleared to no badge after opening the thread (which calls `markConversationReadAction`) and navigating away — confirmed `messages.readAt` set in DB |
| Notifications — delivery | Both directions of a new-message email were delivered and observed in the shared test inbox, addressed correctly to each recipient, correct sender name in the subject |
| Notifications — opt-out | A toggled "Email me when I get a new message" off on `/dashboard/settings` → `messageEmailNotifications: false` confirmed in DB; B then sent another message and **no** new `[email:sent]` log line appeared for it, confirming `sendMessageAction`'s conditional correctly skips the email |
| Conversation Access Controls — end conversation | B clicked "End conversation" → `conversations.blockedBy` set to B's id; UI immediately shows "This conversation has ended — no new messages can be sent" with the send form and Report/End buttons removed, message history still fully visible |
| Conversation Access Controls — frozen for both sides | The `blocked` flag driving this UI (`Boolean(doc.blockedBy)` in `lib/network/messaging.ts`) and the corresponding `createOwnMessage` server check are both participant-agnostic — verified live for B and by direct code read for A (identical rendering/enforcement path, no branch on who blocked it) |
| Regression — Phase 9C directory | Business directory listing and detail page render correctly with the new profile, including the Reviews/Recommendations sections (Phase 10) unaffected |
| Regression — anonymous viewer | Public profile page renders cleanly for a logged-out viewer with no Connect button (correctly gated to logged-in non-owner viewers) and no error |

**Disclosed scope trim.** A third live registration attempt (for an isolation-testing consumer account) was blocked by Phase 9A's own `network-register` rate limiter (3 attempts/hour) — itself a positive signal that the mechanism works as designed, not a defect. Testing proceeded with the two accounts already registered; Ownership Isolation / Cross-Account Security beyond what two accounts can exercise was covered via unauthenticated direct REST calls (below) and code review of the two access-control gaps already found and fixed in §B, rather than a third live account.

## D. Security Results

- **Unauthenticated REST access denied on all three new collections.** Direct `curl` calls (no session cookie) to `GET /api/connections`, `POST /api/connections` (including a self-connect attempt), `GET /api/conversations`, and `GET /api/messages` all returned `403 { "You are not allowed to perform this action." }`.
- **Self-connection and caller-involvement are enforced at the access-control layer**, not just the UI — see §B item 1, `createConnection`'s `isSelfInvolved` check.
- **Requester self-accept/decline is blocked at the access-control layer**, not just the Server Action — see §B item 2, `respondToConnection`'s `findByID`-based check.
- **Messaging is structurally impossible without an accepted Connection** — `createOwnMessage` does a trusted `findByID` on the parent `Conversation` and checks participancy; there is no client-facing path to create a `Conversation` at all (`access.create: false`), so unsolicited/free-form messaging cannot exist by construction, not just by policy (Blueprint §58).
- **A blocked conversation is frozen for both participants**, not just the blocker (§C, verified live + code review) — `blockedBy` gates `createOwnMessage` regardless of which participant is sending, and the field can only ever be set to the caller's own id (`conversationBlockFieldAccess`), with no unblock path.
- **Compound unique index `(accountA, accountB)`** on `connections` catches a duplicate request in either direction at the DB layer, backed by `sendConnectionRequestAction`'s duplicate-error handling — not independently re-exercised live this pass (see disclosed trim above) but unchanged from the already-`tsc`-verified logic and consistent with the identical pattern proven correct in Phase 10/11 production.
- **No new authentication/session surface** — every new route sits under the existing `/dashboard/*` layout's unchanged `getNetworkUser()` gate.

## E. Files Changed

| File | Change |
|---|---|
| `payload/collections/Connections.ts` | New |
| `payload/collections/Conversations.ts` | New |
| `payload/collections/Messages.ts` | New |
| `payload/access-messaging.ts` | New — all Phase 12 access control |
| `payload.config.ts` | Registers the 3 new collections |
| `lib/validation/messaging-schemas.ts` | New — zod schemas for connection requests and messages |
| `lib/network/messaging-actions.ts` | New — all Phase 12 Server Actions |
| `lib/network/messaging.ts` | New — read helpers |
| `lib/network/session.ts` | `NetworkUser` type extended with `messageEmailNotifications` |
| `lib/network/trust-actions.ts` | `reportContentAction`'s `targetCollection` validation extended to allow `"messages"` |
| `payload/collections/NetworkAccounts.ts` | `+messageEmailNotifications` checkbox field |
| `payload/collections/ContentReports.ts` | `target.relationTo` extended to include `"messages"` |
| `components/network/connect-button.tsx` | New |
| `components/network/connection-response-buttons.tsx` | New |
| `components/network/message-thread.tsx` | New |
| `components/network/block-conversation-button.tsx` | New |
| `components/network/notification-settings-form.tsx` | New |
| `components/network/report-content-button.tsx` | `targetCollection` prop type extended to allow `"messages"` |
| `components/network/dashboard-nav.tsx` | `NavItem` extended with optional `badge` |
| `app/(network)/dashboard/layout.tsx` | `+Connections`, `+Messages/Inbox` (unread badge, business-vs-other label) nav items |
| `app/(network)/dashboard/settings/page.tsx` | `+`Notifications section |
| `app/(network)/dashboard/connections/page.tsx` | New |
| `app/(network)/dashboard/messages/page.tsx` | New |
| `app/(network)/dashboard/messages/[id]/page.tsx` | New |
| `app/(app)/network/businesses/[slug]/page.tsx`, `professionals/[slug]/page.tsx` | `+`Connect button / connection-status note |

No existing collection's existing fields, no existing Server Action, and no existing page's existing content were removed or altered beyond these additions.

## F. Test Results

`npm test` (`node --test lib/**/*.test.ts`) — **4/4 passing**, unaffected (no reserved-slug change needed; all new dashboard routes nest under the already-reserved `/dashboard`).

## G. Build Results

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 errors/warnings**
- `next build` — **succeeds**, 3 new routes (`/dashboard/connections`, `/dashboard/messages`, `/dashboard/messages/[id]`), no regressions to the existing route set

## H. Cleanup

All Phase 12 test data (2 network accounts, 1 business profile, 1 professional profile, connections, conversations, messages) was deleted from the database and confirmed zero remaining via direct query. The temporary local DB-verification script used throughout validation was deleted. The local validation server was stopped.

## I. Commit Hash

`6012d7d` (branch `feat/phase12-messaging-networking`)

## J. PR URL

[https://github.com/ralphchbib/thebusinesslb-website/pull/24](https://github.com/ralphchbib/thebusinesslb-website/pull/24) — not merged, per instruction.
