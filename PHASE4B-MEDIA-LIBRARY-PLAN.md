# Phase 4B — Media Library: Planning Document

Status: **Planning only — no code written, no PR opened.** Grounded in the actual current codebase (`payload.config.ts`, every collection/global with an image field, `next.config.ts`, and the live production database), not a generic media-library design.

## 0. What's actually there today (read before designing)

- **Payload 3.87.0** is already installed (`package.json`) — a version with full, mature support for the `upload` field type and Payload's official cloud storage adapter plugins. No Payload upgrade is required for this phase.
- **Zero upload-type fields exist anywhere in the current config** — confirmed via a full grep of `payload/`. This is a greenfield addition, not a partial system to reconcile.
- **Exactly 5 image-bearing fields exist today, all plain text/URL, across 3 collections/globals**:
  | Field | Collection/Global | Current constraint |
  |---|---|---|
  | `Testimonials.logo` | Collection | Any URL — no upload |
  | `CaseStudies.featuredImage` | Collection | Any URL — no upload |
  | `CaseStudies.gallery[].image` | Collection | Any URL — no upload |
  | `Homepage.heroImage` | Global | **Must be a `/public` file** — `next/image`, no remote patterns configured |
  | `Homepage.founderImage` | Global | Same `/public`-only constraint |
- **Current real data footprint is small**: `cms.testimonials` and `cms.case_studies` both have **0 rows** in production right now (confirmed live) — meaning `logo`, `featuredImage`, and `gallery` have **no existing data to migrate at all**. `cms.homepage` has exactly 1 row, and its `heroImage`/`founderImage` both currently point to the same single file: `/ralph-chbib-source.png`. That's the entire real-world migration scope for this phase — one file, two field values.
- **`next.config.ts` has no `images.remotePatterns` configured** — this is why Homepage's image fields were restricted to local paths in Phase 4A in the first place, and it's a real, necessary change for this phase regardless of storage choice.
- **`/public` also holds site branding assets that are out of scope**: `logo-wordmark-*.svg`, `monogram.svg`, `icon-*.png`, `og/default.png`. These are hardcoded in `layout.tsx`/metadata, not editor content, and should **stay** as static files — pulling them into the Media Library would be scope creep with no editor benefit.

---

## A. Architecture

A new Payload **Upload collection**, `Media` (slug `media`), added to `payload.config.ts`'s `collections` array exactly like every other collection. Every one of the 5 existing text/URL fields above converts from `type: "text"` to `type: "upload", relationTo: "media"` — a relationship to a real, reusable Media document instead of a freeform string.

```
Media (new upload collection)
  ├─ access: same pattern as every content collection —
  │    read: anyone, create/update: adminOrEditor, delete: adminOnly
  ├─ upload: { imageSizes: [...], mimeTypes: ["image/*"] }
  ├─ fields: alt (text, required — accessibility + already-used pattern
  │           for heroImageAlt/founderImageAlt), plus Payload's own
  │           auto-managed filename/mimeType/filesize/width/height
  └─ storage: delegated to a cloud adapter plugin (§B), not local disk

Testimonials.logo            text        → upload → media
CaseStudies.featuredImage    text        → upload → media
CaseStudies.gallery[].image  text        → upload → media
Homepage.heroImage           text        → upload → media
Homepage.founderImage        text        → upload → media
```

**Why a relationship, not a copy-per-use**: the actual point of a media library over a URL field is reuse — the same uploaded photo should be usable across a Testimonial, a Case Study, and the Homepage without re-uploading it three times. A `relationTo: "media"` field gives every one of the 5 fields above a shared picker over the same underlying library, with Payload's own admin UI providing the "pick existing or upload new" flow natively — no custom UI needed.

