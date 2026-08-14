# Phase 11 — Consumer Experience & Network Expansion: Implementation Report

Branch: `feat/phase11-consumer-network` (off `main` @ latest, includes everything through Phase 10). Scope: exactly what was approved in `PHASE11-TECHNICAL-DESIGN.md` — Consumer Dashboard, Saved Profiles (absorbing Favorites/Bookmarks as one primitive), Following Businesses, Following Professionals, Saved Searches, and a minimal read-time-computed Activity Feed. Profile Collections and persisted Activity Feed infrastructure are untouched, per the design doc's explicit deferrals; Marketplace, Opportunities, Jobs, Messaging, AI, Payments, Booking, and Events were never in scope.

## A. Implementation Summary

Three new Payload collections, one new access-control module (plus a one-line export added to the existing `access-trust.ts` so the two modules can share a helper rather than duplicate it), one new Server Actions module, two new read-helper modules, four new client components, three new dashboard pages, and additive changes to the dashboard shell and the four existing public/directory pages — built entirely on Phase 9/10's foundation, reusing established patterns rather than inventing new ones:

1. **`saved-profiles`** and **`follows`** (`payload/collections/SavedProfiles.ts`, `Follows.ts`) — the same polymorphic-`profile` + flat-`owner` + derived-`profileKey` + compound-unique-index shape `Reviews`/`Recommendations` already proved correct in Phase 10 production. Deliberately two collections, not one with a `kind` field — their access rules diverge (saving is self-targetable, following is not; see `payload/access-social.ts`'s header comment for the full reasoning) and two simple, non-branching access functions are safer to audit than one with branching logic.
2. **`saved-searches`** — a named, replayable filter set (`profileType`, `label`, `filters: json`). `filters` stores the exact allowlisted subset of `BusinessProfileFilters`/`ProfessionalProfileFilters` (`lib/validation/social-schemas.ts`'s `SAVED_SEARCH_FILTER_KEYS`); replaying a search is a plain `URLSearchParams` build (`lib/network/social.ts`'s `savedSearchHref`), no new filter logic.
3. **`payload/access-social.ts`** — self-follow blocked at the access-control layer (`createFollow`, reusing `access-trust.ts`'s `getProfileOwnerId` — now exported for this reuse), saving explicitly allowed to self-target (no check — see the file's own comment for why saving has no gaming incentive), and a **deliberately no-staff-carve-out** `read`/`delete` policy on all three collections: unlike every Phase 10 collection, none of these ever hold public content, so there is no moderation reason for staff to browse another account's saved/followed list — grounded directly in Blueprint v3 §37's privacy principle.
4. **`lib/network/social-actions.ts`** — `saveProfileAction`/`unsaveProfileAction`, `followProfileAction`/`unfollowProfileAction`, `saveSearchAction`/`deleteSavedSearchAction`. Save and Follow are both **idempotent by design**: a duplicate-create attempt caught by the DB's compound unique index is treated as success (the end state — "saved"/"following" — is what the user asked for either way), not surfaced as an error.
5. **`lib/network/social.ts`** — read helpers: `isProfileSaved`/`isProfileFollowed` (for button initial state), `getSavedProfiles`/`getFollowedProfiles` (dashboard lists), and `getFollowerCount` — the one deliberately narrow, count-only function that lets a profile's own owner see "N people follow you" without ever exposing the underlying follower list.
6. **`lib/network/activity.ts`** — `getActivityFeed`, Option A from the design doc: a live, request-time composition (one query for the account's follows, one *batched* query for recent reviews across every followed profile at once — not N+1) over data that already exists, not a persisted event log. Explicitly the smaller of two designed options; §J of the design doc documents the deferred alternative and its trigger condition.
7. **Dashboard**: `/dashboard/saved`, `/dashboard/following`, `/dashboard/saved-searches` — new, and added to every account type's nav (not gated behind `hasProfile`, unlike Verification/Reviews), since nothing in the access-control model restricts saving/following to any particular account type. `/dashboard` (Overview) gains an "Updates from who you follow" panel for accounts without a profile (consumer/institution/diaspora) — the Blueprint §15 "My Market" home. The existing business/professional Overview is untouched.
8. **Public surface**: both `[slug]` detail pages gain a Save button (any logged-in viewer, including the owner) and a Follow button (logged-in non-owner viewers only), plus a private "N people follow your profile" line shown only to the profile's own owner. Both directory listing pages gain a "Save this search" affordance next to the existing filter form.

## B. Validation Results

All performed live against a real running dev server, using three real accounts (business, professional, consumer) registered through the actual `/register` flow with real disposable-email inboxes (mail.tm, GuerrillaMail) — the same methodology Phase 9/10 production validation used, not seeded data.

| Item | Result |
|---|---|
| Consumer Dashboard nav | Consumer account's nav shows exactly `Overview, Saved, Following, Saved Searches, Settings` — no Profile/Portfolio/Verification/Reviews (correct, consumer has no profile) |
| Business/Professional nav unchanged | Both retain `Profile, Portfolio, Verification, Reviews` plus the three new universal sections — confirmed no regression to the Phase 9D/10 nav |
| Saved Profiles — save | Professional account clicks Save on the business profile → "Saved ✓", confirmed persisted after a full page reload (server-rendered state, not client-only) |
| Saved Profiles — self-save allowed | Professional account viewing their *own* profile → Save button renders and works (design's deliberate exception) |
| Saved Profiles — dashboard list | `/dashboard/saved` correctly lists the saved business under "Saved Businesses (1)" |
| Following — follow/unfollow | Professional and consumer accounts both follow the business profile → "Following ✓", confirmed on `/dashboard/following` for both |
| Self-follow blocked (UI) | No Follow button renders on either test account's own profile page |
| **Self-follow blocked (access-control layer)** | A real `<form>` bound to the actual `followProfileAction` was cloned from a genuine "Follow" button instance and its hidden `profileId`/`profileType` fields retargeted to the account's *own* profile before submitting — simulating a client tampering with the form fields, the exact attack the access check exists to prevent. Confirmed via direct database query: **no row was created**. This is a real access-control-layer proof, not a UI-gating check |
| **Duplicate-follow blocked (DB layer)** | The same real form was submitted twice in immediate succession while already following. Confirmed via direct database query: **exactly one row exists**, not two — the compound unique index rejected the second insert and `followProfileAction`'s duplicate handling absorbed it silently |
| Follower count | Private "N people follow your profile" line shown only to the profile's own owner; confirmed it incremented correctly and is absent from the public (non-owner) view |
| Ownership isolation | Business account's `/dashboard/saved` shows **0** items despite the professional account genuinely having saved data in the same `saved-profiles` table — the owner-scoped query has no cross-account leak, confirmed live, not just by code review |
| Activity Feed | Consumer account followed the business, then a review was posted on it and the business's profile was re-saved (triggering `updatedAt`) → the consumer's `/dashboard` Overview correctly showed both **"New review on Phase11 QA Bakery."** and **"Phase11 QA Bakery updated their profile."**, dated and linked — the full read-time composition pathway (follows query → batched review query → merge/sort) confirmed working end-to-end |
| Business reply (Phase 10 regression) | Business account replied to the new review from `/dashboard/reviews` → appeared there and on the public profile, unaffected by this diff |
| Verification page (Phase 10 regression) | `/dashboard/verification` loads correctly, unaffected |
| Directory regression | Both directories render the new profiles correctly with the new "Save this search" affordance present |
| Homepage regression | Renders correctly on retry; one transient `EAUTHTIMEOUT` database-pool error was hit once (unrelated to this diff — a Postgres connection-pool timeout under concurrent local scripts, not a code path this PR touches) and did not recur |

**Saved Searches — disclosed limitation.** The "Save this search" button's open/close toggle (a plain `useState` set directly inside its `onClick`, with no intervening `useActionState`/async step) could not be driven open through this sandboxed browser tool across multiple independent attempts — different pages, a hard reload, keyboard activation, and a direct `.click()` dispatch all confirmed the click genuinely reaches the DOM element (a manually-attached listener fires every time) but produce no observable re-render. This is now well-characterized, not a fresh mystery: the exact same failure mode was already documented in `PHASE10-RELEASE-REVIEW.md` for two other controls (the star-rating widget, the Report toggle) that share the identical shape — a synchronous `setState` call written directly inside `onClick`, with no async round-trip in between. By contrast, every control in this same implementation whose state instead updates via a `useEffect` reacting to a `useActionState` result (`SaveButton`, `FollowButton`) worked correctly and visibly on every attempt. Console inspection this pass additionally surfaced a plausible contributing mechanism not previously identified: this project's CSP (`script-src 'self' 'unsafe-inline'`) blocks the `eval()` Next.js Fast Refresh uses for hot-module reloading, throwing repeatedly in the console during this session's many live edits — a real, pre-existing site-wide CSP/dev-tooling interaction, not something this PR's code caused. **Unlike Phase 10's equivalent finding, this pass could not independently re-verify `saveSearchAction`'s live create path through an alternate route** (a standalone Local API script failed with a Next.js env-loader incompatibility outside the dev server process, not fixed in the time available this pass) — `saveSearchAction` is confirmed correct by `tsc`/code review (identical zod-validation and owner-scoped-create shape to every other action in this file) but was not exercised end-to-end live. This is disclosed plainly rather than assumed working, and is flagged as the one specific item the independent release review should prioritize confirming with a real click or a working Local API probe.

## C. Security Results

- **Self-follow prevention is enforced at the Payload access-control layer**, independently confirmed via a tampered real-form submission (not just Local-API impersonation) — see §B. This is arguably a stronger proof than a Local API call: it exercises the exact same code path a real malicious client would use (a genuine POST with forged field values), not a privileged bypass.
- **Duplicate-follow prevention is enforced at the database layer**, confirmed via a genuine double-submit race, not just a single attempt — the compound unique index on `(owner, profileKey)` is the same mechanism already proven correct in Phase 10 production for reviews/recommendations.
- **Ownership isolation confirmed live**: an account with genuinely different data in the same tables sees none of it on another account's dashboard. There is also no URL-parameter or query-string vector to even *attempt* cross-account access on `/dashboard/saved`/`/dashboard/following`/`/dashboard/saved-searches` — the owner filter is derived entirely from the server-side session, never from client input, so there is no attack surface to probe in the first place, a stronger property than "blocked when attempted."
- **No staff back-door on any of the three new collections' `read`/`delete`** — a deliberate departure from Phase 10's pattern, justified in §A/§C above by these collections holding no public content.
- **Follower count is private-only** — visible solely to the profile's own owner, never surfaced publicly this phase, specifically because no anti-gaming mechanism exists for it yet (see the design doc §L) — confirmed the public (non-owner) view never renders it.
- **Polymorphic-relationship string-vs-numeric ID coercion applied from the start** in every new Server Action that writes a `{relationTo, value}` field (`saveProfileAction`, `followProfileAction`) — the exact bug Phase 10 discovered and fixed live; here it was applied proactively rather than rediscovered.
- **No new authentication/session surface** — every new route sits under the existing `/dashboard/*` layout's unchanged `getNetworkUser()` gate.
- **No security defect found this pass.** The one open item is the disclosed, not-yet-independently-re-verified `saveSearchAction` live path (§B) — assessed as low risk given it reuses an already-`tsc`-verified, structurally identical shape to three other actions in the same file that *were* verified live, but not asserted as proven.

## D. Files Changed

| File | Change |
|---|---|
| `payload/collections/SavedProfiles.ts` | New |
| `payload/collections/Follows.ts` | New |
| `payload/collections/SavedSearches.ts` | New |
| `payload/access-social.ts` | New — all Phase 11 access control |
| `payload/access-trust.ts` | `getProfileOwnerId` exported (no behavior change) so `access-social.ts` can reuse it |
| `payload.config.ts` | Registers the 3 new collections |
| `lib/validation/social-schemas.ts` | New — zod schema + filter-key allowlist for saved searches |
| `lib/network/social-actions.ts` | New — save/unsave, follow/unfollow, save-search/delete-search Server Actions |
| `lib/network/social.ts` | New — saved/followed list + follower-count + saved-search read helpers |
| `lib/network/activity.ts` | New — read-time Activity Feed composition |
| `components/network/save-button.tsx` | New |
| `components/network/follow-button.tsx` | New |
| `components/network/save-search-button.tsx` | New |
| `components/network/delete-saved-search-button.tsx` | New |
| `app/(network)/dashboard/layout.tsx` | `+Saved`, `+Following`, `+Saved Searches` nav items, universal to every account type |
| `app/(network)/dashboard/page.tsx` | `+`Activity Feed panel for accounts without a profile; business/professional branch unchanged |
| `app/(network)/dashboard/saved/page.tsx` | New |
| `app/(network)/dashboard/following/page.tsx` | New |
| `app/(network)/dashboard/saved-searches/page.tsx` | New |
| `app/(app)/network/businesses/[slug]/page.tsx`, `professionals/[slug]/page.tsx` | `+`Save/Follow buttons, `+`private follower-count line |
| `app/(app)/network/businesses/page.tsx`, `professionals/page.tsx` | `+`"Save this search" affordance |

No existing collection's existing fields, no existing Server Action, and no existing page's existing content were removed or altered beyond these additions.

## E. Test Results

`node --test lib/**/*.test.ts` — **4/4 passing**, unaffected (no reserved-slug change needed; `/dashboard/saved`, `/dashboard/following`, `/dashboard/saved-searches` all nest under the already-reserved `/dashboard`).

## F. Build Results

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 errors/warnings**
- `next build` — **succeeds**, 54 routes generated including the three new dashboard routes (`/dashboard/saved`, `/dashboard/following`, `/dashboard/saved-searches`), identical route count and shape to the pre-Phase-11 baseline plus exactly these three additions — no regressions

## G. Commit Hash

`8f141a7` (branch `feat/phase11-consumer-network`)

## H. PR URL

[https://github.com/ralphchbib/thebusinesslb-website/pull/23](https://github.com/ralphchbib/thebusinesslb-website/pull/23) — not merged, per instruction.

## I. Release Review Recommendation

**Ready for independent release review**, with one specific item flagged for the reviewer's attention rather than left implicit: `saveSearchAction`'s live create path was not independently re-verified this pass (§B) — the button that triggers it could not be opened through this session's browser-automation tool, and a standalone Local API script hit an unrelated environment incompatibility. Every other Phase 11 feature area was verified live, including two genuine access-control-layer proofs beyond what a UI check alone would show: self-follow rejected via a tampered real-form submission (not just impersonation), and duplicate-follow rejected via a genuine double-submit race, both confirmed by direct database query rather than trusting the UI's response. Ownership isolation was demonstrated with data that genuinely existed for one account and was genuinely absent from another's view, not merely reasoned about. No security defect was found; the one disclosed gap is a verification-coverage gap on a single action, not a suspected or confirmed bug in it.
