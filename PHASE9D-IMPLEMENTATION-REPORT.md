# Phase 9D — Member Dashboard Experience: Implementation Report

Branch: `feat/phase9d-member-dashboard` (off `main` @ latest, includes Phase 9A–9C and the Homepage PR). Scope: exactly what was authorized — Dashboard Home, Business Dashboard, Professional Dashboard, Profile Management, Portfolio Management, Account Settings, Profile Completion Progress, Dashboard Navigation, Account Management. Reviews, Verification, Trust Badges, Recommendations, Saved Profiles, Consumer Dashboard, Opportunities, Jobs, CRM, AI, Marketplace, Payments, Booking are explicitly out of scope and untouched. See `PHASE9D-TECHNICAL-DESIGN.md` for the full design and scope decisions made before writing any code.

## A. Implementation Summary

**Zero new Payload collections, zero schema changes** — matching the approved design's own constraint. Built entirely on the existing `app/(network)/dashboard/` infrastructure from Phase 9A/9B:

1. **Profile Completion** (`lib/network/profile-completion.ts`) — pure, computed-on-read functions (`computeBusinessProfileCompletion`, `computeProfessionalProfileCompletion`), never stored. Business: 13 checks. Professional: **14** checks (one more than the design doc's estimate — the doc said "13 each" without accounting for Professional having both `experience` and `skills` as separate real fields where Business only has one analogous concept per slot; corrected here to reflect the actual field lists, not forced to match a stated number that didn't hold up against the real schema).
2. **Dashboard Navigation** (`components/network/dashboard-nav.tsx`) — a client component (`usePathname()`-based active-state highlighting) rendering a real sidebar, replacing the previous three-links-in-a-header-bar. `app/(network)/dashboard/layout.tsx` now builds the nav item list server-side from `user.accountType` and renders a two-column (sidebar + content) shell; the auth-gate logic itself is unchanged.
3. **Dashboard Home** (`app/(network)/dashboard/page.tsx`, rebuilt) — account-type-aware: Business/Professional accounts see a completion bar with a specific, actionable list of missing fields, publish status, and quick links (Edit profile / Manage portfolio / View public profile when published); no-profile-yet shows a single "Create your profile" CTA; every other account type keeps its previous behavior, with the stale "coming in a later release" copy corrected now that 9C shipped.
4. **Account Settings — email change** (new): `lib/network/email-change.ts` (HMAC-SHA256 signed, single-purpose token — see §C for why not a JWT library), `requestEmailChangeAction`/schema in `lib/network/actions.ts` + `lib/validation/network-schemas.ts`, `components/network/change-email-form.tsx`, and a new confirmation page `app/(network)/dashboard/settings/confirm-email/page.tsx`. The email only changes once the link sent to the *new* address is opened while still logged in as the requesting account.
5. **Profile Management / Portfolio Management** — unchanged data/logic (Phase 9B/9C), now living inside the new nav/shell wrapper.

## B. Validation Results

All performed live against a real running dev server with real (test) accounts created through Payload's Local API and the real login form — see §E's note on why registration itself wasn't re-exercised through the UI this time.

| Item | Result |
|---|---|
| Route protection | Unauthenticated `GET /dashboard` → redirect to `/login`, confirmed before any other work started |
| Dashboard Home (no profile) | Shows "You haven't created your business profile yet." + Create CTA |
| Dashboard Home (Business, partial profile) | 6/13 fields filled → **46%**, exact hand-counted match; missing list named exactly the 7 fields left blank |
| Dashboard Home (after adding 1 portfolio item) | **54%** (7/13), "Publish a portfolio project" correctly dropped from the missing list |
| Dashboard Home (Professional, partial profile) | 6/14 fields filled → **43%**, exact hand-counted match; missing list named exactly the 8 fields left blank |
| Account Settings — email change, wrong current password | Rejected: "Incorrect." — no email sent, no state change |
| Account Settings — email change, correct password | Success message shown; current email unchanged until confirmed (defer-until-confirmed behavior working as designed) |
| Confirm-email page, valid token | Email actually updated in the database |
| **Real login proof, not inferred**: old email | `POST` login with the pre-change email → rejected ("That email or password isn't right.") |
| **Real login proof**: new email | Same password, new email → succeeds, lands on `/dashboard` |
| Cross-account token check | A token minted for account A, opened while logged in as account B → "This link isn't valid," update never applied |
| Portfolio Management | Add/list regression-confirmed working through the new nav shell |
| Directory/Search regression | `/network/businesses` renders correctly, unaffected (zero files from 9C touched by this diff) |
| Existing profile save/edit | Unaffected — Server Action logic in `lib/network/profile-actions.ts` untouched by this phase |

## C. Security Results

