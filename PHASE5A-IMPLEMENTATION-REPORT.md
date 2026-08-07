# Phase 5A — Draft Mode & Preview (Pages + Case Studies): Implementation Report

Executes the approved scope from `PHASE5-LIVE-PREVIEW-PLAN.md` Tier 0 (shared Draft Mode infrastructure) + Tier 1 (Pages + Case Studies preview) — explicitly excluding Homepage, Services, and Articles preview, per instruction. Branch: `feat/phase5a-draft-mode-preview` (off `main` @ the commit Phase 4C merged into, `7c83356`).

## 1. Architecture verified before writing any code

Per this project's established discipline, the exact API surfaces used below were confirmed against the installed package source, not assumed from training data (the project's own `AGENTS.md` explicitly warns this Next.js version may differ from training data):

- `draftMode()` from `next/headers` returns `Promise<DraftMode>` in the installed Next 15.4.11 (`node_modules/next/dist/server/request/draft-mode.d.ts`) — every call site below `await`s it, matching this codebase's existing pattern for `params`.
- Payload's `admin.preview` field (`node_modules/payload/dist/config/types.d.ts`'s `GeneratePreviewURL` type) and `payload.find()`'s `draft` parameter (`node_modules/payload/dist/collections/operations/local/find.d.ts`) are both already present in the installed `payload@3.87.0` — no new dependency needed.
- `payload.auth({ headers })` (`node_modules/payload/dist/auth/operations/auth.d.ts`) is the documented way to resolve a session's user from a raw `Request`'s headers inside a Route Handler.
- Confirmed via a full-project grep that zero preview/draft-mode code existed anywhere before this phase — fully greenfield, matching the plan's §1.2 finding.

## 2. What shipped

### 2.1 Shared infrastructure (Tier 0)

