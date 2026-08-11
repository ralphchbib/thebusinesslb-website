# Phase 9A — Authentication & Account Types: Implementation Report

Branch: `feat/phase9a-authentication` (off `main` @ `4740c68`, includes Phase 8). Scope: exactly `PHASE9A-TECHNICAL-DESIGN.md` — the `network-accounts` collection, registration, login, logout, email verification, forgot/reset password, account-type selection, protected dashboard shell, session management, route protection, for all five account types. No profiles, directories, search, portfolio, verification badges, reviews, or dashboard features beyond the shell — all explicitly out of scope and untouched.

## 1. What shipped

### 1.1 `network-accounts` collection (`payload/collections/NetworkAccounts.ts`)

`auth: true`, `admin.hidden: true` (never appears in or authenticates into `/admin` — the actual security boundary is `payload.config.ts`'s unchanged `admin.user: Users.slug`, not the hidden flag, per the design doc). Fields: `name`, `accountType` (business/professional/consumer/institution/diaspora, staff-only to change after creation), `diasporaCountry` (conditional), `status` (active/suspended, staff-only, enforced via a `beforeLogin` hook that throws for suspended accounts). Custom `verify`/`forgotPassword` email templates linking to this app's own `/verify-email` and `/reset-password` pages rather than Payload's default link shape.

**Disclosed deviation from `PHASE9A-TECHNICAL-DESIGN.md` §B**: the design doc specifies `create: anyone` for this collection's access control; the shipped code uses a stricter `staffOnlyCreate` instead (`payload/access-network.ts`), blocking direct unauthenticated REST self-registration in favor of registration going exclusively through the honeypot/throttle-protected `registerAction` Server Action (which uses the Local API's `overrideAccess: true` default and is unaffected by this restriction). This is a tightening, not a weakening, and was flagged as an undisclosed gap by the independent release review — disclosed here per that finding.

### 1.2 Session layer (`lib/network/session.ts`) — the corrected architecture from the design doc

Implements `PHASE9A-TECHNICAL-DESIGN.md` §A.1 exactly: a distinctly-named `network-token` cookie (httpOnly, secure in production, `sameSite: lax`), set/cleared only by this app's own Server Actions (never Payload's auto-generated REST auth endpoints), and validated server-side by reading the cookie and passing it to Payload's Local API `auth()` operation via an `Authorization: Bearer` header — using Payload's own built-in Bearer-extraction path (`jwtOrder` default), not a workaround outside its design.

### 1.3 Registration, login, logout, forgot/reset password (`lib/network/actions.ts`)

All Server Actions, reusing Phase 7's exact honeypot + `checkAndRecordThrottle` pattern (now exported from `lib/actions.ts` for reuse) with three new throttle keys (`network-register`, `network-login`, `network-forgot-password`). Registration deliberately does **not** log the user in immediately — Payload's own login operation throws `UnverifiedEmail` for an unverified account when `auth.verify` is enabled (confirmed by reading `auth/operations/login.js` directly), so the account is created, the verification email dispatches, and the session is established only after the user verifies.

### 1.4 Email verification (`app/(network)/verify-email/page.tsx`, `lib/network/verify.ts`)

A Server Component reads the `?token=` query param and calls Payload's Local API `verifyEmail()` directly during render — no Server Action wrapper needed, since a Server Component already runs exclusively server-side. Successful verification redirects to `/login?verified=true`.

### 1.5 Protected dashboard shell (`app/(network)/dashboard/layout.tsx`, `.../page.tsx`, `.../settings/page.tsx`)

Route protection is a layout-level server check (`getNetworkUser()` → `redirect('/login')` if null), not a `middleware.ts` change — deliberately, to keep the existing shared CSP/security-header middleware and its matcher completely untouched, per the design doc's risk table. Settings includes a password-change form that re-verifies the current password via a real `payload.login()` call before allowing the change (a stolen/left-open session alone can't lock out the real owner).

### 1.6 Account-type selection (`components/network/register-form.tsx`)

Five selectable cards matching Blueprint v3 §49's exact labels, driving conditional fields (e.g. `diasporaCountry` only for Diaspora) client-side before submission.

## 2. Issues found and fixed during implementation

Beyond the cookie-collision correction already made at the design stage (§A.1 of the technical design, carried through as-built with no further changes needed), two new issues surfaced during implementation and validation — both environment/tooling issues, not code defects, but both required real fixes to complete validation:

1. **Missing database table.** `next start` (production mode) does not auto-push a new collection's schema to Postgres — that only happens via `next dev`'s dev-mode schema sync. Registering `network-accounts` in `payload.config.ts` alone wasn't enough; the first registration attempt failed with `relation "cms.network_accounts" does not exist`. Fixed by briefly running `next dev` once to trigger the schema push, then returning to `next start` for actual validation.
2. **Corrupted `.next` build directory.** Running `next dev` immediately after a `next build` left `.next` in a hybrid, inconsistent state (only 6 static chunks present instead of the expected ~65), causing a real `ChunkLoadError` when loading `/admin`. Fixed with a genuinely clean rebuild (`rm -rf .next && next build`), confirmed by chunk count (65) before re-validating.

