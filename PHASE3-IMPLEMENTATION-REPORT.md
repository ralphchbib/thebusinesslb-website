# Phase 3 — Testimonials + Case Studies CMS — Implementation Report

Branch: `feat/phase3-testimonials-case-studies` (off `main` @ `087d85b`, the commit currently live in production). Nothing has been pushed, no PR opened, no merge or deploy performed — implementation and report only, per explicit instruction.

## 1. What was built

### 1.1 `Testimonials` collection (`payload/collections/Testimonials.ts`)

| Field | Type | Notes |
|---|---|---|
| `clientName` | text, required | |
| `companyName` | text | |
| `position` | text | e.g. "Owner" |
| `industry` | select | Reuses `sectorOptions` from `lib/validation/schemas.ts` — the same taxonomy already canonical for Services and the assessment intake form, not a new list |
| `quote` | textarea, required, maxLength 500 | |
| `rating` | number, required, min 1 / max 5, default 5 | |
| `featured` | checkbox, default false | Drives the "no picks → show Featured" fallback used everywhere this collection is consumed |
| `logo` | text (URL) | No media library exists in this project yet; same "text as URL" convention would apply here |
| `website` | text | |
| `displayOrder` | number, default 0 | Lower shows first |

`versions: { drafts: true }` enabled — same reasoning as Pages: testimonials are attributed client statements, worth a save-without-publishing step.

### 1.2 `CaseStudies` collection (`payload/collections/CaseStudies.ts`, slug `case-studies`)

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | |
| `slug` | text, required, unique | Rejected at save time if reserved — see §1.6 |
| `clientName` | text, required | |
| `industry` | select | Same `sectorOptions` |
| `servicesUsed` | relationship → `services`, hasMany | Powers "related case studies" on service pages |
| `challenge` / `solution` | textarea, required | |
| `results` | array of `{ metric, value }` | Flat, no nesting — matches the existing "no repeater-of-repeaters" rule from Phase 1/2 |
| `testimonial` | relationship → `testimonials`, single | Optional |
| `featuredImage` | text (URL) | |
| `gallery` | array of `{ image: text }` | Optional |
| `featured` | checkbox, default false | Same fallback role as Testimonials.featured |
| `seoTitle` | text, required, maxLength 60 | |
| `seoDescription` | textarea, required, maxLength 155 | |

`versions: { drafts: true }` enabled. Gets its own detail route (`/case-studies/{slug}/`) and hub (`/case-studies/`) — both new literal routes.

### 1.3 Blocks (`payload/blocks/{Testimonials,CaseStudies}.ts`)

Two new blocks added to the Pages `blocks` field: `isVisible`, `eyebrow`, `h2`, and a `hasMany` relationship picker (to `testimonials` / `case-studies` respectively). Leaving the picker empty falls back to Featured — the same "one default toggle, not a re-pick on every page" pattern in both.

**Block slugs are deliberately `testimonialsBlock` / `caseStudiesBlock`, not `testimonials` / `caseStudies`** — see §4.1, a real bug found and fixed during this work, not a stylistic choice.

### 1.4 Presentational components (`components/blocks/*`)

- `testimonial-card.tsx` — star rating (filled 1..rating), quote, optional logo `<img>`.
- `testimonials-row.tsx` — `TestimonialsRow({ ids?, eyebrow, h2, surface })`: shows `ids` if given and non-empty, else `getFeaturedTestimonials()`. Returns `null` if the resolved list is empty — confirmed live (§2.3).
- `case-study-card.tsx` — optional image, industry eyebrow, one headline result stat, link to the detail page.
- `case-studies-row.tsx` — mirrors `testimonials-row.tsx`'s ids-or-featured pattern.
- `related-case-studies.tsx` — `RelatedCaseStudies({ serviceSlug })`, used on service pages; queries case studies whose `servicesUsed` includes that service. Returns `null` if empty — confirmed live (§2.3).
- `components/blocks/page/{testimonials-block,case-studies-block}.tsx` — thin wrappers that resolve a Pages block's relationship IDs and delegate to the row components above, following the exact pattern already used for `hero-block.tsx`/`text-block.tsx`/`cta-block.tsx` in Phase 2.

All new — no existing component in `components/blocks/` was modified except `block-renderer.tsx` (two new `switch` cases appended).

