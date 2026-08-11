# Phase 9A — Authentication & Account Types: Technical Design

Scope: exactly `PHASE9-IDENTITY-DISCOVERY-PLANNING-PACKAGE.md` §22's Phase 9A definition — Network Accounts collection, registration, login, logout, password reset, account-type selection, protected dashboard shell, route protection, session management, for all five account types (Business, Professional, Consumer, Institution, Diaspora). Business Profiles, Professional Profiles, directories, search, portfolio, verification, reviews, dashboard *features*, and public profiles are explicitly out of scope — Phase 9B/9C/9D territory, untouched here.

**Pre-implementation validation performed for this document**: re-read the approved planning package in full, re-read Blueprint v3 §4, §49, §51 directly from the source `.docx`, confirmed current git state (`main` @ `4740c68`, clean, no drift since Phase 8's merge), and — critically — traced the actual installed Payload 3.87.0 source (`node_modules/payload/dist`) rather than trusting the planning package's assumption about multi-collection auth. That trace found a real problem, corrected below in §A. This is exactly the kind of verification this project's discipline exists for, and it changed a load-bearing part of the approved design before any code was written.

---

## A. Phase 9A Technical Design

### A.1 The correction: Payload does not namespace session cookies per auth collection

The approved planning package (§5) stated admin (`users`) and Network (`network-accounts`) sessions would be "fully independent cookies/JWTs" once `network-accounts` is registered as a second `auth: true` collection. Tracing the actual installed code disproves the strong form of that claim:

- `node_modules/payload/dist/auth/cookies.js`'s `generatePayloadCookie()` names every auth cookie `${cookiePrefix}-token`.
- `node_modules/payload/dist/config/types.d.ts` confirms `cookiePrefix` is a single **global** Payload config value (default `"payload"`), not a per-collection setting — the per-collection `auth.cookies` config (`auth/types.d.ts`) only exposes `domain`/`sameSite`/`secure`, no `name` override.
- `node_modules/payload/dist/auth/endpoints/login.js` confirms the REST login handler passes `req.payload.config.cookiePrefix` verbatim — no collection-slug suffixing anywhere in the call chain.

**Consequence if `network-accounts` were registered and used via Payload's auto-generated REST auth endpoints as originally planned**: both collections' sessions would share one cookie name. Logging into the Network as a member would silently overwrite an active admin session in the same browser, and vice versa — not a security hole (each JWT is still cryptographically distinct and correctly scoped to its own collection; `req.user.collection` still correctly reports which one authenticated), but a real correctness bug that would make internal QA (an admin/editor testing the member experience in the same browser) confusing and unreliable, and would violate the explicit Blueprint §51 requirement that the two logins be genuinely separate.

**The fix, verified working end-to-end at the source level:**

1. `network-accounts` still gets `auth: true` — all of Payload's password hashing, JWT signing, lockout, and email-verification/reset-token logic is reused unchanged.
2. Login, registration-with-session, logout, and dashboard route-protection are handled by **thin custom Next.js Route Handlers / Server Actions** that call Payload's **Local API** (`payload.login()`, `payload.create()`, `payload.forgotPassword()`, `payload.resetPassword()`) directly, rather than relying on the auto-generated REST endpoints. The Local API's underlying `loginOperation` (`auth/operations/login.js`) contains **zero cookie-setting logic** — confirmed by direct inspection — so calling it manually has no hidden cookie side effect to conflict with.
3. Our own code sets one distinctly-named cookie, `network-token` (httpOnly, secure in production, `sameSite: 'lax'`), holding the JWT `payload.login()` returns.
4. To validate that cookie server-side (dashboard route protection, any Local-API read scoped to the logged-in account), we read `network-token` ourselves and construct a `Headers` object with `Authorization: Bearer <token>`, then call Payload's Local API `auth({ headers, req })`. This works because Payload's JWT extraction (`auth/extractJWT.js`) tries three methods in a configurable order — `jwtOrder: ['JWT', 'Bearer', 'cookie']` is the **default**, confirmed in `config/defaults.js` — and `Bearer` extraction reads the `Authorization` header we construct ourselves, completely independent of any cookie name. No Payload core behavior is modified; this uses a documented, built-in extraction path exactly as designed.
5. Email verification (`auth.verify: true`) is the one auth operation that *can* safely use Payload's standard auto-generated REST endpoint (`/api/network-accounts/verify/:token`) as originally planned — it doesn't set a session cookie at all (it just marks the account verified and returns a message), so there's no collision surface for that one operation.

Net effect: the *architectural* decision in the approved plan (a second, independent `auth: true` collection, Blueprint §51 satisfied) is unchanged and confirmed sound. What changes is *how* login/logout/registration/session-reading are wired — a small, well-understood, custom integration layer instead of "free" auto-generated endpoints for those four operations specifically. This does not change Phase 9A's effort estimate meaningfully (§C of the planning package already budgeted 8–10 days for "genuinely new infrastructure, not a variation on existing patterns" — this is exactly that).

### A.2 Everything else from the approved plan, reconfirmed unchanged

- Ownership-based authorization model (planning package §6) — unaffected by the cookie-naming fix; `req.user.collection === 'network-accounts'` is still how every access-control function distinguishes a network account from staff.
- Five account types via one `network-accounts` collection with an `accountType` discriminator field, no per-type profile collection in 9A (profiles are 9B).
- Registration flow, onboarding hand-off, and dashboard-shell routing exactly as planned (planning package §7, §8, §15, §18).
- `RESERVED_SLUGS` update requirement (planning package §16, §21) — reconfirmed by re-reading `lib/cms/reserved-slugs.ts` directly this session; the mechanism and the Phase 2 collision bug it guards against are exactly as previously documented.
- No changes to `Leads`, `NewsletterSubscribers`, `RateLimitEvents`, or any existing collection, route, or the existing `users` auth collection's own behavior — the `users` collection's cookie name (`payload-token`, unchanged) is untouched by this design; only the *new* collection avoids it.

---

## B. Collections Required

Exactly one new Payload collection in 9A — profiles, portfolio, and inquiries are 9B/9D, not built here.

### `network-accounts` (`auth: true`)

| Field | Type | Notes |
|---|---|---|
| `email` | (auth-managed) | Payload's standard auth field |
| `password` | (auth-managed) | Payload's standard auth field, hashed by Payload |
| `accountType` | select, required | `business` \| `professional` \| `consumer` \| `institution` \| `diaspora` — set once at registration, immutable after (no account-type-switching UI in 9A) |
| `name` | text, required | Display name (person name for professional/consumer, org name for business/institution — same field, label varies by `accountType` in the UI only) |
| `diasporaCountry` | text, conditional | Shown/required only when `accountType === 'diaspora'`, per planning package §4 |
| `status` | select, default `active` | `active` \| `suspended` — admin-settable only, groundwork for Phase 9's reactive-moderation model (planning package §20); no suspension UI/workflow built in 9A, just the field and an access check that a `suspended` account cannot log in |
| `savedBusinesses`, `savedProfessionals` | relationship arrays | Declared now (schema-forward per planning package §17) but **inert in 9A** — no business/professional profiles exist yet to save; these fields have no UI until 9D |

**Access control** (`payload/access-network.ts`, new file, mirroring `payload/access.ts`'s existing shape):

```
read:   self only, or admin/editor           (ownAccountOrStaff)
create: anyone (public registration)          (anyone, reused from payload/access.ts)
update: self only, or admin/editor            (ownAccountOrStaff)
delete: admin/editor only                     (adminOrEditor, reused as-is)
```

`admin.hidden: true` at the collection level (or equivalent) so `network-accounts` never appears in Payload's `/admin` panel navigation for editors — admins can still reach it directly if needed for support/moderation, but it's not surfaced as a primary content type the way Leads/Pages are, since Phase 9A's own custom dashboard is the intended management surface for a network account's *own* data, and admin moderation (§20) only needs occasional direct access, not a polished list view yet.

---

## C. Route Map

| Route | Group | Type | Purpose |
|---|---|---|---|
| `/register` | new `(network)` | Server Component + client form | Account-type selection (5 cards) → email/password form |
| `/login` | `(network)` | Server Component + client form | Email/password login |
| `/verify-email` | `(network)` | Server Component | Landing page after clicking the verification email link; calls Payload's standard `/api/network-accounts/verify/:token` REST endpoint client-side |
| `/forgot-password` | `(network)` | Server Component + client form | Request a reset email |
| `/reset-password` | `(network)` | Server Component + client form | Consume a reset token, set a new password |
| `/dashboard` | new `(dashboard)`, auth-gated | Server Component | Minimal shell only — "Welcome, {name}" + account-type badge + logout. No profile/portfolio/inbox content (9B/9D) |
| `/dashboard/settings` | `(dashboard)`, auth-gated | Server Component + client form | Change password (via `payload.update()` Local API on the current account), view `accountType`/`email` (read-only in 9A) |

**Route Handlers / Server Actions (no page, API-only):**

| Path | Purpose |
|---|---|
| `app/(network)/register/actions.ts` → `registerAction` | Server Action: honeypot + throttle check → `payload.create({ collection: 'network-accounts', ... })` → `payload.login()` → set `network-token` cookie → redirect to onboarding hand-off placeholder (9B builds the real destination; 9A redirects to `/dashboard`) |
| `app/(network)/login/actions.ts` → `loginAction` | Server Action: throttle check → `payload.login()` → set `network-token` cookie → redirect to `/dashboard` |
| `app/(network)/logout/route.ts` | Route Handler: clear `network-token` cookie → redirect to `/` |
| `app/(network)/forgot-password/actions.ts` → `forgotPasswordAction` | Server Action: throttle check → `payload.forgotPassword({ collection: 'network-accounts', data: { email } })` |
| `app/(network)/reset-password/actions.ts` → `resetPasswordAction` | Server Action: `payload.resetPassword({ collection: 'network-accounts', data: { token, password } })` → set `network-token` cookie (Payload's `resetPassword` operation returns a fresh token, logging the user in immediately) → redirect to `/dashboard` |

All five new top-level segments (`network`, `register`, `login`, `dashboard`, plus `forgot-password`/`reset-password`/`verify-email` if they end up as top-level rather than nested under `(network)`) are added to `RESERVED_SLUGS` as the first implementation commit, before any route exists to collide — reconfirmed as the correct, only structural backstop per `PHASE2-COLLISION-FIX-REPORT.md`.

---

## D. Security Architecture

- **Password hashing, JWT signing/verification, lockout-after-failed-attempts**: 100% Payload's own, unmodified implementation — zero custom crypto written for this phase.
- **Session cookie**: `network-token`, `httpOnly: true` (never readable by client-side JS — mitigates XSS token theft), `secure: true` in production (matches the existing `VERCEL_ENV === 'production'` distinction already used in `payload.config.ts` for `serverURL`), `sameSite: 'lax'` (allows top-level navigation after email links like verify/reset while still blocking cross-site POST forgery), scoped to `path: '/'`.
- **CSRF**: Payload's REST auth endpoints (used only for `verify`) already check the existing `csrf` allowlist (`payload.config.ts`'s `trustedOrigins`) — unaffected. Our custom Server Actions/Route Handlers are same-origin by construction (Next.js Server Actions carry Next's own built-in CSRF-equivalent origin check; the `logout` Route Handler is a same-origin `POST` reached only from our own UI).
- **Abuse mitigation on `/register`, `/login`, `/forgot-password`**: honeypot field (`company_website`-style hidden input) + persistent throttle via the existing `RateLimitEvents` collection and `checkAndRecordThrottle()` helper (`lib/cms/rate-limit.ts`) — the exact, already-proven Phase 7 pattern, applied to three new throttle keys (`network-register`, `network-login`, `network-forgot-password`).
- **Account lockout**: Payload's built-in `maxLoginAttempts`/`lockTime` (standard `auth` config options) enabled with the same defaults Payload ships, giving brute-force protection on top of the throttle layer without custom code.
- **`network-accounts` admin-panel exclusion**: `admin.hidden: true` (or an equivalent `access.admin: () => false` if the panel-visibility flag alone doesn't also block direct panel authentication — this exact mechanism is verified as the first implementation step of 9A, not assumed) ensures a network account can never authenticate into `/admin`, structurally.
- **No cross-session privilege confusion**: even though the *original* plan's "fully independent cookies" framing needed correction (§A.1), there was never a security defect — `req.user.collection` always correctly identifies which collection issued a given JWT, and access-control functions check that explicitly. The fix in §A.1 corrects a UX/correctness bug (session overwrite), not a security vulnerability.
- **Existing middleware's CSP/security headers** (`middleware.ts`) already apply to every route via its broad matcher — reconfirmed by direct reading this session — so `(network)`/`(dashboard)` inherit CSP, X-Frame-Options, etc. automatically with zero new configuration. The only middleware change needed is adding the `/dashboard/*` auth-redirect check (new logic, not a modification of the existing security-header logic).

---

## E. Database Changes

Additive only, same `cms` Postgres schema every collection already lives in (`payload.config.ts`'s `postgresAdapter({ schemaName: 'cms' })`, unchanged):

- One new table set for `network-accounts` (Payload's Postgres adapter auto-generates the table + auth-related columns from the collection config — no hand-written migration/SQL, consistent with how every collection in this codebase has been added since Phase 1).
- No changes to any existing table, column, index, or access-control rule on `users`, `Leads`, `NewsletterSubscribers`, `RateLimitEvents`, or any content collection.
- `RateLimitEvents` gains three new possible `kind` values (`network-register`, `network-login`, `network-forgot-password`) as data, not a schema change — the collection's `kind` field is already a plain string, per the existing Phase 7 pattern.

---

## F. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Shared cookie-name collision between `users` and `network-accounts` (found this session) | Was **High** if unaddressed | **Resolved in design** — §A.1's custom cookie + Bearer-header bridge, verified against actual installed Payload source, not documentation alone |
| The Bearer-header bridge (§A.1 step 4) is a real but non-trivial integration pattern with no existing precedent in this codebase | Medium | First concrete implementation task in 9A is a direct, live-browser-verified round trip (register → cookie set → dashboard load → `auth()` call succeeds) before any other 9A work proceeds — same "prove the foundation before building on it" discipline Phase 8 applied to `track()`'s race condition |
| `admin.hidden`/panel-exclusion mechanism for `network-accounts` needs confirming it actually blocks authentication, not just navigation visibility | Medium | Verified directly (attempt an actual login to `/admin` with network-account credentials, confirm rejection) as part of 9A's validation, not assumed from the config option's name |
| Honeypot/throttle reuse across three new form flows triples the surface area that could have a copy-paste bug (e.g., wrong `kind` string reused across register/login/forgot-password, silently sharing one throttle bucket) | Low | Each flow's throttle key is explicitly distinct and directly tested during validation, mirroring how Phase 7's per-form throttle keys were verified independently |
| `network-accounts` visible via Payload's Local API to any server code in the app — a coding mistake elsewhere in the app *could* theoretically read/leak account data if a future collection's access function is copy-pasted carelessly | Low | Same class of risk every existing collection already carries; no new exposure — access functions are the single enforcement point, same as today |

---

## G. Acceptance Criteria

Directly from the approved planning package's Phase 9A acceptance criteria (§22), unchanged, plus one addition from this document's own finding:

1. All 5 account types can register, verify email, log in, log out, and reset a forgotten password, end-to-end, in a real browser.
2. **An admin/editor session and a network-accounts session, held in the same browser at the same time, are confirmed genuinely independent** — logging into `network-accounts` does not affect an active `/admin` session, and vice versa. This is now directly testable (it wasn't, correctly, before §A.1's fix) and must be tested, not just asserted.
3. `network-accounts` credentials are confirmed **unable** to authenticate into `/admin` — direct negative test, not inferred from config.
4. `/dashboard/*` correctly redirects an unauthenticated visitor to `/login`, and correctly admits an authenticated one, reading the `network-token` cookie via the Bearer-bridge validation path.
5. Zero regression in existing `(app)`/`(payload)` routes, security headers, or Phase 7/8 functionality — full regression re-check (Leads/NewsletterSubscribers creation, security 403s on existing collections, analytics events still firing), matching the standard every prior phase's release review has applied.
6. `RESERVED_SLUGS` updated and verified — a Payload Page cannot be published with a slug that collides with any new 9A route.

---

## H. Rollback Plan

Low blast radius, matching the planning package's own rollback assessment for Phase 9 overall:

- **No schema migration risk**: `network-accounts` is a wholly new, additive table. Reverting the PR removes the collection registration; the table can be left in place (unused, harmless, matching how the legacy Drizzle tables were left in place after Phase 7's migration) or dropped manually if desired — neither path touches any existing table.
- **No existing route is modified**: every new route is net-new (`/register`, `/login`, `/dashboard`, etc.) under new route groups. Reverting the PR simply removes those routes; nothing existing was changed to roll back.
- **Middleware change is additive and isolated**: the only modification to shared code is adding a new auth-redirect check scoped to `/dashboard/*` inside `middleware.ts` (or a new `(dashboard)` layout) — the existing CSP/security-header logic is untouched, and the new check can be reverted independently of the rest of the file if it ever needed to be isolated from a broader rollback.
- **`RESERVED_SLUGS` additions are themselves safely revertible**: removing the new entries only matters if the corresponding routes no longer exist, which is exactly the rollback scenario — no ordering hazard.
- **If a rollback is needed after real users have registered**: `network-accounts` rows persist in the database even if the PR is reverted (data isn't deleted by a code revert) — re-deploying the same PR later restores access to those accounts with no data loss, since nothing about their storage is destructive or one-way.

Standard mechanism: `git revert` the merge commit, redeploy — the same rollback path every prior phase has relied on, with no phase-specific extra steps required.

---

## Next step

Per the user's explicit instruction, no code has been written. This document is the gate — implementation begins only after this design is reviewed and approved, following exactly the same Plan → Implement → Validate → Release Review → Deploy cycle as every prior phase, starting with a new branch (`feat/phase9a-authentication`) once approved.
