# Phase 4B — Media Library: Final Review (pre-PR)

Prepared before opening the pull request. See `PHASE4B-MEDIA-LIBRARY-PLAN.md` for the approved plan, `MEDIA-ARCHITECTURE.md` for the technical reference, and `PHASE4B-IMPLEMENTATION-REPORT.md` for the full build/validation narrative including the blockers hit and resolved — this document is the tighter pre-PR checklist.

## Files modified (14)

| File | Nature of change |
|---|---|
| `payload.config.ts` | +2 imports (`vercelBlobStorage`, `sharp`), +1 `plugins` entry, +1 `sharp` config entry, +1 `collections` array entry (`Media`) |
| `next.config.ts` | `images.remotePatterns` added: Vercel Blob host + local-dev-only `localhost:3000` entry (the latter a real bug fix found during validation, not anticipated in the plan — see implementation report §2.4) |
| `payload/collections/Testimonials.ts` | `logo` field: `text` → `upload, relationTo: "media"` |
| `payload/collections/CaseStudies.ts` | `featuredImage` and `gallery[].image` fields: `text` → `upload, relationTo: "media"` |
| `payload/globals/Homepage.ts` | `heroImage`/`founderImage`: `text` → `upload, relationTo: "media"`; `heroImageAlt`/`founderImageAlt` fields removed (alt now lives on the Media document); `ogImage`: `text` → `upload, relationTo: "media"` |
| `lib/cms/types.ts` | New `PayloadMediaDoc` interface; `logo`/`featuredImage`/`gallery[].image`/`heroImage`/`founderImage`/`ogImage` field types updated to `number \| PayloadMediaDoc` |
| `lib/cms/testimonials.ts` | `logo` resolved to `{url, alt, width?, height?}`; query depth bumped 0→1 so the relationship populates inline |
| `lib/cms/case-studies.ts` | `featuredImage`/`gallery` resolved to the same `{url, alt, width?, height?}` shape (new `CaseStudyImage` type) |
| `lib/cms/homepage.ts` | `heroImage`/`founderImage`/`ogImage` resolved via a new local helper; query depth bumped 0→1 |
| `components/blocks/testimonial-card.tsx` | Logo: plain `<img>` → `next/image` with explicit `width`/`height` |
| `components/blocks/case-study-card.tsx` | Featured image: plain `<img>` → `next/image`, `fill` mode |
| `app/(app)/case-studies/[slug]/page.tsx` | Featured image + gallery: plain `<img>` → `next/image`, `fill` mode; `generateMetadata`'s `ogImage` now reads `.url` off the resolved object |
| `.gitignore` | `/media-uploads/` added (local-disk upload fallback, never committed) |
| `app/(payload)/admin/importMap.js` | Auto-regenerated — registers the Vercel Blob client-upload-handler admin component. A real, required change this time (confirmed via diff), unlike the no-op regenerations seen in prior phases |

## Files created (3)

| File | Purpose |
|---|---|
| `payload/collections/Media.ts` | The new upload collection — `alt` field, 3 `imageSizes`, same access tier as every content collection |
| `scripts/migrate-homepage-media.ts` | One-off migration: uploads the single pre-existing image via Payload's Local API, restores the Homepage global (which had to be fully deleted mid-migration — see below) with correct Media references. Idempotent, same pattern as `scripts/seed-homepage.ts` |
| `MEDIA-ARCHITECTURE.md` | Technical architecture reference |

(`PHASE4B-MEDIA-LIBRARY-PLAN.md`, `PHASE4B-IMPLEMENTATION-REPORT.md`, and this file are also new but are process documents, not application code.)

## Database impact

One new table (`cms.media`, 30 columns — upload metadata + 3 configured image-size variants + the custom `alt` field), plus 6 existing tables gaining new foreign-key columns pointing to it (`homepage`, `testimonials`, `_testimonials_v`, `case_studies`, `_case_studies_v`, `case_studies_gallery`, `_case_studies_v_version_gallery` — 8 ALTER operations total across these). **This is the first schema-breaking change in the project's CMS work** — every prior phase was purely additive. The exact schema was extracted from Payload's own internal computation (not guessed) and applied via direct SQL after the normal dev-mode push proved categorically unavailable in this environment (full account in the implementation report). Re-verified afterward: Payload's own push logic detects zero diff against the hand-applied schema.