**`next/image` integration**: every component currently rendering one of these 5 fields (`hero.tsx`, `founder-block.tsx`, `testimonial-card.tsx`, `case-study-card.tsx`, the case-study detail page's gallery) needs to resolve the relationship to a URL and pass it to `next/image` (or, for the two fields currently using plain `<img>` — Testimonials' logo, Case Studies' images — this phase is the natural point to **upgrade them to `next/image` too**, now that a real, known-good image source exists and the original reason for the `<img>` workaround — arbitrary untrusted URLs — goes away). `next.config.ts` needs a `remotePatterns` entry for whichever storage host is chosen (§B) — without it, `next/image` will refuse to render the uploaded files at all, the same failure mode Phase 4A specifically avoided by restricting Homepage's images to local paths.

---

## B. Storage strategy

Local Payload disk storage is **not viable** on Vercel — this needs to be stated as a hard constraint, not a preference: Vercel's serverless functions have an ephemeral, non-persistent filesystem, so anything written to local disk in one function invocation is gone by the next. This rules out Payload's zero-config default entirely; a cloud storage adapter is mandatory, not optional.

| Option | Fit for this project | Tradeoff |
|---|---|---|
| **Vercel Blob** (`@payloadcms/storage-vercel-blob`) | **Recommended.** Same platform as the existing deployment — one new env var (`BLOB_READ_WRITE_TOKEN`), no second cloud account or credential set for a 1-2-person admin team to manage, automatic CDN. Official, actively-maintained Payload adapter. | Ties image storage to Vercel specifically — a real but minor lock-in given the whole stack (hosting, Postgres via Vercel-adjacent tooling, deployments) is already Vercel-centric. |
| **S3-compatible** (`@payloadcms/storage-s3` — works with AWS S3, Cloudflare R2, Backblaze B2) | Viable alternative if portability off Vercel ever becomes a real goal, or at high volume where S3-class pricing beats Blob. | A second cloud provider and credential set to set up and manage — real added operational overhead for a team that doesn't have one today, for a benefit (portability, marginal cost at scale) this project doesn't currently need. |
| **Local disk** | Not viable | Breaks on Vercel's serverless filesystem — not a real option, listed only to explain why it's excluded. |

**Recommendation: Vercel Blob.** Matches the project's existing infrastructure exactly, lowest new operational surface area, and nothing about this site's current or foreseeable scale needs S3's specific advantages.

---

## C. Payload schema design

```
Media (new collection, slug: "media")
  admin: { useAsTitle: "alt" }
  access: { read: anyone, create: adminOrEditor, update: adminOrEditor, delete: adminOnly }
  upload: {
    mimeTypes: ["image/*"],
    imageSizes: [
      { name: "thumbnail", width: 300 },   // admin-panel picker grid
      { name: "card",      width: 600 },   // testimonial/case-study card usage
      { name: "hero",      width: 1200 },  // hero/founder full-size usage
    ],
  }
  fields: [
    { name: "alt", type: "text", required: true,
      admin: { description: "Required — used as the image's accessibility text wherever it's shown." } },
  ]

Testimonials.logo:           { type: "upload", relationTo: "media" }   // was: text
CaseStudies.featuredImage:   { type: "upload", relationTo: "media" }   // was: text
CaseStudies.gallery[].image: { type: "upload", relationTo: "media" }   // was: text
Homepage.heroImage:          { type: "upload", relationTo: "media", required: true }   // was: text, required
Homepage.founderImage:       { type: "upload", relationTo: "media", required: true }   // was: text, required
```

The single, required `alt` field on `Media` replaces the separate `heroImageAlt`/`founderImageAlt` text fields currently on `Homepage` — alt text becomes a property of the image itself (set once, reused everywhere that image is used), not re-typed per usage. `heroImageAlt`/`founderImageAlt` would be removed from `Homepage.ts` as part of this change.

---

## D. Database impact

Additive: one new table (`media`), following the exact schema-isolation and additive-only pattern every prior phase has used — nothing existing is touched at the table level. Payload's Postgres adapter generates the `media` table with columns for the upload metadata (filename, MIME type, filesize, width, height, plus one set of size/URL columns per configured `imageSizes` entry) and the `alt` field.

**Schema-breaking, not purely additive, at the field level** — this is the one real departure from every prior phase's "purely additive" database impact: the 5 existing fields above genuinely change type (`text` → `upload` relationship), which means their underlying column changes from a `varchar` to an integer foreign key into `media`. This needs an explicit data-migration step (§F), not just a schema push — the first departure from "just add new tables" in this project's CMS work so far.

No existing table outside the 5 affected fields' parent tables (`testimonials`, `case_studies`, `homepage`) is touched. `cms` schema isolation from `public` is unaffected, same as every phase before this one.

---

## E. Editor workflow

1. Open any field that used to be a URL box — it's now an image picker showing existing Media items in a grid (thumbnails, using the `thumbnail` size variant), with an **Upload New** option.
2. To add a new image: drag-and-drop or browse, then fill in the required `alt` text — Payload generates the `thumbnail`/`card`/`hero` size variants automatically on upload.
3. To reuse an existing image (e.g., the same client logo on a Testimonial and linked from a Case Study): pick it from the grid instead of re-uploading — this is the concrete, everyday benefit over today's copy-paste-a-URL workflow.
4. Homepage's Hero and Founder images become genuinely self-service for the first time — no developer step, no `/public` file placement, closing the one real limitation flagged in `PHASE4A-FINAL-REVIEW.md` and `POST-PHASE4A-PRODUCTION-ACCEPTANCE-REVIEW.md`.
5. Same instant-vs-draft behavior as today, unchanged by this phase: Homepage image changes are still live the moment Save is clicked (Homepage has no draft state); Testimonials/Case Studies image changes still require the existing Publish step.

---

## F. Migration strategy

Grounded in the actual near-empty data footprint from §0 — this is a genuinely low-risk migration specifically *because* two of the three affected collections have zero real content yet.

1. **Testimonials.logo, CaseStudies.featuredImage, CaseStudies.gallery[].image** — 0 existing rows in all three. Changing these field types is a clean cutover with **no data migration required at all**; there is nothing to convert.
2. **Homepage.heroImage / Homepage.founderImage** — 1 real value each, both pointing to `/ralph-chbib-source.png`:
   - Upload that one existing file into the new `Media` collection once, with real alt text (reusing the current `heroImageAlt`/`founderImageAlt` values as the starting `alt` text).
   - Update the Homepage row's `hero_image`/`founder_image` columns to reference the new Media document's ID instead of the literal path string.
   - This is a single, small, one-off data-migration script (following the same idempotent-seed-script pattern already established in `scripts/seed-homepage.ts`) — not a bulk migration, given the scope is exactly one file used in two places.
3. **No dual-field/parallel-run period needed** — unlike a system with substantial existing content, the footprint here is small enough that a direct field-type cutover (old field removed, new field added, one seed-style script for the one real value) is safe without a staged rollout.
4. `next.config.ts` gets a `remotePatterns` entry for the chosen storage host (Vercel Blob's `*.public.blob.vercel-storage.com` pattern) as part of the same change — without it, the migrated images would fail to render via `next/image` immediately after cutover.

---

## G. Risks

1. **This is the first schema-breaking (not purely additive) change across every CMS phase so far.** Every previous phase (Testimonials, Case Studies, Pages, Homepage) added new tables/fields without touching existing ones. This phase genuinely changes 5 existing fields' types — real, but contained given §0's footprint, and mitigated by §F's migration approach.
2. **New paid dependency.** Vercel Blob has its own pricing (storage + bandwidth) beyond what's already being paid for hosting — almost certainly trivial at this site's current image volume (a handful of photos, logos, and case-study images), but it's a genuinely new cost line, not a free addition.
3. **`next.config.ts`'s `remotePatterns` must be configured correctly**, or every migrated image fails to render — the exact same class of gap that originally forced Homepage's images to be `/public`-only in Phase 4A. This phase removes that constraint but introduces a new, different configuration requirement in its place.
4. **Every component currently rendering one of the 5 affected fields needs a matching code change** (`hero.tsx`, `founder-block.tsx`, `testimonial-card.tsx`, `case-study-card.tsx`, the case-study detail page) — a real, non-trivial set of touch points, though each individual change is small (resolve the relationship to a URL, same pattern already used for Testimonials/Case Studies relationship resolution elsewhere in this codebase).
5. **Upgrading Testimonials'/Case Studies' images from plain `<img>` to `next/image`** (recommended in §A) changes their loading/optimization behavior — low risk technically, but worth explicit visual re-verification post-migration, the same rigor every prior phase applied to its own changes.

---

## H. Rollback plan

1. **Code**: same posture as every prior phase — a dedicated feature branch, not merged until reviewed; `git checkout main` fully reverts with zero production impact.
2. **If merged and a problem surfaces**: `git revert` of the merge commit restores the 5 fields to plain text/URL fields — but note this is the one phase where a code revert **without** a matching data step would leave the `Media` table's data orphaned (harmless — just unused) while the 5 fields' *values* would need to be reverted too if real content was entered in the meantime. Practically: revert quickly, before much real content accumulates in the new fields, to keep this simple; the longer this phase is live before a rollback, the more manual data reconciliation a rollback would need.
3. **Database**: the new `media` table can be dropped with no cascade risk to anything except the 5 relationship fields that point to it — which is exactly what a code revert already reverts away from.
4. **Storage**: Vercel Blob files themselves are not automatically deleted by a code rollback — a rollback should include a manual check of whether any uploaded files are now orphaned and worth cleaning up, though leaving them (at this site's small scale) costs negligibly more than the cleanup effort would.

---

## I. Effort estimate

| Work item | Estimate |
|---|---|
| Storage adapter setup (Vercel Blob plugin + env var) | 1 hour |
| `Media` collection definition | 1 hour |
| Migrate 5 fields across Testimonials/CaseStudies/Homepage from text to upload relationship | 2 hours |
| Update every consuming component (5 components/pages) to resolve the relationship + upgrade Testimonials/Case Studies images to `next/image` | 2.5–3 hours |
| `next.config.ts` `remotePatterns` update | 15 min |
| One-off data migration script for the 1 real existing image (Homepage) | 45 min |
| Schema push + live verification (upload test, reuse test, all 5 fields, all affected pages) | 1.5–2 hours |
| Full validation pass (`test`/`lint`/`tsc`/`build`) + regression sweep | 45 min |
| Implementation report | 45 min |
| **Total** | **~10.5–12 hours**, comparable in size to Phase 4A |

---

## J. Recommended implementation phases

Sequenced within Phase 4B itself, lowest-risk first:

1. **4B.1 — Foundation**: storage adapter + `Media` collection, no existing field touched yet. Fully additive, zero risk to anything live — can be built and verified in isolation (upload a test image, confirm it's retrievable) before any existing field is changed.
2. **4B.2 — Migrate the empty collections first**: `Testimonials.logo`, `CaseStudies.featuredImage`, `CaseStudies.gallery[].image` — zero existing data, so this is a clean field-type cutover with no migration script needed, done before touching anything with real data.
3. **4B.3 — Migrate Homepage** (the one collection with real, live data): the one-off migration script for the existing hero/founder photo, then the field-type cutover — done last and separately because it's the only step in this phase with real content at stake.
4. **4B.4 — Validation and documentation**: full regression sweep, update `EDITOR-GUIDE.md`/`EDITOR-ONBOARDING-GUIDE.md`'s image-field descriptions (both currently document the `/public`-only and URL-only constraints this phase removes), implementation report.

This ordering means the single highest-stakes step (§F.2, Homepage's real data) happens last, once the storage layer and the field-type pattern have already been proven working on collections with nothing real to lose.