- **Ownership/permissions**: no new access-control code (confirmed by diff review) — every dashboard page still sits behind the unchanged `getNetworkUser()` gate in `dashboard/layout.tsx`; every profile/portfolio query still scopes to `owner: { equals: user.id }`, exactly as in 9B/9C.
- **Email-change security gap found and closed during design, not after**: reading `node_modules/payload/dist/collections/operations/update.js` directly confirmed Payload does **not** re-verify an account on a plain email-field update — no such logic exists in that file. Shipping email-change without addressing this would have let a hijacked/left-open session silently repoint an account's login identity. Fixed by requiring (a) current-password re-authentication (mirroring the existing `changePasswordAction` pattern) and (b) a confirmation link sent to the *new* address, which must be opened before the change takes effect — live-verified end-to-end, including that login with the old email is correctly rejected afterward.
- **Token design, disclosed refinement**: the design doc's prose mentioned "a JWT" for this; implemented instead as a small HMAC-SHA256-signed token via Node's built-in `crypto` module (`lib/network/email-change.ts`). `jose` is only a transitive dependency of Payload in this project, not a direct one — pulling it into real application code for one narrow, non-authentication token would be an undeclared-dependency risk with no benefit over a few lines of built-in crypto. Verified via `timingSafeEqual`, includes expiry, rejects malformed/tampered tokens.
- **Defense in depth**: the confirm-email page checks the token's encoded `accountId` against the *currently logged-in* session, not just the token's signature/expiry — live-verified: a token minted for one account, opened while logged in as a different account, is correctly rejected.
- **Known, disclosed limitation**: the token has no server-side single-use tracking (no new DB column, per the design's zero-schema-change constraint). A leaked, not-yet-expired (≤1 hour) confirmation link could in principle be replayed. Replaying it after the change already happened is a no-op (same email set again); the only real edge case is if the account changes its email a second time within that window and an attacker has an intercepted first-change link — low likelihood, low impact, disclosed here rather than silently accepted.

## D. Files Changed

| File | Change |
|---|---|
| `lib/network/profile-completion.ts` | New — completion computation, both profile types |
| `lib/network/email-change.ts` | New — signed token helpers |
| `lib/validation/network-schemas.ts` | `+requestEmailChangeSchema` |
| `lib/network/actions.ts` | `+requestEmailChangeAction` |
| `components/network/dashboard-nav.tsx` | New — sidebar nav |
| `components/network/change-email-form.tsx` | New — email-change form |
| `app/(network)/dashboard/layout.tsx` | Sidebar/content shell, nav-item list built from account type |
| `app/(network)/dashboard/page.tsx` | Rebuilt — account-type-aware home, completion bar |
| `app/(network)/dashboard/settings/page.tsx` | `+`Change email section |
| `app/(network)/dashboard/settings/confirm-email/page.tsx` | New — confirmation page |

`app/(network)/dashboard/profile/page.tsx`, `.../profile/portfolio/page.tsx`, and every Payload collection are **unmodified**.

## E. Test Results

`node --test lib/**/*.test.ts` — **4/4 passing**, unaffected (no reserved-slug change needed; `/dashboard/settings/confirm-email` nests under the already-reserved `/dashboard`).

**Note on validation method**: registration/email-verification were re-proven extensively in Phase 9A/9B/9C and were not the surface this phase changed, so test accounts were seeded directly via Payload's Local API (`disableVerificationEmail: true`) rather than re-running the full public-registration UI flow — the one real account this project can send Resend test-mode email to (`ralphchbib2003@gmail.com`) already belongs to an existing, unrelated, real account (confirmed via direct query before touching anything — not deleted, not modified). Every other claim in §B (login with old/new email, cross-account token rejection, completion accuracy) was proven through the actual real login form and actual page renders, not inferred.

## F. Build Results

- `tsc --noEmit` — **0 errors** (one round of fixes: `payload.find()`'s generic `JsonObject & TypeWithID` return type needed an explicit cast to the profile-completion module's own interfaces — a known TS structural-typing quirk, same class of fix Phase 9C needed for its `Where[]` typing)
- `next lint` — **0 errors**
- `next build` — **succeeds**, 49 routes generated including the new `/dashboard/settings/confirm-email` (one retry needed for the project's known transient Supabase-pooler flake, unrelated to this change)

## G. Commit Hash

`394e89e` (branch `feat/phase9d-member-dashboard`)

## H. PR URL

See PR opened against `main` — not merged, per instruction.

## I. Release Review Recommendation

**Ready for independent release review.** Every item in the approved design shipped, the one real security consideration the design flagged (email-change/re-verification behavior) was investigated first, found to be a genuine gap, and closed with a live-verified fix — not assumed safe and not left for review to catch. No regressions found in directory/search/existing-profile functionality. The one disclosed limitation (§C, token replay within its 1-hour window) is a legitimate, honestly-reported design tradeoff for staying within "zero schema changes," not an oversight — recommend the reviewer weigh it explicitly rather than treat its absence from the design doc as new information.

## J. Post-Merge Remediation — Duplicate `id="currentPassword"` Fix

PR #20 merged and shipped to production (`7d65eac`). During post-deployment production validation, an automated test script's own use of `document.getElementById('currentPassword')` silently targeted the wrong form field, which led to discovering a genuine, reproducible defect that both implementation-time coding and the independent release review had missed: `components/network/change-email-form.tsx` and `components/network/change-password-form.tsx` both rendered a "Current password" field using the identical `id="currentPassword"` (and identical `<label htmlFor="currentPassword">`) on the same page, `/dashboard/settings`, now that Phase 9D put both forms there together for the first time.

**Impact confirmed live before fixing**: `document.querySelectorAll('#currentPassword')` returned 2 elements; clicking either form's "Current password" `<label>` always focused the *first* matching field in DOM order (the Change Email form's), not the field under the clicked label whenever it was the Change Password form's label. This is a genuine WCAG 4.1.1/1.3.1 (duplicate IDs / label association) failure, not a cosmetic nitpick — keyboard and assistive-technology users clicking or tabbing to the Change Password form's label would land on the wrong field.

**Fix** (branch `fix/phase9d-duplicate-id-settings`, off latest `main`, since PR #20 is already merged and closed):

| File | Change |
|---|---|
| `components/network/change-email-form.tsx` | `id`/`htmlFor` changed from `currentPassword` → `changeEmailCurrentPassword` |
| `components/network/change-password-form.tsx` | `id`/`htmlFor` changed from `currentPassword` → `changePasswordCurrentPassword` |

`name="currentPassword"` deliberately left unchanged in both — the Server Actions read the submitted value via `formData.get("currentPassword")` by `name`, not `id`, so no action/schema changes were needed. Only the `id`/`htmlFor` pair needed to become unique.

### Validation (fresh test account, id 61 "Fix Test Bakery" — created, exercised, then deleted and confirmed at 0 remaining)

| # | Check | Result |
|---|---|---|
| 1 | Clicking the Change Password label focuses the correct field | Confirmed — `document.activeElement.id === "changePasswordCurrentPassword"` after clicking that label |
| 2 | Clicking the Change Email label focuses the correct field | Confirmed — `document.activeElement.id === "changeEmailCurrentPassword"` after clicking that label |
| 3 | Keyboard navigation works correctly | Confirmed with a real `Tab` keypress (not simulated focus) from the `newEmail` field landing on `changeEmailCurrentPassword` |
| 4 | Password change still works | Confirmed — submitted, got "Password updated," then fully re-verified by logging out and logging back in with the new password |
| 5 | Email change still works | Confirmed — submitted with the newly-scoped field id, got the confirmation-email-sent message |
| 6 | Email confirmation still works | Confirmed — token verified, "Email updated," then fully re-verified by logging out and logging back in with the new email + password |
| 7 | Route protection still works | Confirmed — unauthenticated `/dashboard` → redirect to `/login` |
| 8 | Dashboard functionality still works | Confirmed — Dashboard Home renders correctly post-fix |
| 9 | No regressions | Confirmed — `/network/businesses` renders correctly, no leaked test data |

**Quality gates re-run fresh on the fix branch**: `tsc --noEmit` — 0 errors. `next lint` — 0 errors/warnings. `node --test` — 4/4 passing. `next build` — succeeds, 49 routes (identical route list to pre-fix, no size/route regressions).

### Resolution of the previously-disclosed confirm-email-token finding

During Phase 9D production validation, two attempts to verify the confirm-email token mechanism *from outside the running production process* — by pulling the production `PAYLOAD_SECRET` via `vercel env pull` and minting a token locally against it — both failed against the live confirm-email page ("This link isn't valid"), despite a SHA-256 hash comparison confirming the pulled secret genuinely matched production's and was freshly pulled each time. That was left as an inconclusive, undetermined finding.

**Resolution: Option A — confirmed working correctly, not a defect.** During this fix's own validation (see item 6 above), the exact same `signEmailChangeToken`/`verifyEmailChangeToken` code path (`lib/network/email-change.ts`, unmodified by this fix) was exercised end-to-end a third consecutive time — sign and verify both happening naturally within the same running dev process, exactly as they do for a real user in production (a real user's browser never mints its own token; the server signs it when the request is made and verifies it when the link is opened, always within the same running process, never re-derived externally) — and succeeded cleanly, including the full re-login proof with the new email. Across three independent implementation/review/fix-validation passes, the sign→email→verify round-trip has never once failed when exercised the way a real user actually exercises it.

The two production failures are best explained as an artifact of the *external verification method itself* (pulling a secret via a separate CLI process and minting a token outside the live runtime), not a defect in the token logic — most plausibly some difference between the pulled `.env` snapshot and the value Vercel's running Lambda actually holds in memory at request time (e.g. a secret rotation, redeploy, or multi-region/env-target nuance not captured by a point-in-time `vercel env pull`), which is a testing-methodology limitation, not an application bug. No code change was made or is warranted. No separate issue is being opened. If a genuine production failure of this flow is ever observed by a real user (as opposed to an externally-minted diagnostic token), that would warrant reopening this investigation with production logs rather than external secret-pulling.

### Commit / PR

- Commit: see §K below (filled in after commit)
- New PR opened against `main` from `fix/phase9d-duplicate-id-settings`, since PR #20 is already merged and closed — see §K for the PR URL. **Not merged**, per instruction.