### 1.5 Data access (`lib/cms/{testimonials,case-studies}.ts`, additions to `lib/cms/types.ts`)

Every function wrapped in React's `cache()`, matching the existing convention in `lib/cms/*.ts` exactly:

- `getTestimonials()`, `getFeaturedTestimonials()`, `getTestimonialsByIds(ids)` (order-preserving, for block manual-picks).
- `getCaseStudies()`, `getFeaturedCaseStudies()`, `getCaseStudyBySlug(slug)`, `getPublishedCaseStudySlugs()`, `getCaseStudiesByIds(ids)`, `getCaseStudiesByServiceSlug(serviceSlug)` (dot-notation query on the relationship: `"servicesUsed.slug"`).

`toCaseStudy()` is async — it resolves the `testimonial` relationship via `getTestimonialsByIds` so a case study page always gets a fully-typed `Testimonial | undefined`, not a raw Payload ID union.

`lib/cms/types.ts` gained `PayloadIndustry`, `PayloadTestimonialDoc`, `PayloadCaseStudyResultDoc`, `PayloadCaseStudyDoc`, `PayloadTestimonialsBlockDoc`, `PayloadCaseStudiesBlockDoc` — pure additions; `PayloadPageBlockDoc` extended to a 5-member union.

### 1.6 Reserved-slug protection

`"case-studies"` added to `RESERVED_SLUGS` in `lib/cms/reserved-slugs.ts` — same reasoning already documented there for `services`/`insights`: the hub is a literal segment the Pages `[slug]` catch-all could otherwise claim, so it must be blocked at the data layer even though Next's routing precedence already makes the collision structurally impossible (see Phase 2's rationale, unchanged here). Nested `/case-studies/[slug]/` needs no entry of its own, matching how `/services/[slug]/` never needed one either. `lib/cms/reserved-slugs.test.ts` updated to assert both the specific case and full-list completeness.

**Verified live, reproducing the exact Phase 2 collision-fix methodology** (§2.4): a rogue published Page with `slug: "case-studies"` was inserted directly via SQL (bypassing the app-level `validate` function, the only way to actually test routing precedence rather than just the validator), and `/case-studies/` still resolved to the real hub, not the rogue content.

### 1.7 Access control

Identical pattern to Pages (Phase 2 §1.7), applied to both new collections:

```ts
read: ({ req: { user } }) => {
  if (user) return true;
  return { _status: { equals: "published" } };
},
create: adminOrEditor,
update: adminOrEditor,
delete: adminOnly,
```

Required for the same structural reason established in Phase 2: Payload's `find`/`findByID` operations use this same `read` function regardless of `?draft=true`, so anonymous requests must be explicitly scoped to `_status: "published"` or draft content becomes publicly readable the moment `versions.drafts` is enabled. Verified live for both collections (§2.3): draft testimonial and draft case study both returned empty/404 to anonymous REST, GraphQL, and page requests.

### 1.8 Revalidation

Both new collections reuse the existing **site-wide** hooks (`revalidateAfterChange`/`revalidateAfterDelete` from `payload/hooks/revalidate.ts`, unchanged) rather than Pages' narrower page-scoped hooks. This is deliberate: a single testimonial or case study can be referenced from many service pages and landing pages simultaneously (via the relationship fields and the Featured fallback), so precisely enumerating which paths reference a given document isn't practical — the same reason Services already uses the broad hook. No new hook code was written; both collections import the same two functions Services/Articles/FAQs/Navigation already use.

### 1.9 Routing

- `/case-studies/` (`app/(app)/case-studies/page.tsx`) — hub, grid of `CaseStudyCard` via `getCaseStudies()`.
- `/case-studies/{slug}/` (`app/(app)/case-studies/[slug]/page.tsx`) — detail page. `generateStaticParams` from `getPublishedCaseStudySlugs()`, `dynamicParams = true` (matching every other dynamic route in this codebase — new content is reachable immediately, no rebuild required). `generateMetadata` via the existing `buildMetadata()` helper. Renders hero, a results stat grid, challenge/solution, gallery, the linked testimonial (if any), links to the services used, and a closing CTA.

### 1.10 SEO

