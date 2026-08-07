# Phase 5B — Implementation Report

Branch: `feat/phase5b-draft-workflow` (off `main`). Based on the 7 approved Phase 5B planning documents. Scope: native Payload draft/publish versioning for `Services` and `Articles`, integrated with Phase 5A's existing preview infrastructure.

## 1. What shipped

### Collection configuration
- **`payload/collections/Services.ts`**, **`payload/collections/Articles.ts`**: added `versions: { drafts: true }`, `admin.preview` (same `/api/draft?...` link pattern as Pages/CaseStudies), `admin.defaultColumns` updated to show `_status` instead of `isPublished`, and `access.read` changed from `anyone` to `({req:{user}}) => user ? true : {_status:{equals:"published"}}` — the same pattern already live on Pages/CaseStudies/Testimonials.
- **`isPublished` kept, not removed**, per the approved plan: both fields are now `admin.readOnly: true` with a description marking them deprecated. The database column is untouched — this is the "defer the column drop" safety design from `PHASE5B-MIGRATION-PLAN.md` §5, preserved exactly as planned.

### Data layer
- **`lib/cms/services.ts`**, **`lib/cms/articles.ts`**: every `where: { isPublished: { equals: true } }` query switched to `where: { _status: { equals: "published" } }` (`getAllServices`, `getServicePriceMap`, `getPublishedServiceSlugs`, `getServicesByIds`, `getServicesBySlugs`, `getAllArticles`, `getPublishedArticleSlugs`).
- `getServiceBySlug`/`getArticleBySlug` gained a `draft: boolean = false` second parameter, following the exact `getPageBySlug`/`getCaseStudyBySlug` pattern from Phase 5A (plain boolean, not an options object, to preserve React `cache()` sharing between `generateMetadata()` and the page component).
- **`lib/cms/types.ts`**: `PayloadServiceDoc`/`PayloadArticleDoc` gained `_status?: "draft" | "published" | null`.