- **`lib/seo/preview.ts`** — `isPreviewMode()` (wraps `(await draftMode()).isEnabled`) and `PREVIEW_ROBOTS` (`{ index: false, follow: false }`, stricter than Pages' existing `noindex` shape since preview content should never be indexed *or* have its links followed).
- **`app/api/draft/route.ts`** — enables Draft Mode. Three-layer security, in order: (1) `secret` query param must match `PREVIEW_SECRET`; (2) an authenticated Payload session must resolve via `payload.auth()`, with `role` restricted to `admin`/`editor`; (3) `collection` is whitelisted to exactly `"pages" | "case-studies"`. The redirect target is derived from a confirmed database lookup (`getPageBySlug`/`getCaseStudyBySlug` with `draft: true`), never from a raw client-supplied path — closes the open-redirect class of bug a naive `?path=` parameter would invite.
- **`app/api/exit-draft/route.ts`** — disables Draft Mode, no secret required (matching the universal convention that leaving preview is never the sensitive operation).
- **`components/preview-banner.tsx`** — a persistent, site-wide banner shown whenever Draft Mode is active, so a draft preview is never visually indistinguishable from the live site. Deliberately a plain `<a>`, not `next/link`'s `<Link>` (documented inline, and re-stated in §4) — `Link`'s prefetch-on-viewport/hover behavior could silently trigger the exit route's side effect before a real click.
- **`.env.example`** — documents the new `PREVIEW_SECRET` requirement, matching the file's existing convention for `PAYLOAD_SECRET`/`IP_HASH_SALT`.

### 2.2 Pages preview (Tier 1)

- `payload/collections/Pages.ts` gains `admin.preview` — shows a "Preview" button in the admin Edit view, linking through `/api/draft`. Returns `null` (hides the button) if `PREVIEW_SECRET` isn't configured, rather than linking somewhere broken.
- `lib/cms/pages.ts`'s `getPageBySlug` gains a second parameter, `draft: boolean = false` — a **plain boolean, not an options object** (see §3 for why this specific choice matters). When `true`, passes Payload's own `draft: true` local-API flag and drops the `_status: "published"` filter.
- `app/(app)/[slug]/page.tsx`'s `generateMetadata()` and default export both call `isPreviewMode()` and thread the result into `getPageBySlug(slug, preview)`. Draft Mode's `noindex` always wins over the page's own `noindex` field when both could apply.

### 2.3 Case Studies preview (Tier 1)

- Identical shape of changes to `payload/collections/CaseStudies.ts`, `lib/cms/case-studies.ts`'s `getCaseStudyBySlug`, and `app/(app)/case-studies/[slug]/page.tsx` — same pattern, same reasoning, not re-explained per file.

### 2.4 Root layout

- `app/(app)/layout.tsx` fetches `isPreviewMode()` alongside its existing data (nav, prices, settings) and conditionally renders `<PreviewBanner />`. This layout only wraps the public `(app)` route group — confirmed the Payload admin panel uses its own separate `app/(payload)/layout.tsx`, so the banner never appears inside the admin UI itself.

## 3. A design decision worth stating explicitly: boolean, not options object

`getPageBySlug`/`getCaseStudyBySlug` are wrapped in React's `cache()`. `generateMetadata()` and the page's default export both need the same draft-aware document for a single request — `cache()` is what collapses that into one Payload query instead of two (the exact mechanism `getFaqsByScope` already relies on elsewhere in this codebase). `cache()`'s memoization keys on argument equality; a fresh `{ draft: true }` object literal at each call site would be a different reference every time and defeat that memoization (still correct, just an extra query). A plain `draft: boolean` parameter is a primitive, compares by value, and preserves the existing one-query-per-request behavior. Chosen deliberately, not discovered as a bug after the fact.

## 4. Two real, non-obvious things found and worked through, not glossed over

- **Route-collision risk, checked rather than assumed safe.** This project's own history (`lib/cms/reserved-slugs.ts`'s documented incident) proves literal routes aren't automatically safe from a sibling catch-all in this framework/config combination. `/api/draft` and `/api/exit-draft` sit alongside Payload's own `/api/[...slug]` catch-all route. Verified empirically, not just reasoned about: the production build lists `/api/draft` and `/api/exit-draft` as their own distinct entries in the route table (33 routes total, up from 31 — exactly +2), confirming Next correctly resolved them as more-specific literal routes rather than being swallowed.
- **Payload's own CSRF protection, discovered live, not by reading docs first.** `payload.auth()`'s cookie-extraction logic (`node_modules/payload/dist/auth/extractJWT.js`) rejects a valid session cookie when there's no `Origin` header and no `Sec-Fetch-Site: same-origin`/`same-site` header — real browsers send the latter automatically on same-origin navigation, but a raw script `fetch()` doesn't. This surfaced as a live 401 during validation (§ validation report) before being understood and correctly worked around in the test methodology — it is Payload's own CSRF defense working as intended on top of this route's own checks, not a bug in this implementation.

## 5. Files changed

12 files, 255 insertions, 39 deletions:

| File | Change |
|---|---|
| `lib/seo/preview.ts` | New — `isPreviewMode()`, `PREVIEW_ROBOTS` |
| `app/api/draft/route.ts` | New — enable Draft Mode, 3-layer security |
| `app/api/exit-draft/route.ts` | New — disable Draft Mode |
| `components/preview-banner.tsx` | New — site-wide preview indicator |
| `.env.example` | +`PREVIEW_SECRET` documentation |
| `payload/collections/Pages.ts` | +`admin.preview` |
| `payload/collections/CaseStudies.ts` | +`admin.preview` |
| `lib/cms/pages.ts` | `getPageBySlug` gains `draft` param |
| `lib/cms/case-studies.ts` | `getCaseStudyBySlug` gains `draft` param |
| `app/(app)/[slug]/page.tsx` | Draft-aware metadata + fetch |
| `app/(app)/case-studies/[slug]/page.tsx` | Draft-aware metadata + fetch |
| `app/(app)/layout.tsx` | Conditional `<PreviewBanner />` |

No database schema change — Pages and Case Studies already had `versions: { drafts: true }` from before this phase (confirmed in the Phase 5 plan's architecture review), so this sub-phase is pure application code.

## 6. Explicitly out of scope, per instruction

Homepage preview, Services preview, Articles preview — none of these three content types currently have draft/publish versioning at all (Homepage is a Global with no draft concept; Services/Articles have only a plain `isPublished` boolean). Per `PHASE5-LIVE-PREVIEW-PLAN.md` §4 (Tiers 2–3), enabling preview for them requires adding real Payload draft versioning first — a schema and editor-workflow change, not something this sub-phase touches.