Neither issue reflects a defect in the Phase 9A code itself — both are artifacts of the specific sequence of local commands run during validation, disclosed here for transparency rather than treated as if they hadn't happened.

## 2.5. Remediation: REST auth endpoint cookie collision (post-review fix)

The independent release review ([PHASE9A-RELEASE-REVIEW.md](PHASE9A-RELEASE-REVIEW.md)) found that §A.1's fix — a distinct `network-token` cookie plus a Bearer-header bridge — only protected this app's own Server Actions. Payload still auto-generates full REST endpoints for every `auth: true` collection regardless of whether the app calls them, and nothing in the original `NetworkAccounts.ts` disabled them. The review confirmed live that `POST /api/network-accounts/login` (and by the same mechanism `logout`/`refresh-token`/`forgot-password`/`reset-password`) set the exact same `payload-token` cookie the admin `users` collection's login sets — reproducing, via a standard and discoverable Payload REST path, the collision the whole session architecture exists to avoid. The same unguarded `forgot-password` endpoint also bypassed the app's own throttle protection entirely (throttle only runs inside the Server Action, not the collection).

**Fix** (`payload/collections/NetworkAccounts.ts`): those five endpoints are now shadowed with a blocking handler at the identical `{method, path}`. Payload's route resolver (`handleEndpoints`) returns the first array match, and a collection's own `endpoints` entries are placed before its auto-generated auth endpoints in the merged array (`collections/config/sanitize.js`) — so the shadow wins, and the request never reaches Payload's real login/logout/refresh/forgot-password/reset-password handlers. Calling any of the five now returns `404 Not found`. `verify` is deliberately left alone (never sets a cookie, was never part of the collision surface, and the app calls it via the Local API anyway, not REST). This required no change to `access` config, session logic, or any Local-API-driven flow — Local API calls (`payload.login()`, etc., used throughout `lib/network/actions.ts`) bypass Payload's REST routing entirely and are unaffected by this change.

**Verified independently** in [PHASE9A-SECOND-RELEASE-REVIEW.md](PHASE9A-SECOND-RELEASE-REVIEW.md): all five endpoints confirmed blocked live (no `Set-Cookie` header at all from the former login collision point); `verify` and the admin `users` login confirmed unaffected; every app-driven flow (registration → verification → login → dashboard → settings → logout → forgot-password → reset-password) re-run end-to-end in a real browser and confirmed working exactly as before; throttle protection driven to its limit through the real UI and confirmed blocking the 4th attempt, with no REST path left to route around it.

## 3. Standard checks (run from a clean state, re-confirmed after remediation)

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 errors**
- `node --test lib/**/*.test.ts` — **4/4 passing** (including `reserved-slugs.test.ts`, updated for the 7 new Phase 9A route segments)
- `next build` — **succeeds**, 43/43 static pages generated (36 existing + 7 new: `/dashboard`, `/dashboard/settings`, `/forgot-password`, `/login`, `/register`, `/reset-password`, `/verify-email`)

## 4. Files changed

| File | Change |
|---|---|
| `payload/collections/NetworkAccounts.ts` | New — the auth collection; later amended (§2.5) to shadow 5 REST auth endpoints |
| `payload/access-network.ts` | New — ownership-based access helpers, mirroring `payload/access.ts`'s shape |
| `payload.config.ts` | `+NetworkAccounts` registration (additive only — confirmed via diff that `Users.ts`/`payload/access.ts` are completely untouched) |
| `lib/network/session.ts` | New — cookie + Bearer-bridge session layer |
| `lib/network/actions.ts` | New — register/login/logout/forgot-password/reset-password/change-password Server Actions |
| `lib/network/verify.ts` | New — plain (non-Server-Action) email-verification helper |
| `lib/validation/network-schemas.ts` | New — zod schemas for all 5 forms |
| `lib/actions.ts` | `checkThrottle` exported for reuse (no behavior change) |
| `lib/cms/reserved-slugs.ts`, `reserved-slugs.test.ts` | `+network, register, login, dashboard, verify-email, forgot-password, reset-password` |
| `app/(network)/layout.tsx` | New — minimal independent root layout (Inter only, no marketing Header/Footer/consent-banner/analytics), matching `(payload)`'s existing precedent of a separate root layout per top-level route group |
| `app/(network)/register/`, `login/`, `verify-email/`, `forgot-password/`, `reset-password/`, `dashboard/`, `dashboard/settings/` | New pages |
| `components/network/*.tsx` | New — 5 form components |

No existing route, existing collection, or existing access-control function was modified.

## 5. What was deliberately NOT done

- Business/Professional Profiles, portfolio, directories, search, public profiles — Phase 9B/9C.
- Verification badges, Trust Passport, reviews — Phase 10 (Release 2).
- Dashboard features beyond the shell (CRM, booking, AI tools, analytics) — Release 3.
- Any change to the existing marketing site, admin panel, or Phase 7/8 functionality.
- No merge, no deploy — standard PR workflow, per instruction.