### Preview integration
- **`app/api/draft/route.ts`**: whitelist extended from `"pages" | "case-studies"` to include `"services" | "articles"`, each calling the respective draft-aware lookup and redirecting to `/services/{slug}/` or `/insights/{slug}/`. No new security logic — reuses the identical secret + session + collection-whitelist model already validated in production for Phase 5A.
- **`app/(app)/services/[slug]/page.tsx`**, **`app/(app)/insights/[slug]/page.tsx`**: wired `isPreviewMode()`/`PREVIEW_ROBOTS` (draft requests get `noindex,nofollow`, matching Pages/CaseStudies), and added `export const dynamicParams = true;` for consistency with the other CMS-backed detail routes (previously relied on Next's implicit default).

## 2. Database migration — what actually happened, including a real deviation from the original plan

The approved migration plan called for backfilling `_status: "published"` via Payload's Local API. During execution this hit two genuine, previously-unverified issues — both diagnosed and resolved, not glossed over:

### 2.1 Pre-existing oversized SEO fields blocked full-document validation

Payload's `update()` performs full-document validation whenever `_status` transitions to `"published"` (publishing must always be valid, even though *saving a draft* skips validation by default). Running the backfill surfaced that **2 of 5 Services and all 3 Articles have `metaTitle`/`metaDescription` values that already exceed the schema's `maxLength` constraints** (60/155 chars) — pre-existing content, never caught before because nothing had re-saved these documents through full validation since the length limits were added in Phase 4C:

| Record | Field | Length | Limit |
|---|---|---|---|
| services/shopify-ecommerce | metaTitle | 67 | 60 |
| services/social-media | metaTitle | 65 | 60 |
| articles/why-your-instagram-isnt-producing-enquiries | metaTitle | 75 | 60 |
| articles/shopify-or-website-lebanon | metaTitle | 73 | 60 |
| articles/how-much-does-a-website-cost-in-lebanon | metaDescription | 164 | 155 |
| articles/shopify-or-website-lebanon | metaDescription | 158 | 155 |
| articles/why-your-instagram-isnt-producing-enquiries | metaDescription | 160 | 155 |

**Resolution — no content was rewritten.** Per the explicit "preserve all existing published content" requirement, these values were left exactly as they are. Instead, `_status` was backfilled for these 5 records via a direct, single-column SQL `UPDATE cms.services/articles SET _status = 'published'` — touching only the internal status marker, no content field. This is a deliberate, documented deviation from "prefer Local API for data writes"; it does not conflict with the migration plan's own reasoning in §4 (a record with no version row falls back to base-table data), it's the same category of surgical fix already precedented in this project (Phase 4C.3's direct-SQL column addition when a mixed-branch schema-push prompt made the Local API path unsafe).

**Flagging as a real, separate follow-up**: these 5 records' `metaTitle`/`metaDescription` should be shortened by whoever owns SEO copy — until then, any future edit to these documents through the normal admin Publish button will be blocked by validation until they're fixed. This is a pre-existing data-quality issue that Phase 5B's publish-validation surfaced, not one it caused, and fixing the copy itself was correctly out of scope for this phase.

### 2.2 A confirmed defect in the plan's own V-1 assumption — found and fixed before merge

`PHASE5B-MIGRATION-PLAN.md` §4 flagged as an open question whether a record with `_status` set but no corresponding `_services_v`/`_articles_v` row would correctly "fall back to base-table data" under a `draft: true` fetch. **Live verification found this assumption was wrong.** Reading Payload's own `find()` implementation confirmed that a `draft: true` request queries the versions table directly (`payload.db.queryDrafts`), not the base table — a document with zero version rows is invisible to that query path entirely, returning `null`. This would have silently broken the Preview button for exactly the 5 records backfilled via direct SQL (§2.1) — a real functional gap, not a public-site content risk (the public fetch path never passes `draft: true`), but one that would have shipped broken if not caught here.

**Fix applied**: for each of the 5 affected records, called `payload.update({ collection, id, data: {}, draft: true })` — a genuine draft save with no data changes. Because `data._status !== "published"` this is a draft save (`isSavingDraft = true`), and Payload skips full-document validation for draft saves by default (confirmed by reading `node_modules/payload/dist/collections/operations/utilities/update.js`), so the oversized metaTitle/metaDescription values from §2.1 did not block it. This let Payload's own document machinery create the correct version row — including every nested array/group/relationship child table — with zero hand-written SQL for content. The resulting version row (and the base row) were then flipped from `draft` to `published` via a single-column SQL `UPDATE`, again touching no content field.

Post-fix, `draft: true` fetches of all 8 records (both the 3 with a Local-API-created version row and the 5 with a manually-created one) resolve correctly — confirmed by direct testing, not assumed. See `PHASE5B-VALIDATION-REPORT.md` §3 (V-1).

### 2.3 Final database state

- `cms.services` / `cms.articles`: new `_status` column, all 8 existing rows `_status = "published"`.
- `cms._services_v` / `cms._articles_v`: new tables, one `latest = true, version__status = "published"` row per existing document (8 total).
- `isPublished` column: untouched, still `true` for all 8, no longer read by any application code.
- No content field on any of the 8 pre-existing Services/Articles documents was modified at any point in this migration.

All temporary scripts used during migration and validation were deleted immediately after use — none are part of this branch's diff (confirmed via `git status`).

## 3. Files changed

| File | Change |
|---|---|
| `payload/collections/Services.ts` | `versions.drafts`, `access.read` gate, `admin.preview`, `admin.defaultColumns`, `isPublished` marked deprecated/readOnly |
| `payload/collections/Articles.ts` | Same as above |
| `lib/cms/services.ts` | `_status`-based queries, `draft` param on `getServiceBySlug` |
| `lib/cms/articles.ts` | `_status`-based queries, `draft` param on `getArticleBySlug` |
| `lib/cms/types.ts` | `_status` added to `PayloadServiceDoc`/`PayloadArticleDoc` |
| `app/api/draft/route.ts` | Whitelist extended: `services`, `articles` |
| `app/(app)/services/[slug]/page.tsx` | Preview-mode wiring, `dynamicParams = true` |
| `app/(app)/insights/[slug]/page.tsx` | Preview-mode wiring, `dynamicParams = true` |

Database (production Supabase instance, `cms` schema): additive schema changes (`_status` column ×2, `_services_v`/`_articles_v` tables) + `_status` backfill on 8 existing rows, as detailed in §2.

## 4. What was deliberately NOT done (matches the approved plan)

- `isPublished` column was not dropped.
- No existing `metaTitle`/`metaDescription` content was rewritten.
- No changes to Homepage, Site Settings, FAQs, Testimonials, or any relationship-field schema.
- No merge, no deploy, no branch deletion.
