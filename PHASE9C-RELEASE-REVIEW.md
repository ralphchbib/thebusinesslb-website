# Phase 9C — Directory & Discovery: Independent Release Review

Reviewer stance: this review does not trust `PHASE9C-IMPLEMENTATION-REPORT.md`'s claims — every item below was independently re-derived: full diff read, all four quality gates re-run fresh on a clean checkout of `feat/phase9c-directory-search`, and every functional/security claim re-tested live against a running dev server and real (test) data, not inferred from the report's prose.

## A. Diff Read

Full `gh pr diff 19` read in its entirety (19 files, 970 insertions). Matches the shape described in the implementation report: three new profile fields (`category`, `location`, `languages`), two new data-fetching modules, a filter-form and pagination component, three new pages (`/network`, `/network/businesses`, `/network/professionals`), and an SEO fix to the two existing `[slug]` detail pages. No file outside this list is touched.

## B. Quality Gates (re-run fresh, independent of the implementation report)

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 errors**
- `node --test lib/**/*.test.ts` — **4/4 passing**
- `next build` — **succeeds**, all 48 routes generated (one retry needed for the documented, unrelated transient Supabase-pooler flake — confirmed by the exact same `(ENOTFOUND) tenant/user postgres.zuclv not found` signature seen and resolved the same way in every prior phase of this project)

## C. Critical Finding — Stored XSS via unescaped JSON-LD (CONFIRMED, FIXED)

**Severity: High.** `app/(app)/network/businesses/[slug]/page.tsx` and `.../professionals/[slug]/page.tsx` each render a `BreadcrumbList` JSON-LD block via `dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([...])) }}`, embedding `profile.companyName` / `profile.name` — a field any self-registered business or professional account controls directly (Phase 9B, public `/register` flow, no moderation/approval gate) — directly into the string with no escaping.

`JSON.stringify` does not escape the character sequence `</script>`. Since HTML's script-tag-content parsing looks for that literal byte sequence regardless of JSON string quoting, a company/professional name containing `</script><script>...</script>` closes the JSON-LD `<script>` tag early and opens a new, real, browser-executed `<script>` tag with attacker-chosen content — a classic stored XSS via JSON-in-`<script>`-tag embedding.

**Reproduced live, not just reasoned about:** created a real test business account (`network-accounts`, Local API, disclosed as test data) with `companyName: 'XSS Test</script><script>window.__xssFired=true</script>'`, published its profile, then loaded its public detail page in a real browser. Confirmed via `curl` that the raw served HTML contained the unescaped `</script><script>...` sequence inside the JSON-LD block, and confirmed via `window.__xssFired === true` in the actual rendered page that the injected script executed.

**Why this wasn't caught during implementation**: the implementation report's SEO validation (§4.4) checked that the JSON-LD block was present and had the right `@type`/fields — it never tested what happens when the embedded profile data itself contains HTML-significant characters, since the one real profile created during implementation validation used an ordinary company name.

### Fix applied

