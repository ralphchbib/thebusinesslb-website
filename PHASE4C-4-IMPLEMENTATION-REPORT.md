# Phase 4C.4 — Articles OG Image + Schema Centralization: Implementation Report

Based on `PHASE4C-SEO-PLAN.md` §D and `SEO-SCHEMA-CHANGES.md` §4. Branch: `feat/phase4c-4-articles-og-image-schema` (off `main` @ `8e18a51`).

## 1. What shipped

### 1.1 `Articles.ogImage` field

Same shape as `Services.ogImage` (4C.3): `payload/collections/Articles.ts` gains an optional `upload → media` field. `PayloadArticleDoc`/`Article` types extended; `lib/cms/articles.ts`'s `toArticle()` resolves it via the same `resolveMediaUrl()` pattern now used in `services.ts`/`homepage.ts`.

### 1.2 `articleSchema()` — the schema-org.ts centralization

Per `SEO-ARCHITECTURE-REVIEW.md` §2/§8: Articles was the one content type whose JSON-LD lived inline in its page file instead of `lib/seo/schema-org.ts`, unlike the structurally-identical `caseStudySchema()`. Extracted it as `articleSchema({ title, description, datePublished, image? })`, called from `app/(app)/insights/[slug]/page.tsx` in place of the former inline object literal. `siteConfig` is no longer imported in that page file — it was only ever used inside the now-removed inline object.

**Deliberately conservative about scope**: `articleSchema()` produces the exact same 5 fields as the original inline version (`headline`, `description`, `datePublished`, `author`, `publisher`) plus an `image` field only when one is supplied — it does **not** add a `url` field, even though the structurally-similar `caseStudySchema()` has one. This keeps the refactor's output byte-identical to the pre-existing inline version for every currently-published article (none have `ogImage` set yet), satisfying the specific verification `SEO-RISK-ASSESSMENT.md` §4 called for before layering in the new field. Adding `url` for full consistency with `caseStudySchema()` is a reasonable follow-up, noted in the function's own comment rather than bundled into this change.

## 2. Files changed

| File | Change |
|---|---|
| `payload/collections/Articles.ts` | +`ogImage` field |
| `lib/cms/types.ts` | +1 field on `PayloadArticleDoc` |
| `content/insights/types.ts` | +1 optional field on `Article` |
| `lib/cms/articles.ts` | +`resolveMediaUrl()` helper, `toArticle()` resolves `ogImage` |
| `lib/seo/schema-org.ts` | +`articleSchema()` |
| `app/(app)/insights/[slug]/page.tsx` | Inline JSON-LD replaced with `articleSchema()` call; `generateMetadata()` gains `ogImage: article.ogImage`; unused `siteConfig` import removed |

## 3. Schema push

Same technique as 4C.3 (§2 of that report) — applied `articles.og_image_id` (integer, nullable, FK → `media.id`, `ON DELETE SET NULL`, btree-indexed) via a temporary script mirroring the already-verified `homepage.og_image_id`/`services.og_image_id` shape, rather than running the full interactive dev-mode push (which would hit the same Site-Settings false-positive-deletion prompt documented in 4C.3's report, since this branch also doesn't include 4C.1's not-yet-merged fields). Script deleted immediately after running; not part of this PR's diff.

## 4. Verification the refactor is safe (not just "looks right")

Full detail in `PHASE4C-4-VALIDATION.md` — summary: inspected the actual rendered JSON-LD for a real published article in the production build output and confirmed the key set is exactly `headline, description, datePublished, author, publisher` (no `image`, no `url`) — matching the original inline version exactly, field for field, before any new data exists to populate `image`.
