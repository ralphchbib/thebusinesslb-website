# Phase 5A — Draft Mode & Preview (Pages + Case Studies): Validation Report

## 1. Required checks

```
npx tsc --noEmit     PASS (clean)
npm run lint           PASS (clean) — required a targeted eslint-disable on the
                          "Exit preview" link (see report §4/below), not a blanket suppression
npm run test            PASS — 4/4
npm run build             PASS — 33 routes (31 existing + /api/draft + /api/exit-draft)
```

## 2. Route verification

Production build's route table confirms `/api/draft` and `/api/exit-draft` registered as their own distinct `ƒ` (Dynamic) routes, separate from Payload's `/api/[...slug]` catch-all — resolving the route-collision risk flagged in the implementation report §4 as empirically checked, not assumed. All 31 pre-existing routes present and unchanged.

## 3. Live end-to-end functional testing — the actual, primary validation for this feature

A passing build proves the code compiles and every static/SSG page still renders; it does **not** by itself prove draft content stays hidden from anonymous visitors or that the preview flow actually works for a real editor. That required live testing against a running dev server with real database records — performed as follows, then fully reverted.

### 3.1 Method

Since no real admin login credentials were available (and entering/using a real person's credentials is out of scope regardless), a throwaway test admin user was created via Payload's Local API (`payload.create({ collection: "users", ... })`), logged in via `payload.login()` to obtain a real session token — the same class of technique already established in this project (e.g. the Media revalidation test in Phase 4B.2, which created and reverted a real edit). A temporary draft-only Page and a temporary draft-only Case Study were created the same way. Every test request went through the actual HTTP routes (`/api/draft`, `/api/exit-draft`, the real page routes) — nothing was mocked or bypassed. **All test fixtures (the test user, test Page, and test Case Study) were deleted at the end of the run**, confirmed in the script's own cleanup log output; the temporary test script itself was deleted from disk and is not part of this PR's diff.

### 3.2 Two real issues found during testing, diagnosed and resolved in the test methodology (not the application)

1. **Trailing-slash redirect** (`next.config.ts`'s `trailingSlash: true`, an existing project-wide setting): an initial test run using `fetch(..., { redirect: "manual" })` against `/api/draft` (no trailing slash) only observed Next's own `/api/draft` → `/api/draft/` redirect, never reaching the route's actual logic. Fixed by requesting the URL with its trailing slash directly. Confirmed via `curl -L` in parallel that the underlying route was already returning correct 401s all along — this was purely a test-script artifact, not an application defect.
2. **Payload's own CSRF protection** (pre-existing, not introduced by this phase): the route's `payload.auth()` call correctly rejected a valid session cookie sent without a `Sec-Fetch-Site: same-origin` header — real browsers send this automatically on same-origin navigation (e.g. clicking "Preview" in the admin panel); a raw script `fetch()` doesn't. Fixed by adding the header to the test script to accurately simulate real browser behavior. This is Payload's own defense working correctly, layered on top of this route's own secret+role checks — not a workaround of a protection a real preview click wouldn't also satisfy.

### 3.3 Results — Pages

| # | Test | Result |
|---|---|---|
| 1 | Anonymous fetch of a draft-only Page | `404` ✓ |
| 2 | `/api/draft` with no secret | `401` ✓ |
| 3 | `/api/draft` with wrong secret | `401` ✓ |
| 4 | `/api/draft` with correct secret, no session | `401` ✓ — confirms the session check is real, not bypassable with the secret alone |
| 5 | `/api/draft` with correct secret + authenticated admin session | `307` redirect, Draft Mode cookies set ✓ |
| 6 | Fetching the Page with those cookies | `200`, draft-only content marker present in the HTML, `noindex` present ✓ |
| 7 | Anonymous re-fetch of the same Page, immediately after #6 | `404` ✓ — **confirms zero leak**: using the preview didn't make the draft visible to anyone else |
| 8 | `/api/draft` with an invalid `collection` value (`services`) | `400` ✓ — whitelist rejects it |
| 9 | `/api/exit-draft` | `307`, Draft Mode cookies cleared ✓ |

### 3.4 Results — Case Studies

| # | Test | Result |
|---|---|---|
| 10 | Anonymous fetch of a draft-only Case Study | `404` ✓ |
| 11 | `/api/draft` for `collection=case-studies`, authenticated | `307`, cookies set ✓ |
| 12 | Fetching the Case Study with those cookies | `200`, draft-only content marker present ✓ |
| 13 | Anonymous re-fetch immediately after | `404` ✓ — zero leak, same as Pages |

**All 13 live assertions passed.** This is direct evidence the feature works end-to-end — the security gates, the draft-content visibility, the noindex application, and the no-leak guarantee — not inferred from the code compiling.

## 4. Lint exception, explained

`components/preview-banner.tsx`'s "Exit preview" link uses a plain `<a>`, which ESLint's `@next/next/no-html-link-for-pages` rule flags by default. Suppressed with a targeted `eslint-disable-next-line` and an inline comment, not a rule-wide change: `next/link`'s `<Link>` prefetches on viewport-intersection/hover, and `/api/exit-draft` has a real side effect (disabling Draft Mode) — prefetching it could silently exit preview mode before the user clicked anything. The plain `<a>` is the technically correct choice here, not a shortcut around the linter.

## 5. Regression sweep

All 31 pre-existing routes unchanged in the build output. No existing collection's field, access rule, or hook was modified — only two new admin-only `preview` config functions were added, which affect nothing about how Pages/Case Studies behave for anonymous or already-authenticated non-preview requests (confirmed directly: assertions #1 and #7/#10/#13 above prove ordinary anonymous access is completely unaffected).

## 6. What this validation does not cover (disclosed, not hidden)

- **Homepage, Services, Articles** — out of scope for 5A, not tested, not touched.
- **Visual confirmation of the preview banner in an actual browser** — the live testing above proves the server-side mechanics (cookies, redirects, content visibility) via HTTP requests; it does not include a screenshot of the rendered banner. The banner's markup was verified via `tsc`/lint/build (it type-checks and renders without error), and its logic (`{preview && <PreviewBanner />}`) is a direct, simple boolean gate on the same `isPreviewMode()` value proven correct in the HTTP-level tests above — but a literal visual check was not performed in this pass.