`app/(app)/network/businesses/[slug]/page.tsx` and `.../professionals/[slug]/page.tsx`: the JSON-LD `__html` value now has `.replace(/</g, "\\u003c")` applied before being embedded — the standard mitigation for this exact vulnerability class (escaping `<` to its Unicode escape so the browser's HTML parser never sees a literal `</script>`, while the JSON itself remains fully valid — `<` decodes back to `<` for any real JSON-LD/schema.org consumer). No other file uses `dangerouslySetInnerHTML` with profile-owner-controlled data in this PR; the two `breadcrumbSchema()` calls on the listing pages and the hub page use only hardcoded strings (`"Businesses"`, `"Professionals"`, `"Network"`), not user input, and are not affected.

**Re-verified independently, exact same reproduction**: recreated the identical exploit test profile (`XSS Test</script><script>window.__xssFired=true</script>` as `companyName`) against the fixed code. The raw served JSON-LD now contains `</script>` (escaped); `window.__xssFired` is `undefined` — the script no longer executes. All test data (both the original exploit profile and the re-verification profile, plus their accounts) deleted and confirmed at 0 remaining.

### A note on scope

This exact `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` pattern (unescaped) already exists in 9 other files in this codebase predating Phase 9C (e.g. `case-studies/[slug]/page.tsx` embedding `caseStudy.title`). Those are lower-severity in practice — that content is staff-authored through the Payload admin panel, not self-service public registration — but the same fix would apply there too. Fixing those is **out of scope for this PR** (none of those files are touched by Phase 9C, and Phase 9C didn't introduce that risk on them); flagged separately as a follow-up hardening task, not blocking this review.

## D. Business Directory

- **Listing**: renders published profiles correctly; confirmed live with a real registered-and-published business profile.
- **Filters**: all 6 (industry, category, location, service, language, keyword `q`) tested individually and in combination against real seeded data — each correctly narrows results; non-matching values (a keyword absent from the searched fields, a language the profile doesn't have) correctly return zero results.
- **Search**: `contains`/`ILIKE` substring match, confirmed against real data — matches the technical design's explicit, disclosed scope (not full-text/ranked search).
- **Pagination**: seeded 13 published profiles (over the `limit: 12` page size) — page 1 shows 12 with a working "Next", no "Previous"; page 2 shows the 13th with a working "Previous", no "Next".
- **SEO**: `buildMetadata()` + `breadcrumbSchema()` confirmed present with correct canonical URL on both listing and detail pages (detail-page fix, see §C).
- **Visibility rules**: see §F (draft invisibility) below.

## E. Professional Directory

Same shape as §D, independently confirmed with a separately-seeded professional profile (distinct `title`/`category`/`location`/`languages`/`skills`/`services` values): listing, all 4 applicable filters (skill/category/location/language) individually and combined, non-matching skill returns zero results, SEO fix confirmed on the detail page.

## F. Discovery / Security

- **Draft invisibility (direct-tested, not inferred)**: seeded a draft business profile with field values that exactly match an already-published profile's filters. The filtered directory returned only the published profile — the draft never appeared under any filter combination that would otherwise match it. Its detail page returned a real `404` to an anonymous request (confirmed via network-request status, not page content alone).
- **Ownership controls / data isolation**: unchanged from Phase 9B — no new access-control code was written for Phase 9C (confirmed by diff read: zero changes to `payload/access-profiles.ts` or any access function). Both directories rely entirely on the existing `readPublishedOrOwnerOrStaff`-enforced `_status: published` boundary, applied by the new fetchers' own explicit `{ _status: { equals: "published" } }` filter (Payload's Local API defaults `overrideAccess: true`, so this explicit filter — not the collection's access function — is what actually keeps a draft out of directory results; confirmed this is sufficient by the direct draft-invisibility test above, not assumed).
- **Unauthenticated access rules**: identical Local-API-with-`overrideAccess: true` read pattern already validated for the `[slug]` detail pages in Phase 9B's own release review; unchanged here.

## G. Regression

- `next build` generated all 48 routes cleanly, including every pre-existing route untouched by this diff.
- Spot-checked live: `/services` renders correctly (200, existing content unaffected).
- Diff read confirms zero changes to homepage, articles/insights, leads/contact form, or newsletter code — none of those files appear anywhere in the 19-file diff.
- Existing profile functionality (save/edit/publish for the pre-existing fields) untouched at the Server Action level beyond additive parsing of the three new form fields (confirmed by diff read: the existing find-or-create/upload/error-handling logic in `lib/network/profile-actions.ts` is unmodified).

## H. Final Recommendation

**Initial verdict: DO NOT MERGE** — the stored XSS in §C is a real, confirmed, high-severity, publicly-exploitable vulnerability (any self-registered account can weaponize their own profile against every visitor).

**Fix applied and independently re-verified** (§C) — the exact same live reproduction that found the bug no longer succeeds against the fixed code.

**Final verdict: MERGE.** All quality gates pass, all explicitly-required functionality (directories, filters, search, pagination, SEO, draft invisibility) is independently confirmed working, no regression to existing functionality, and the one critical finding is fixed and re-verified.
