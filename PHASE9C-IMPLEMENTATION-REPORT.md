# Phase 9C — Directory & Discovery: Implementation Report

Branch: `feat/phase9c-directory-search` (off `main` @ latest, includes Phase 9A + 9B; does **not** include the still-unmerged Phase 9 Homepage PR #18). Scope: exactly what was authorized — Business Directory, Professional Directory, Public Listings, Search, Filters (Industry, Category, Location, Services, Skills, Languages), Pagination, SEO. Reviews, verification, opportunities, AI, CRM, marketplace, and curated discovery collections are explicitly out of scope and untouched. See `PHASE9C-TECHNICAL-DESIGN.md` for the full design and scope decisions made before writing any code.

## 1. What shipped

### 1.1 Three new profile fields (`category`, `location`, `languages`)

`payload/collections/BusinessProfiles.ts` gains `category` (free text) and `languages` (fixed multi-select: Arabic/English/French/Armenian/Kurdish/Other, defined in the new `payload/language-options.ts`); `location` already existed. `ProfessionalProfiles.ts` gains `category`, `location` (new — this collection had none before), and `languages`. All three are optional and additive — zero data-migration risk, since Phase 9B shipped with 0 real profiles in production. `category` is deliberately free text rather than a fabricated fixed taxonomy (the Blueprint distinguishes "industry, categories and subcategories" without defining a vocabulary); `languages` is a legitimate structured field definition, not invented business data, so a fixed multi-select is appropriate and prevents free-text fragmentation for a filter that needs exact matching. `industry`/`services[]`/`skills[]` are left as free text unchanged, to avoid reopening Phase 9B's already-shipped, validated forms just to change a field type.

Wired end-to-end: `lib/validation/profile-schemas.ts` (zod schemas), `lib/network/profile-actions.ts` (Server Actions parse the new form fields), `components/network/{business,professional}-profile-form.tsx` (new form fields, including a `languages` checkbox group), and `app/(network)/dashboard/profile/page.tsx` (`defaultValues` mapping so existing values pre-fill on edit).

### 1.2 Data layer (`lib/cms/business-profiles.ts`, `lib/cms/professional-profiles.ts`)

New — `getPublishedBusinessProfiles()` / `getPublishedProfessionalProfiles()`, each building a `where: { and: [...] }` clause from optional filter params (industry/skill is the one field that differs by type; category/location/service/language are shared), plus a nested `or: [...]` across text fields for the keyword param `q`. Search uses Payload's `contains` operator (`ILIKE '%term%'` under the Postgres adapter) — not real full-text search, which the technical design explicitly deferred as premature at current (zero) real data volume. The `languages` filter — a `hasMany: true` select field — uses the `equals` operator, which Payload/Drizzle resolve as "array contains this value" for hasMany fields; verified live during validation (§4), not just asserted from documentation. Pagination uses Payload's native `find({ page, limit: 12 })` return shape directly. Deliberately **not** wrapped in React's `cache()`, unlike this directory's other content fetchers — results depend on `searchParams` and vary per request, so caching would be incorrect here.

### 1.3 Filter form and pagination UI (`components/network/directory-filter-form.tsx`, `components/network/pagination.tsx`)

The first paginated listing UI anywhere in this codebase — confirmed during design that no prior pagination UI or search precedent existed (`lib/cms/pagination.ts`'s `findAllSlugs()` is an internal sitemap helper only, not reusable). Both are plain `<form method="GET">` / `<Link>`-based, zero client JS, SSR-friendly and bookmarkable. `DirectoryFilterForm` swaps in the one field each collection actually has (Industry for businesses, Skill for professionals) and shares everything else. `Pagination` renders Prev/Next `<Link>`s built from `page`/`totalPages`/`hasNextPage`/`hasPrevPage`, preserving every other query param except `page`.

### 1.4 Directory pages (`app/(app)/network/{businesses,professionals}/page.tsx`, `app/(app)/network/page.tsx`)

New listing pages: filter form, results grid (`Card`-based, matching `/services`' existing pattern), pagination, `buildMetadata()` + `breadcrumbSchema()` JSON-LD. `/network` is a minimal, non-data-driven hub linking to both directories plus the existing Join/Login CTAs — deliberately no stats, counts, or "featured" anything, matching the "honest and data-driven" discipline already established for the homepage's Network Introduction section.

### 1.5 SEO fix on existing detail pages (disclosed, in-scope correctness fix)

`app/(app)/network/{businesses,professionals}/[slug]/page.tsx`'s `generateMetadata` previously returned a raw `{ title, description }` object directly — a gap confirmed during design research, missing canonical URL, OG/Twitter tags, and title-template behavior every other detail page in this codebase gets via `buildMetadata()`. Both now use `buildMetadata()` plus a `breadcrumbSchema()` JSON-LD block (Home → Businesses/Professionals → [name]), matching `/services/[slug]`'s existing pattern. No new schema.org type was introduced (no `LocalBusiness`/`Person`) — out of this phase's stated SEO scope. Both detail pages also now render the new `category`/`languages` fields (and `location` for professionals).

## 2. Standard checks (run from a clean state)

- `tsc --noEmit` — **0 errors** (one round of fixes needed: the `and: Record<string, unknown>[]` where-clause arrays in both new `lib/cms/*.ts` fetchers needed to be typed as Payload's own `Where[]`, not a generic record type)
- `next lint` — **0 errors**
- `node --test lib/**/*.test.ts` — **4/4 passing**, unaffected by this phase; confirmed no new reserved-slug entry is needed since `/network/businesses`, `/network/professionals`, and `/network` are all nested under `/network`, already reserved in Phase 9A
- `next build` — **succeeds**, all pages generated including the three new directory/hub routes (`/network`, `/network/businesses`, `/network/professionals`, all server-rendered on demand since they read `searchParams`/query the DB per request)

## 3. A design refinement made during implementation, disclosed

The technical design's §D sketched pagination as a straightforward wrapper over `find({page, limit})`, but didn't resolve in advance how the `languages` (`hasMany: true` select) filter should be queried — Payload's query-operator semantics for hasMany fields aren't obvious from the collection config alone. Rather than guess, the actual Drizzle query-builder source (`node_modules/@payloadcms/drizzle/dist/queries/parseParams.js`) was read before writing the filter, confirming `equals` on a hasMany field resolves to an array-contains match — then this was independently re-confirmed live during validation (§4: filtering for a language the seeded profile has returns it; filtering for one it doesn't returns nothing), rather than trusting the source read alone.

## 4. Browser validation (real accounts and real browser for the end-to-end path; direct Local API seeding for volume/draft/professional coverage — see note below; all test data deleted and confirmed at 0 remaining after)

1. **Full real user flow (business)**: registered a business account through `/register`, verified via the real email-verification token (read from the database, since Resend's test-mode restriction only delivers to one fixed inbox — the same constraint documented in Phase 9A/9B), logged in, filled and saved the profile form including the three new fields (`category`, `location`, `languages`), confirmed `"Saved."`, published it, confirmed status flipped to `Published`.
2. **Directory listing**: the new profile appeared correctly on `/network/businesses` with its category/location/languages rendered.
3. **All 6 business filters**, individually and combined (`industry`, `category`, `location`, `service`, `language`, keyword `q`): each correctly matched the seeded profile; a non-matching keyword (`q=pastry`, absent from the searched fields) and a non-matching language (`french`, not one of the profile's actual languages) both correctly returned zero results.
4. **Business detail page**: `category`/`languages`/`location` render correctly; `generateMetadata` now returns a proper canonical URL (`buildMetadata()`) and a `BreadcrumbList` JSON-LD block, confirmed by reading the actual rendered `<head>`/JSON-LD from the page, not just the source.
5. **Professional profile + directory** (seeded via Local API — see note): published profile with distinct `title`/`category`/`location`/`languages`/`skills`/`services` values; all 4 combined filters (`skill`, `category`, `location`, `language`) matched; a non-matching skill correctly returned zero results; detail page SEO and new-field rendering confirmed identically to the business case.
6. **Draft invisibility (the technical design's §F acceptance criterion, direct-tested not inferred)**: a draft business profile was seeded with field values that exactly match an existing published profile's filters (`industry=Food & Beverage&category=Bakery&location=Beirut&language=arabic`) — the filtered directory returned only the published profile; the draft never appeared. Its detail page returned a real `404` to an anonymous request (confirmed via `read_network_requests`, not just page content).
7. **Pagination**: seeded 12 additional published business profiles (13 total) to exceed the `limit: 12` page size. Page 1 showed 12 items, "Page 1 of 2", a working "Next →" link and no "Previous" link; page 2 showed the 13th item, "Page 2 of 2", a working "← Previous" link and no "Next" link (correctly hidding once `hasNextPage` is false).
8. **`/network` hub**: renders with no stats/counts/featured content, only the two directory links and the existing Join/Login CTAs.
9. **Cleanup**: all seeded accounts, profiles, and their version-table rows deleted via the Local API; confirmed via direct SQL count at **0 remaining** across `network_accounts`, `business_profiles`, `professional_profiles`, `portfolio_projects`, `_business_profiles_v`, and `_professional_profiles_v`.

**Note on validation method**: item 1 (business account registration → verification → login → profile save → publish) used the real end-to-end UI flow, proving the new fields round-trip correctly through the actual form/Server Action/database path used by a real user. Items 5–7 (the professional profile, the draft-invisibility profile, and the 12 volume profiles) were seeded directly via Payload's Local API rather than repeating the full registration/verification flow for each — registration, email verification, and login are already-proven mechanisms from Phase 9A/9B, re-verified again in item 1; Phase 9C's actual new surface under test is the directory/filter/pagination/draft-visibility layer, which these seeded profiles exercise identically to a UI-created one (they go through the exact same `getPublished*Profiles()` fetchers and page components). This was a scope decision made during validation, not a shortcut around anything Phase 9C actually changed.

## 5. Files changed

| File | Change |
|---|---|
| `payload/language-options.ts` | New — shared `LANGUAGE_OPTIONS`/`LANGUAGE_VALUES` |
| `payload/collections/BusinessProfiles.ts`, `ProfessionalProfiles.ts` | `+category`, `+languages` (both); `+location` (Professional only) |
| `lib/validation/profile-schemas.ts` | `+category`/`+location`/`+languages` on both profile schemas |
| `lib/network/profile-actions.ts` | Server Actions parse the new form fields |
| `components/network/business-profile-form.tsx`, `professional-profile-form.tsx` | New form fields (Category/Location inputs, Languages checkboxes) |
| `app/(network)/dashboard/profile/page.tsx` | `defaultValues` mapping extended for the new fields |
| `lib/cms/business-profiles.ts`, `professional-profiles.ts` | New — filtered/paginated data-fetching modules |
| `components/network/directory-filter-form.tsx`, `pagination.tsx` | New — shared filter form and pagination UI |
| `app/(app)/network/businesses/page.tsx`, `professionals/page.tsx` | New — directory listing pages |
| `app/(app)/network/page.tsx` | New — minimal hub page |
| `app/(app)/network/businesses/[slug]/page.tsx`, `professionals/[slug]/page.tsx` | SEO fix (`buildMetadata()` + `breadcrumbSchema()`); render new fields |

No existing route, collection, or access-control function outside the additive field changes above was modified. Access control for the two directories relies entirely on the existing `_status: { equals: "published" }` filter already enforced by `readPublishedOrOwnerOrStaff` (Phase 9B) — no new access-control code was written for Phase 9C.

## 6. What was deliberately NOT done

- Real full-text search (`tsvector`)/relevance ranking — `contains` only, per the technical design's explicit deferral at current zero-profile volume.
- Curated discovery collections (Made in Lebanon, Verified Professionals, etc.), natural-language search, structured/faceted filter UI beyond plain form fields — all out of the explicitly stated scope (Blueprint §14's fuller vision, not requested this phase).
- Reviews, verification, opportunities, AI, CRM, marketplace — out of scope per this turn's explicit authorization.
- A new schema.org type (`LocalBusiness`/`Person`) for detail pages — the SEO fix reused the existing `buildMetadata()`/`breadcrumbSchema()` pattern only.
- No merge, no deploy — PR opened for review, not merged, per instruction.

## 7. Remediation: stored XSS in profile-owner-controlled JSON-LD (post-review fix)

The independent release review ([PHASE9C-RELEASE-REVIEW.md](PHASE9C-RELEASE-REVIEW.md) §C) found that the new `breadcrumbSchema()` JSON-LD blocks on both `[slug]` detail pages embedded `profile.companyName`/`profile.name` — a field any self-registered business or professional account controls directly, with no moderation gate — via `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` with no escaping. `JSON.stringify` doesn't escape `</script>`, so a company/professional name containing that literal sequence closes the JSON-LD script tag early in the browser's HTML parser and lets an attacker-chosen sibling `<script>` execute. Live-confirmed via a real test profile (`companyName: 'XSS Test</script><script>window.__xssFired=true</script>'`) — `window.__xssFired` fired `true` on page load before the fix.

**Fix** (`app/(app)/network/businesses/[slug]/page.tsx`, `.../professionals/[slug]/page.tsx`): the JSON-LD `__html` string now has `.replace(/</g, "\\u003c")` applied before embedding — escaping `<` to a Unicode escape sequence the HTML parser can't interpret as a tag boundary, while the JSON itself stays fully valid (decodes back to `<` for any real JSON-LD consumer). No other file in this PR embeds profile-owner-controlled data via `dangerouslySetInnerHTML` — the listing/hub pages' `breadcrumbSchema()` calls use only hardcoded strings.

**Verified independently**: the exact same exploit profile, recreated against the fixed code, no longer executes (`window.__xssFired` is `undefined`; the served JSON-LD now contains the escaped sequence). All test data deleted and confirmed at 0 remaining.

This same unescaped-JSON.stringify-in-`dangerouslySetInnerHTML` pattern pre-exists in 9 other files in this codebase (e.g. `case-studies/[slug]/page.tsx`), all embedding staff-authored (not public self-service) content — lower severity in practice, but the same class of issue. Out of scope for this PR since none of those files are touched here; flagged as a follow-up hardening task.
