# Phase 9C — Directory & Discovery: Technical Design

Scope: exactly what was authorized — Business Directory, Professional Directory, Public Listings, Search, Filters (Industry, Category, Location, Services, Skills, Languages), Pagination, SEO. Reviews, Verification, Opportunities, AI, CRM, and Marketplace are explicitly excluded. Curated tag-based collections (Blueprint §14's "Made in Lebanon," "Youth-Led Startups," etc.) are in the original planning package's Phase 9C sketch but not in this turn's explicit authorization — excluded here too, consistent with how Phase 9A/9B each followed the narrower, explicitly-authorized list over the fuller planning-package sketch.

**Pre-implementation validation performed for this document**: re-read Blueprint v3 §14 (Intelligent Search and Discovery) and the planning package's Phase 9C section directly. Also researched the existing codebase before designing anything new: confirmed there is no existing user-facing pagination UI anywhere in this app (`lib/cms/pagination.ts` is an internal sitemap-generation helper, not reusable for a paginated listing page), no existing search/`contains`-query precedent, and exactly what fields `BusinessProfiles`/`ProfessionalProfiles` do and don't have today (both confirmed with zero real profiles in production as of this writing, per Phase 9B's own validation cleanup — relevant to §B below).

## A. Scope Decisions

1. **Two schema fields are missing to support the explicitly-required filters, and are added here.** `languages` (neither collection has it) and `category` (neither collection has it) are new; `location` is also missing from `ProfessionalProfiles` specifically (Blueprint §8 lists it as a Professional field; Phase 9B's narrower field list deferred it). All three are additive, optional fields on already-shipped collections — no existing field is changed, and no already-published data exists to migrate (confirmed: 0 profiles in production).
2. **`category` is free text, not a fixed taxonomy**, populated by the account owner exactly like the existing `industry`/`services[].name` fields already are. Blueprint §7 lists "industry, categories and subcategories" as related-but-distinct concepts without defining a fixed category vocabulary; inventing one here would mean fabricating a taxonomy this project has no real basis for. The filter still works — it facets on whatever real values people actually enter — it just isn't a closed dropdown.
3. **`languages` is a fixed multi-select**, not free text — unlike `category`, a small, real, closed list (Arabic, English, French, Armenian, Kurdish, Other) is genuinely more useful here: it's what stops "Arabic"/"arabic"/"Arab" fragmenting into three unfilterable variants, and the list itself isn't fabricated data, it's a structured field definition (the same category of thing as `accountType`'s fixed select, not a business/professional record).
4. **`industry` and `services[]`/`skills[]` are left exactly as they are** (free text) rather than converted to selects. Converting `industry` to a fixed enum would be a second real taxonomy decision this project has no existing precedent for, and — more importantly — would mean re-touching Phase 9B's already shipped, tested, production-validated profile forms' existing field just to change its type, for a benefit (exact-match vs. substring-match filtering) that doesn't materially change what Phase 9C needs to deliver. The Industry filter works via the same `contains` substring match every other text filter uses.
5. **No pagination UI exists anywhere in this codebase today** — `lib/cms/pagination.ts` is a `page`-walking loop used only to build the sitemap and `generateStaticParams`, and discards exactly the fields (`page`, `totalPages`, `hasNextPage`) a real pagination control needs. This phase introduces the first one: a plain `?page=N` query param, read server-side, passed to Payload's own `find({ page, limit })`, with Prev/Next links — no client-side state, works with SSR and is trivially crawlable/shareable, matching how every other page in this app is built.
6. **Search is Payload's `contains` operator (SQL `ILIKE '%term%'` under the Postgres adapter), not real full-text search infrastructure** (`tsvector`/`to_tsquery`). The planning package flagged full-text search performance as unverified at scale; at Phase 9C's actual scale (a brand-new directory, currently zero profiles), building `tsvector` infrastructure now would be solving a problem that doesn't exist yet. `contains` across `companyName`/`description`/`services.name` (business) and `name`/`title`/`bio`/`services.name` (professional) is genuinely functional keyword search — it's just simple substring matching rather than relevance-ranked full text. If/when real volume makes that a problem, upgrading is a schema-and-query change, not a route-structure change.
7. **No curated collections, no relevance ranking, no NLP.** Matches the explicit exclusions and keeps this phase's actual deliverable (a working directory people can browse, filter, and search) from ballooning into the fuller Blueprint §14 vision, which needs real usage data and a lot more real profiles to be meaningful anyway.

## B. Routes

| Route | Type | Purpose |
|---|---|---|
| `/network` | Server Component | Minimal hub linking to both directories — not a data-driven page, just an entry point |
| `/network/businesses` | Server Component | Business directory: filter form (GET, query-param-driven) + paginated results grid |
| `/network/professionals` | Server Component | Professional directory: same shape |
| `/network/businesses/[slug]`, `/network/professionals/[slug]` | Existing (Phase 9B) | Unchanged routes; `generateMetadata` improved per §E below |

All three new routes are nested under `/network`, already reserved in Phase 9A — no `RESERVED_SLUGS` changes needed (same reasoning as Phase 9B §A.5: a single-segment `Pages` catch-all cannot collide with a two- or three-segment nested path).

## C. Query Parameters (both directories, identical shape)

`?page=N&q=<keyword>&industry=<text>&category=<text>&location=<text>&service=<text>&skill=<text>&language=<value>` — every param optional, all read server-side via `searchParams`, no client JS required for filtering or pagination to work. The filter form is a plain `<form method="GET">`; changing a filter or submitting search just navigates to a new URL with the updated query string, which Next.js renders server-side like any other request — shareable, bookmarkable, back-button-correct, and crawlable, for free.

`skill` only applies to the professional directory (no `skills` field on `BusinessProfiles`); `industry` only applies to the business directory (no `industry` field on `ProfessionalProfiles`). Both directories share the same filter-form component with the type-specific fields conditionally rendered, rather than two near-duplicate components.

## D. Data Layer

New modules, following the existing `lib/cms/case-studies.ts` shape (typed fetchers, `cache()`-wrapped where appropriate — list queries are **not** wrapped in `cache()` since they depend on `searchParams`, which changes per request):

- `lib/cms/business-profiles.ts` — `getPublishedBusinessProfiles({ page, q, industry, category, location, service, language })`
- `lib/cms/professional-profiles.ts` — `getPublishedProfessionalProfiles({ page, q, category, location, service, skill, language })`

Both build a Payload `where` as an `and: [...]` array of conditions, always starting with `{ _status: { equals: "published" } }`, then pushing one `contains` (or `equals`, for the `languages` select) condition per non-empty param — an array-filter-then-spread approach, since no existing code in this repo builds a `where` object incrementally and this is the cleanest match to the rest of `lib/cms/*`'s literal-object style. `q` (keyword) becomes an `or: [...]` block across the relevant text fields, nested inside the outer `and`.

Pagination: Payload's own `find({ page, limit: 12 })` return shape (`docs`, `page`, `totalPages`, `hasNextPage`, `hasPrevPage`) is used directly — no new pagination utility needed beyond a small shared `<Pagination>` UI component that renders Prev/Next `<Link>`s from those fields.

## E. SEO

- **Listing pages**: `buildMetadata()` with literal, hardcoded copy (title/description) per directory — matching the established `/services`/`/case-studies` index-page pattern (not CMS-managed; Payload has no per-listing-page SEO field set, same as those two). Plus a `breadcrumbSchema` JSON-LD block, same as those two pages.
- **Detail pages** (`[slug]/page.tsx`, both types): currently return a raw `{ title, description }` object directly instead of going through `buildMetadata()` (confirmed by reading the Phase 9B code) — missing canonical URL, OG/Twitter tags, and the site's title-template behavior every other detail page gets. Switched to `buildMetadata()` and given a `breadcrumbSchema` block (Home → Businesses/Professionals → [name]), matching every other detail page in the app (`/case-studies/[slug]`, `/services/[slug]`). This is a real SEO correctness fix, in scope, and a small, low-risk change to files that otherwise aren't touched by this phase.
- No new schema.org type is invented for individual profiles (no `LocalBusiness`/`Person` JSON-LD) — `lib/seo/schema-org.ts` has no generic reusable helper for either today, and building one is beyond this phase's explicit "SEO" scope (breadcrumb + correct metadata), not a requirement listed for Phase 9C.

## F. Security / Access Control

No new access-control code — both directories query with the same `_status: { equals: "published" }` filter the existing `readPublishedOrOwnerOrStaff` access function already enforces for anonymous readers; the listing pages simply never request drafts in the first place (there's no "view my own draft in the directory" concept — that's what `/dashboard/profile`'s own preview link is for). Confirmed live during validation, not just asserted: a draft profile must not appear in either directory's listing or search results even with a matching filter/keyword.

## G. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `contains` substring search has no relevance ranking or stemming (searching "restaurant" won't match "restaurants" containing profiles' plural service names unless the substring literally appears) | Low | Disclosed limitation, not a defect — matches §A.6's explicit scope decision; acceptable at current real data volume (zero profiles) |
| First pagination UI in this codebase — no precedent to verify against | Low | Uses Payload's own `find({ page, limit })` return shape directly, which Payload documents and this project already depends on elsewhere; verified live with a seeded volume during validation, not assumed |
| New optional fields on already-shipped forms could regress existing Phase 9B save/edit flows if wired incorrectly | Medium | Additive-only fields, defaulted to empty/undefined when absent; existing required-field validation and save logic untouched; re-validated live end-to-end during this phase, not just for the new fields in isolation |

## H. Acceptance Criteria

1. Both directories correctly list only published profiles, correctly paginate at a seeded volume, and correctly apply every one of the six filters individually and in combination.
2. Keyword search returns the expected profile for a realistic query against seeded, real (not fabricated) test data created during validation and deleted afterward.
3. A draft profile is confirmed absent from directory/search results, direct test not inferred.
4. Existing Phase 9A/9B functionality (registration, login, profile editing including the pre-existing fields, publish/unpublish, portfolio) and the existing marketing site are unaffected.

## I. Rollback Plan

Same low-blast-radius shape as Phase 9A/9B: three new routes (all net-new), two new optional fields per profile collection (additive, no migration of existing data since none exists), one new SEO fix to two already-existing files. Reverting the PR removes the new routes/fields cleanly with no impact on any other collection, route, or existing profile data.
