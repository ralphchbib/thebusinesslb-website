# Phase 4C.3 — Services OG Image: Implementation Report

Based on `PHASE4C-SEO-PLAN.md` §C and `SEO-SCHEMA-CHANGES.md` §3. Branch: `feat/phase4c-3-services-og-image` (off `main` @ `8e18a51`).

## 1. What shipped

- `payload/collections/Services.ts`: +`ogImage` field (`upload`, `relationTo: "media"`, optional) — same shape as `Homepage.ogImage`/`CaseStudies.featuredImage`, reusing the Media Library pattern established in Phase 4B rather than introducing a new image-field pattern.
- `lib/cms/types.ts`: `PayloadServiceDoc` gains `ogImage?: number | PayloadMediaDoc | null`.
- `content/services/types.ts`: `ServiceContent` gains an optional `ogImage?: string` (only ever populated from a live Payload document, matching the existing `id?` field's documented caveat).
- `lib/cms/services.ts`: `toServiceContent()` resolves the new relationship to a plain URL via a `resolveMediaUrl()` helper (same shape as `lib/cms/homepage.ts`'s `resolveMediaImage`).
- `app/(app)/services/[slug]/page.tsx`: `generateMetadata()` now passes `ogImage: service.ogImage`.

## 2. Schema push — a real, live TTY-blocker encounter, diagnosed and resolved

Running the established dev-mode schema-push workflow (`next dev` + hit `/admin/`) hit the interactive confirmation prompt this time — but not for the reason Phase 4B did. The prompt reported:

```
Warnings detected during schema push:
· You're about to delete default_seo_title column in site_settings table with 1 items
· You're about to delete default_meta_description column in site_settings table with 1 items
· You're about to delete default_og_image_id column in site_settings table with 1 items
[... 4 more Site Settings columns]
DATA LOSS WARNING: Possible data loss detected if schema is pushed.
Accept warnings and push schema to database? (y/N)
```

**Root cause**: this branch was created independently off `main`, per `SEO-IMPLEMENTATION-SEQUENCE.md`'s "each sub-phase independently shippable" design — so its checked-out `payload/globals/SiteSettings.ts` does **not** contain 4C.1's 7 new fields. But the actual database (a single shared instance, not branch-scoped) already has those 7 columns, applied while validating 4C.1 earlier in this session. Payload's schema-push correctly computed the diff between *this branch's* field config and the *live* database — and since this branch doesn't declare those 7 fields, it read as "these columns should be deleted." This is a byproduct of validating independently-branched, not-yet-merged sub-phases against one shared dev database, not a real destructive change — 4C.1's columns are still needed and will be reintroduced by that PR regardless.

The prompt received no interactive input (non-TTY session) and defaulted to **N** — confirmed no data loss occurred; the 7 Site Settings columns remain intact. The Services push (the only change actually intended in this sub-phase) was bundled into the same declined prompt, so it did **not** apply.

**Resolution**: rather than force the mixed push through (risking an actual accidental deletion) or temporarily merging 4C.1's uncommitted field config into this branch's working tree, applied only the exact single additive column this sub-phase needs via direct SQL — mirroring Phase 4B's "extract Payload's own computed schema, don't guess" precedent, scaled down to a single well-precedented field type. Inspected the already-live, Payload-created `homepage.og_image_id` column (added in Phase 4A) as the authoritative reference for what Payload computes for an optional `upload`/`relationTo: "media"` field: `integer NULL REFERENCES cms.media(id) ON DELETE SET NULL`, plus a btree index on the column. Applied the identical shape to `services.og_image_id` via a temporary script (`scripts/_tmp-add-services-ogimage.ts`, deleted immediately after running — not part of this PR's diff). Confirmed via `npm run build`: the previous `column services.og_image_id does not exist` error is gone, and the site's own runtime (not just a manual check) now queries this column successfully across all 31 routes.

## 3. Files changed

| File | Change |
|---|---|
| `payload/collections/Services.ts` | +`ogImage` field |
| `lib/cms/types.ts` | +1 field on `PayloadServiceDoc` |
| `content/services/types.ts` | +1 optional field on `ServiceContent` |
| `lib/cms/services.ts` | +`resolveMediaUrl()` helper, `toServiceContent()` resolves `ogImage` |
| `app/(app)/services/[slug]/page.tsx` | `generateMetadata()`: `+ogImage: service.ogImage` |

No file from 4C.1 or 4C.2 was touched — this branch is independent, as designed.

## 4. A note for whoever merges these PRs in sequence

Because 4C.1 and 4C.3 both edit `app/(app)/services/[slug]/page.tsx`'s `generateMetadata()` (4C.1 adds a `settings.defaultOgImage` fallback; 4C.3 adds `service.ogImage`), merging both will need a small, mechanical conflict resolution to combine them into `ogImage: service.ogImage ?? settings.defaultOgImage` — the full 3-level fallback chain the plan always intended, split across two independently-developed branches. Flagging this now rather than leaving it as a surprise at merge time.