No pre-existing row was altered in place. `cms.homepage`'s single existing row was deleted and recreated (via `scripts/migrate-homepage-media.ts`, using Payload's Local API) rather than updated in place, because removing it was the safe way to let the new required Media relationship columns be added without the schema-push tool needing to reason about "how do I backfill a NOT NULL column on an existing row" — the recreated row is word-for-word identical in content to the original, plus correct Media references. Testimonials/Case Studies had 0 existing rows, so their field-type changes involved no data at all.

## Migration behavior

- **Testimonials/Case Studies**: clean field-type cutover, zero data to migrate (both collections were empty).
- **Homepage**: the one real image (`ralph-chbib-source.png`, used for both Hero and Founder) was uploaded once into the new Media collection via Payload's Local API (not raw SQL — exercises the real upload path, storage adapter, and sharp size-generation), then the Homepage global was recreated with both fields pointing at that single Media document. Content verified word-for-word identical to the pre-migration state.
- **Reversible**: yes — see Rollback plan below.

## Rollback plan

1. **Code**: dedicated feature branch, not merged until reviewed — `git checkout main` fully reverts with zero production impact, same posture as every prior phase.
2. **If merged and a problem surfaces**: `git revert` of the merge commit restores the 5 fields to plain text/URL types in code — but note the **database** schema (the new `media` table and 6 altered tables) does not automatically revert with a code revert, since it was applied by hand rather than through a tracked migration file. A full rollback would need the inverse `ALTER TABLE ... DROP COLUMN` statements run manually (straightforward — the exact columns are listed in `MEDIA-ARCHITECTURE.md` §2) alongside the code revert.
3. **Database**: the 6 altered tables' new FK columns can be dropped with no cascade risk to unrelated data (they only reference `media.id`, which nothing else depends on). The `media` table itself can be dropped entirely if desired — it has no incoming dependencies from anything outside these 6 already-covered columns.
4. **Storage**: the one real uploaded file exists only on local disk in this environment (`media-uploads/`, gitignored) — nothing to clean up in a real Vercel Blob store, since that path was never exercised here (no token present).

## Testing performed

- `npm run test` — 4/4 passing; `npm run lint` — clean; `npx tsc --noEmit` — clean; `npm run build` — 31 routes, clean, unchanged route count
- Real file upload through Payload's Local API, not raw SQL — confirmed correct `alt`/`width`/`height`/`filename`/`url` and on-disk file + size variants
- Live image rendering confirmed for all 5 migrated fields: Homepage hero, Homepage founder, Testimonial logo, Case Study featured image, Case Study gallery — each checked via a real production build (`next build` + `next start`), not dev mode
- `next/image` optimization proxy directly fetched and confirmed to return a valid image (not just that the markup looked right)
- GraphQL and REST both confirmed to correctly expose `Media` and resolve it through `Homepage`'s relationships
- Full regression sweep: every existing route `200` on the final clean build; every unrelated collection's row count confirmed unchanged
- All temporary test data removed; one real user account discovered during cleanup was correctly identified as legitimate (not a test artifact) and left untouched

## Known limitations

1. **`NOT NULL` + `onDelete: set null`** on `Homepage.heroImage`/`founderImage` means deleting an in-use required image from the Media library will fail with a raw Postgres constraint error rather than a friendly Payload validation message — a real, if narrow, rough edge inherited directly from Payload's own generated schema, not something this phase introduced or chose to fix.
2. **Local-dev-only `next.config.ts` entry** (`localhost:3000` in `remotePatterns`) is meaningless in production but was necessary to actually validate image rendering in this environment — harmless to leave in, but worth knowing it's there.
3. **No `BLOB_READ_WRITE_TOKEN` in this environment** — every upload validation in this phase exercised the local-disk fallback path, not real Vercel Blob. The plugin code is written to activate Blob automatically once the token exists in Vercel, but that specific code path (real Blob upload/serve) has not been directly observed, only reasoned about from the package's documented behavior.
4. **The dev-mode schema-push workflow is now confirmed broken for *any* future schema-breaking (not purely additive) change** in this environment — not just this one. Future phases that change an existing field's type should expect to repeat the manual extraction-and-apply process documented in the implementation report, not the simple `next dev` + `/admin/` flow every additive phase before this one used.
5. **Payload admin UI was not clicked through with real credentials**, same constraint as every phase since Phase 1 — verified via GraphQL/REST/Local-API instead.

## Status

All 8 requirements (A–H) verified live. One genuine environmental blocker hit, root-caused, and resolved with a verified (not assumed) fix. Ready for PR.
