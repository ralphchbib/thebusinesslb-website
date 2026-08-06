# Media Architecture — Phase 4B

Technical reference for the Media Library as actually built and verified live, not the pre-implementation plan (`PHASE4B-MEDIA-LIBRARY-PLAN.md`, still accurate for the reasoning, superseded here for exact specifics).

## 1. Collection

`payload/collections/Media.ts`, slug `media`. `access`: `read: anyone, create/update: adminOrEditor, delete: adminOnly` — same tier as every content collection.

```
upload: {
  staticDir: "media-uploads",   // local-disk fallback only — see §3
  mimeTypes: ["image/*"],
  imageSizes: [
    { name: "thumbnail", width: 300, height: 300, position: "centre" },
    { name: "card", width: 600 },
    { name: "hero", width: 1200 },
  ],
}
fields: [{ name: "alt", type: "text", required: true }]
```

`alt` is the only custom field — required, so every image in the library always has real accessibility text, set once and reused everywhere that image is used (replacing the old per-field `heroImageAlt`/`founderImageAlt` pattern from Phase 4A, which is now gone — alt lives on the image itself).

## 2. Fields migrated (5, across 3 collections/globals)

| Field | Before | After |
|---|---|---|
| `Testimonials.logo` | `text` | `upload → media` (optional) |
| `CaseStudies.featuredImage` | `text` | `upload → media` (optional) |
| `CaseStudies.gallery[].image` | `text` | `upload → media` (was `required`, Payload's generated schema does **not** enforce that at the DB level — see §5) |
| `Homepage.heroImage` | `text`, required | `upload → media`, required |
| `Homepage.founderImage` | `text`, required | `upload → media`, required |
| `Homepage.ogImage` | `text`, optional | `upload → media`, optional (new — Part F of the brief) |

## 3. Storage strategy — implemented exactly as planned

`vercelBlobStorage()` (`@payloadcms/storage-vercel-blob`) registered as a Payload plugin in `payload.config.ts`:

```ts
plugins: [
  vercelBlobStorage({
    enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    collections: { media: true },
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }),
],
```

`enabled` is conditional on the token existing. **This environment has no `BLOB_READ_WRITE_TOKEN`** (it's provisioned per-environment in the Vercel dashboard, the same way `DATABASE_URL`/`PAYLOAD_SECRET` are, and doesn't exist locally) — so every upload performed during this phase's validation used Payload's own local-disk fallback (`staticDir: "media-uploads"`, gitignored, confirmed never committed). This is the intended, documented behavior, not a workaround: the same `Media` collection config works unchanged in both modes, and real production (once the token is set in Vercel) automatically switches to Blob with zero code change.

## 4. `next/image` integration — two real, verified requirements

1. **Vercel Blob's own host** needs a `remotePatterns` entry (`*.public.blob.vercel-storage.com`) — anticipated in the original plan.
2. **The local-disk fallback also needs one, which the original plan did not anticipate.** Confirmed live: Payload's `Media.url` field is always a fully-qualified absolute URL built from `serverURL` (`http://localhost:3000` in this environment), even when the file is served same-origin. `next/image` treats *any* absolute URL as remote regardless of host — it doesn't special-case "this happens to match my own origin." Without a matching `remotePatterns` entry, every local-fallback image fails to render with `"url" parameter is not allowed`, confirmed via a direct `400` before the fix and `200` after. `next.config.ts` now has both entries, with the reasoning documented inline.

## 5. Schema, verified against Payload's own computed output, not assumed

**A real blocker was hit here** — see `PHASE4B-IMPLEMENTATION-REPORT.md` §3 for the full account. Summary: Payload's dev-mode schema push requires an interactive TTY confirmation for this specific migration (converting existing `text` columns to relationship columns), and no TTY is available in this environment by any means tried (including `winpty`, which cannot attach because the command-execution environment provides no real terminal anywhere in the chain). The schema was applied by hand via direct SQL — but the *exact* column names, types, indexes, and foreign-key behavior were extracted from Payload's own internal schema computation first (via a temporary `push: false` config + a script dumping `adapter.rawTables`), not guessed. Confirmed correct afterward: re-running Payload's own push logic detected **zero diff** against the hand-applied schema.

Key facts from that extraction, worth knowing for anyone touching this schema by hand again:
- Every FK to `media.id` uses `onDelete: "set null"` — Payload's own default. On `Homepage.heroImage`/`founderImage` this combines with `NOT NULL` at the DB level, which is a latent tension: Postgres will only actually raise an error from this combination if someone tries to delete a Media document that's still referenced by a required field. Not something this phase needed to resolve — application-level protection against deleting in-use media, if desired, is Phase 4B+ territory.
- `CaseStudies.gallery[].image` is `required: true` in the Payload field config but has **no** `NOT NULL` in the generated schema — Payload's `required` validation for upload/relationship fields inside arrays is enforced at the application layer, not the database layer. Don't assume `required: true` implies a DB constraint for this field type.
- The `media` table itself has a `unique` index on `filename` — two uploads can't share a filename (Payload handles de-duplication/renaming on conflict automatically).

## 6. Editor workflow

Unchanged from `PHASE4B-MEDIA-LIBRARY-PLAN.md`'s §E — verified live, not just planned:
1. Any of the 5 fields is now an image picker (grid of existing Media, thumbnails via the `thumbnail` size) with an Upload New option.
2. New upload requires `alt` text.
3. Same image can be picked across Testimonials/Case Studies/Homepage without re-uploading — confirmed by using the one migrated image (`ralph-chbib-source.png`) as both `heroImage` and `founderImage` simultaneously, pointing at the same Media document.
4. Homepage's Hero/Founder images are now genuinely self-service — no `/public` file placement, no developer step. This closes the limitation flagged in `PHASE4A-FINAL-REVIEW.md` and the Post-4A review.

## 7. What's deliberately unchanged

Site branding assets (`logo-wordmark-*.svg`, `monogram.svg`, `icon-*.png`, `og/default.png`) remain plain static files in `/public`, hardcoded in `layout.tsx`/metadata — not editor content, out of scope, exactly as scoped in the original plan.
