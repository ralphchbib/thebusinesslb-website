# Phase 4C.5 — Pages OG Image + Noindex: Implementation Report

Based on `PHASE4C-SEO-PLAN.md` §E and `SEO-SCHEMA-CHANGES.md` §5. Branch: `feat/phase4c-5-pages-og-image-noindex` (off `main` @ `8e18a51`).

## 1. What shipped

- `payload/collections/Pages.ts`: +`ogImage` (upload → media, optional, same pattern as 4C.3/4C.4) and +`noindex` (checkbox, `defaultValue: false`).
- `lib/cms/types.ts`: `PayloadPageDoc` gains both fields.
- `lib/cms/pages.ts`: `PageData` gains `ogImage?: string` and `noindex: boolean` (always a real boolean in the returned shape, defaulting `false` via `doc.noindex ?? false` — never `undefined`, so callers don't need their own fallback). `getPageBySlug()`'s query depth bumped `0` → `1` to populate the new Media relationship, matching every other content type's pattern.
- `app/(app)/[slug]/page.tsx`: `generateMetadata()` now passes `ogImage: page.ogImage`, and sets `metadata.robots = { index: false, follow: true }` when `page.noindex` is true — Next's own first-class `Metadata.robots` field, no custom meta-tag code needed.

## 2. `noindex` — the one genuinely new mechanism in this initiative

Per `SEO-ARCHITECTURE-REVIEW.md` §8, `noindex` has no precedent anywhere else in this codebase. Implementation is deliberately minimal: a checkbox defaulting to `false` (indexable — matches every Page's behavior before this change), read once in `generateMetadata()`, mapped directly to Next's built-in `robots` metadata field. No new component, no custom `<meta>` tag, no new admin UI beyond the field's own description text (which explicitly explains when to use it, matching this codebase's established convention for non-obvious fields — see `Media.alt`'s description).

## 3. Schema push — including the versions (`_pages_v`) table

`Pages` uses `versions: { drafts: true }` (unlike Services/Articles), which means Payload maintains a parallel `_pages_v` table mirroring every field with a `version_` prefix (confirmed present already for `version_seo_title`/`version_seo_description` etc.). Applying the same "extract Payload's own shape, don't guess" technique as 4C.3/4C.4, but this time checking **both** tables:

1. `cms.pages`: added `og_image_id` (integer, nullable, FK → `media.id`, `ON DELETE SET NULL`, indexed) and `noindex` (boolean, `DEFAULT false`).
2. `cms._pages_v`: added the matching `version_og_image_id` and `version_noindex` columns (same shapes), after confirming via `information_schema` that this is exactly the naming convention Payload already uses for this table's other mirrored fields.

Both applied via temporary scripts, deleted immediately after running — not part of this PR's diff. Skipped the full interactive dev-mode push for the same reason as 4C.3/4C.4 (this branch doesn't include 4C.1's not-yet-merged Site Settings fields, which would trigger the same false-positive "delete" prompt documented in 4C.3's report).

## 4. Files changed

| File | Change |
|---|---|
| `payload/collections/Pages.ts` | +`ogImage`, +`noindex` fields |
| `lib/cms/types.ts` | +2 fields on `PayloadPageDoc` |
| `lib/cms/pages.ts` | +2 fields on `PageData`, `+resolveMediaUrl()`, `depth: 0` → `depth: 1` |
| `app/(app)/[slug]/page.tsx` | `generateMetadata()`: `+ogImage`, `+conditional robots.noindex` |

## 5. A note on live verification limits

No published `Pages` record currently exists in this environment's database (confirmed via the build output: the `/[slug]` catch-all route has zero concrete child paths listed) — so there's no live record to exercise the `noindex: true` branch against real data. Validated via `tsc`/build (the code path type-checks and the unconditional `noindex: false` default path renders correctly for the zero-pages case) and by direct reasoning about the `robots` object's construction, detailed in `PHASE4C-5-VALIDATION.md`. Recommend a real functional check (publish a test Page with `noindex` checked, confirm the rendered `<meta name="robots">` tag) once this ships to an environment with content to test against.
