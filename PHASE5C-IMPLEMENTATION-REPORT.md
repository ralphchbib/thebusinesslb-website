# Phase 5C — Implementation Report

Branch: `feat/phase5c-homepage-preview` (off `main` @ `ef02fac`, includes Phase 5B). Based on the approved `PHASE5C-HOMEPAGE-PREVIEW-PLAN.md`. Scope: native Payload draft/publish versioning for the Homepage Global, integrated with the existing preview infrastructure (Phase 5A/5B).

## 1. What shipped

### Global configuration
- **`payload/globals/Homepage.ts`**: added `versions: { drafts: true }`, `admin.preview` (no `slug` needed — the redirect target is always `/`, unlike every Collection's preview link), and `access.read` changed from `anyone` to `({req:{user}}) => user ? true : {_status:{equals:"published"}}` — the same pattern used by every drafts-enabled Collection. Unlike Services/Articles in Phase 5B, there was no legacy `isPublished`-style field to retire — `_status` is the only publish-state concept this document has ever had.

### Data layer
- **`lib/cms/homepage.ts`**: `getHomepage` gained a `draft: boolean = false` second parameter, following the exact `getPageBySlug`/`getServiceBySlug` pattern (plain boolean, not an options object, to preserve React `cache()` sharing between `generateMetadata()` and the page component). Its one existing call site (`app/(app)/page.tsx`, confirmed via grep to be the only caller) keeps working unchanged by omitting the argument.
- **`lib/cms/types.ts`**: `PayloadHomepageDoc` gained `_status?: "draft" | "published" | null`.

### Preview integration
- **`app/api/draft/route.ts`**: added a `collection === "homepage"` branch, structurally different from the four existing Collection branches — it takes no `slug`, calls `getHomepage(true)` instead of a slug-keyed lookup, and always redirects to `/`. Placed before the `if (!slug)` check so the Global case doesn't require a parameter no other Global-shaped request would send. No new security logic — reuses the identical secret + session check every other branch already uses.
- **`app/(app)/page.tsx`**: wired `isPreviewMode()`/`PREVIEW_ROBOTS` into both `generateMetadata()` and the page component, mirroring the pattern already shipped on 4 other routes.
- **The Preview Banner required zero changes** — confirmed already wired at the root layout level (`app/(app)/layout.tsx`), gated purely on `isPreviewMode()` regardless of which route triggered Draft Mode.

## 2. Database migration

Production Supabase (`cms` schema):
- New `_status` column on `cms.homepage` (additive).
- New `cms._homepage_v` versions table (additive).
- The single existing Homepage document backfilled to `_status: "published"`.

### 2.1 Pre-flight check (per the plan's §3.4 recommendation) — clean

Before migrating, checked Homepage's `metaTitle`/`metaDescription` lengths against the schema's `maxLength` constraints (60/155), since Phase 5B found 5 Services/Articles records already violated these. Homepage's values were **56/60 and 149/155 — both within limits**. No pre-existing content-length blocker existed here, unlike Phase 5B.

### 2.2 The known Phase 5B-class defect, pre-empted rather than rediscovered

The plan flagged (§3.3) that Payload's `draft: true` fetch queries the versions table directly rather than falling back to the base table, so a document with no version row is invisible to a draft fetch — a defect Phase 5B discovered live and fixed with a validation-skipping draft save followed by a single-column SQL flip. This time, that exact technique was applied **proactively, first**, not as a reactive fix:

1. `payload.updateGlobal({ slug: "homepage", data: {}, draft: true })` — a genuine draft save with no data changes, creating the correct version row via Payload's own document machinery (skips full-document validation because `data._status !== "published"`).
2. `UPDATE cms._homepage_v SET version__status = 'published' WHERE latest = true` and `UPDATE cms.homepage SET _status = 'published'` — single-column SQL flips, touching no content field.
3. Verified immediately: `getHomepage(true)` correctly resolved the full document (confirmed via a direct check before proceeding to any other implementation step, per the plan's §6 instruction to test this first, not last).

No trial-and-error, no validation error encountered during migration — the pre-flight check (§2.1) and the proactive fix (this section) meant both risks the plan flagged were closed before they could manifest.

## 3. Files changed

| File | Change |
|---|---|
| `payload/globals/Homepage.ts` | `versions.drafts`, `access.read` gate, `admin.preview` (no-slug variant) |
| `lib/cms/homepage.ts` | `draft` param added to `getHomepage` |
| `lib/cms/types.ts` | `_status` added to `PayloadHomepageDoc` |
| `app/api/draft/route.ts` | New `homepage` branch (Global-shaped: no slug, redirects to `/`) |
| `app/(app)/page.tsx` | Preview-mode wiring in `generateMetadata()` and the page component |

No file outside this declared scope was touched. `app/(app)/layout.tsx` (where the Preview Banner and `isPreviewMode()` are already wired site-wide) required no changes at all.

## 4. What was deliberately NOT done

- No changes to Site Settings (explicitly out of scope per the approved plan).
- No changes to any Collection.
- No merge, no deploy, no branch deletion.
- No content field on the Homepage document was permanently altered — the one draft edit made during validation (§ below) was reverted before this report was written.