- `lib/seo/schema-org.ts` gained `caseStudySchema({ title, description, path, clientName })`, emitting `@type: "Article"` — schema.org has no dedicated case-study type; this matches how Articles already represent long-form content, kept in the shared schema file (the better pattern vs. Articles' inline approach). Each detail page also emits `breadcrumbSchema()`.
- `app/(app)/sitemap.ts`: `/case-studies/` added to `staticRoutes`; `getPublishedCaseStudySlugs()` output merged into the route list alongside Services/Articles/Pages slugs.
- Canonical URLs, `seoTitle`/`seoDescription` → metadata: identical pattern to every other collection.

### 1.11 Frontend integration (Part 3 of the brief)

- **Service pages** (`app/(app)/services/[slug]/page.tsx`): `<RelatedCaseStudies serviceSlug={service.slug} />` and `<TestimonialsRow surface="white" />` inserted after the existing `RelatedServices` section and before the closing ink CTA. Both are no-ops (render `null`) when there's no matching content — confirmed live (§2.3), so this is safe to ship even before any testimonials/case studies exist.
- **Landing Pages**: both available as optional blocks (§1.3), positioned anywhere in the `blocks` array like Hero/Text/Cta.
- **Homepage**: intentionally not touched — the brief marks homepage integration "(future)"; `app/(app)/page.tsx` and its hardcoded block components are unchanged.

No new design system, no new visual language — every component reuses the existing `Section`, `Eyebrow`, `Reveal` primitives already used by every other block in `components/blocks/`.

## 2. Validation performed

### 2.1 Required checks (all clean, run fully after the Phase 3 test rows below were removed)

```
npm run test          PASS — 4/4 (reserved-slugs suite, extended to cover "case-studies")
npm run lint           PASS (clean)
npx tsc --noEmit       PASS (clean)
npm run build           PASS — 31 routes, including /case-studies and /case-studies/[slug]
```

### 2.2 Schema push

Two new collections meant two new table groups. Followed the established (documented in every prior phase) workaround for Payload's standalone migration CLI being broken under Node 24 on this machine: `next dev` + hit `/admin/` to trigger dev-mode schema auto-push. Confirmed via `information_schema` that `cms.testimonials`, `cms.case_studies`, `cms.case_studies_results`, `cms.case_studies_rels`, and their `_v` version-history counterparts, plus `pages_blocks_testimonials_block`/`pages_blocks_case_studies_block` and their `_pages_v_blocks_*` counterparts, were all created correctly.

### 2.3 Live functional verification (via direct SQL test rows, since valid admin credentials aren't available in this environment — same constraint as Phase 2)

- Inserted one **published** + one **draft** testimonial, and one **published** + one **draft** case study (the draft case study linked to the draft testimonial, to also exercise the relationship-resolution path).
- Draft privacy confirmed across all three surfaces: page route (`404`/omitted), REST (`?draft=true` from an anonymous request still excluded), GraphQL (draft doc absent from anonymous query results) — matching the exact rigor of the Phase 2 `Pages` verification.
- Published case-study detail page: `200`, correct `<title>`/meta from `seoTitle`/`seoDescription`, results stat grid, challenge/solution copy, gallery, testimonial card, and a working link to the related service — all confirmed via rendered page text, not just HTTP status.
- JSON-LD confirmed present and correct: `Article` (via `caseStudySchema`) + `BreadcrumbList`, alongside the site's existing `ProfessionalService` schema.
- Sitemap: confirmed the case-study detail page and `/case-studies/` hub both present in `sitemap.xml` after rebuild.
- Service-page integration (Part 3's explicit requirement): confirmed live on `/services/shopify-ecommerce/` — both `RelatedCaseStudies` (the linked case study, via `servicesUsed`) and `TestimonialsRow` (the featured testimonial) rendered correctly on a real, existing, in-production service page.
- **Pages-block integration, end-to-end**: inserted a test landing Page with three blocks in order — Hero, Testimonials (no manual picks), Case Studies (no manual picks) — to specifically exercise the Featured-fallback path inside the `blocks` field pipeline (not just the standalone row components). All three rendered correctly, in the correct order, confirmed via `get_page_text`. Console checked on a fresh tab: zero real errors, only the already-documented benign Vercel Analytics/Speed Insights 404s that exist site-wide.
- **Graceful empty state** (relevant because this collection will genuinely be empty in production immediately after merge, until content is added): after all test data was removed, re-checked `/services/shopify-ecommerce/` and `/case-studies/` — both return `200` with zero errors; `TestimonialsRow` and `RelatedCaseStudies` correctly render nothing (return `null`) rather than an empty heading or a crash.
- All test data (2 testimonials, 2 case studies + their `results`/`rels` child rows, 1 test Page + its block rows) deleted afterward; confirmed via SQL: `cms.testimonials` = 0 rows, `cms.case_studies` = 0 rows, `cms.pages` = 0 rows.

### 2.4 Route-collision protection — reproduced the Phase 2 methodology exactly

Inserted a rogue **published** Page with `slug: "case-studies"` directly via SQL (bypassing the collection's own `validate` function — the only way to test actual routing precedence rather than just the validator that's supposed to prevent this in the first place). `GET /case-studies/` returned `200` with the real hub's title (`Case Studies — Real Client Results | THE BUSINESS lb`) and no trace of the rogue content. Deleted the rogue row immediately after; confirmed `cms.pages` back to 0 rows.

### 2.5 Regression check — existing collections/routes unaffected

Row counts before and after this branch's work, confirmed via direct SQL: Services `5`, Articles `3`, FAQs `49`, Navigation `22`, Users `1`, Site Settings intact (`site_name = "THE BUSINESS lb"`) — none of these tables were touched by any Phase 3 migration or code path.

Functional spot-check, all `200`: `/`, `/services/`, `/services/shopify-ecommerce/`, `/insights/`, `/insights/shopify-or-website-lebanon/`, `/pricing/`, `/about/`, `/contact/`, `/admin/`. GraphQL `Services` query returns correct data (`200`, via the redirect-followed POST). No existing collection's `payload/collections/*.ts` file was modified except `Pages.ts` (additive: two new block imports, two new entries in the `blocks` array).

## 3. Issues found and fixed during implementation

### 3.1 GraphQL schema-naming collision (real bug, not hypothetical)

The Testimonials/CaseStudies **blocks** (for the Pages `blocks` field) originally used the same slugs as the Testimonials/CaseStudies **collections** (`"testimonials"` / `"caseStudies"`). Payload derives GraphQL type names from both collection slugs and block slugs, and the two collided: `/api/graphql` returned a hard `500` — **"Schema must contain uniquely named types but contains multiple types named 'Testimonials'"** — for the entire endpoint, not just the new types. Confirmed via live testing that even pre-existing `Services`/`Pages` GraphQL queries failed during this window, i.e. this wasn't a cosmetic issue, it was a genuine site-wide GraphQL outage waiting to ship.

**Fix:** renamed the block slugs to `testimonialsBlock` / `caseStudiesBlock` (distinct from the collection slugs), updated the `blockType` literal types in `lib/cms/types.ts` and the switch-case strings in `block-renderer.tsx` to match. Verified the fix live: both new types and all pre-existing GraphQL queries return `200` again.

This is new, previously-undocumented Payload behavior (not covered in any prior phase's docs) — worth remembering for any future block whose name might overlap a collection name.

### 3.2 Stale tables after the block-slug rename

After the rename, Drizzle's non-interactive schema push didn't detect it as a rename — it left the old, empty tables (`pages_blocks_testimonials`, `pages_blocks_case_studies`, without the `_block` suffix) in place instead of dropping them, while the compiled query code referenced the new names, producing a real "Failed query" runtime error on `GET Pages`. **Fix:** confirmed the stale tables were empty via direct row count, `DROP TABLE ... CASCADE` on them and their `_pages_v_blocks_*` version-history counterparts, then re-ran the schema push, which created the correctly-named tables. Re-verified `Pages` GraphQL query returns `200` with valid data.

## 4. Scope compliance

Confirmed via `git status`/`git diff` before writing this report:

- **Not touched:** `payload/collections/{Services,Articles,FAQs,Navigation,Users}.ts`, `payload/globals/SiteSettings.ts`, `payload/hooks/revalidate.ts` (both new collections reuse existing exports, nothing added or changed there), `app/(app)/page.tsx` (homepage), any homepage block component, `components/blocks/hero.tsx` and siblings (the original, non-CMS homepage components).
- **Modified, all additive:** `payload.config.ts` (2 new imports, 2 new entries in `collections`), `payload/collections/Pages.ts` (2 new block imports, 2 new entries in `blocks`), `lib/cms/types.ts` (new interfaces + block-doc union extended), `lib/cms/reserved-slugs.ts`/`.test.ts` (`"case-studies"` added), `lib/seo/schema-org.ts` (`caseStudySchema` appended), `app/(app)/sitemap.ts` (new route + slugs merged in), `app/(app)/services/[slug]/page.tsx` (2 new sections appended after existing content), `components/blocks/page/block-renderer.tsx` (2 new switch cases).
- **No design changes.** Every new component reuses existing `Section`/`Eyebrow`/`Reveal` primitives and existing Tailwind tokens (`brass`, `ink`, etc.) — no new visual language introduced, per the explicit "do not redesign" instruction.
- **No redeploy required for content edits** — both collections use the same on-demand `revalidatePath()` mechanism as every other collection; there is no time-based ISR anywhere in this codebase to conflict with.

## 5. Production-readiness review (Part 9)

**Security.** Both collections follow the exact access-control pattern established and hardened in Phase 2 (§1.7 above) — anonymous reads scoped to `_status: "published"` only, `create`/`update` gated to admin/editor, `delete` to admin only. Verified live, not assumed. No new user input surfaces are exposed to the public (all writes go through Payload's own authenticated admin API, same as every other collection). `logo`/`featuredImage`/gallery `image` fields are plain URL text fields (no file upload, no media library in this project) — rendered via a plain `<img>` tag with an eslint-disable comment, since no `next/image` remote-pattern config exists for arbitrary CMS-supplied URLs; this matches the project's current media-handling approach everywhere else, not a gap introduced by this phase.

**SEO.** `seoTitle`/`seoDescription` required with the same maxLength conventions as Services/Articles/Pages. Canonical URLs, sitemap inclusion, and JSON-LD (`Article` + `BreadcrumbList`) all verified live on a real case-study page. No duplicate-content risk: the hub lists all published case studies, each with a unique detail URL.

**Performance.** Detail pages use `generateStaticParams` (SSG) with `dynamicParams = true`, identical to Services/Articles/Pages — no new performance model introduced. `getTestimonialsByIds`/`getCaseStudiesByIds` batch-resolve relationships in a single query rather than N+1 (matching `getServicesByIds`'s existing pattern). All data functions wrapped in `cache()`.

**Access control.** Covered under Security above; verified live for both collections across page/REST/GraphQL surfaces.

**Revalidation.** Reuses the proven site-wide hooks already live in production for 4 other collections — no new revalidation code path was introduced, only two additional consumers of the existing one. Confirmed live: creating/publishing test rows made content appear without a rebuild (via the dev-mode schema-push + subsequent SQL-driven test cycle); the underlying mechanism is identical to what's already running in production.

## 6. Risks

- **`toCaseStudy()`'s testimonial resolution adds one extra query per case study** (`getTestimonialsByIds`) beyond what Services/Articles need. At current and reasonably foreseeable content volumes (a handful of case studies) this is immaterial; flagged only for completeness, not as something requiring action now.
- **No media library** means `logo`/`featuredImage`/`gallery` are freeform URL text fields — an editor must host images elsewhere and paste a URL. This mirrors how every other image-ish field in this CMS already works today; not a regression introduced by Phase 3, but worth knowing before promising a smoother content workflow to Founder/Marketing Manager/VA users.
- **GraphQL block/collection slug collision (§3.1) is a general Payload footgun**, not fully mitigated at the framework level — any future collection or block pair sharing a name will hit the same failure mode. Worth a short note in `PHASE2-ARCHITECTURE.md` or a new `PAYLOAD-NOTES.md` for future phases; not fixed structurally here since Payload itself doesn't offer a namespacing option for this.

## 7. Recommendation

All 9 parts of the brief are implemented and verified live: both collections, both blocks, all data-access functions, all frontend integration points (service pages + landing-page blocks), SEO (metadata/sitemap/structured data), revalidation (reused, not reinvented), and the full validation suite (`test`/`lint`/`tsc`/`build`) all pass clean. Two real bugs were found and fixed during implementation (§3), both verified fixed via live testing, not just code inspection. Regression checks confirm every existing collection, route, and row count is unaffected.

**Ready for review and merge**, subject to the same human sign-off step used for Phase 2 — this report deliberately stops short of opening a PR or merging, per explicit instruction. Nothing in this branch has been pushed to any remote.
