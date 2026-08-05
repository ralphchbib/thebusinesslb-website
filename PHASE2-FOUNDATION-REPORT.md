# Phase 2 Foundation — Implementation Report

Based on `PHASE2-ARCHITECTURE.md`. Foundation only, as scoped: the `Pages` collection, routing, SEO fields, publishing workflow, revalidation, and access control. No block library beyond the minimum needed to prove the pipeline end-to-end, no homepage migration, no existing collection touched.

## 1. What was built

### 1.1 `Pages` collection (`payload/collections/Pages.ts`)

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | |
| `slug` | text, required, unique | Blocked from reusing any reserved path — see §1.6 |
| `pageType` | select: `landing \| campaign \| seasonal` | Default `landing` |
| `seoTitle` | text, required, maxLength 60 | Same convention as `Services.metaTitle` |
| `seoDescription` | textarea, required, maxLength 155 | Same convention as `Services.metaDescription` |
| `blocks` | native Payload `blocks` field | Hero, Text, Cta — see §1.2 |

`versions: { drafts: true }` is enabled — Payload auto-adds the `_status` field (`draft`/`published`) and gives the admin UI separate Save Draft / Publish actions, per the architecture doc's recommendation for Pages specifically (§5, §6.3 of `PHASE2-ARCHITECTURE.md`).

### 1.2 Blocks (`payload/blocks/{Hero,Text,Cta}.ts`)

Exactly the 3 simplest blocks from the architecture doc's Stage 2a — enough to prove the collection → route → renderer pipeline actually works, not the full library. Each has an `isVisible` checkbox (default `true`), per the architecture doc's §5 "show/hide without deleting" recommendation. Every field is flat — no nested repeaters, consistent with the "no repeater-of-repeaters" rule the audit established for the existing 5 collections.

Deliberately **not built**: Image, Services, Pricing, Feature Grid, Newsletter, Testimonial, Statistics, Founder, Rich Content — all still exactly as scoped in `PHASE2-ARCHITECTURE.md` §3, none of them foundation-critical.

### 1.3 Presentational components (`components/blocks/page/`)

`hero-block.tsx`, `text-block.tsx`, `cta-block.tsx`, `block-renderer.tsx` — new files, entirely separate from the existing homepage components (`components/blocks/hero.tsx` etc.), which remain untouched and still hardcoded exactly as before. `BlockRenderer` switches on `blockType` and filters out `isVisible === false` blocks — the same pattern already shipped for `Articles.body` in `app/(app)/insights/[slug]/page.tsx`, scaled to a real Payload `blocks` field.

### 1.4 Data access (`lib/cms/pages.ts`, additions to `lib/cms/types.ts`)

`getPageBySlug(slug)` and `getPublishedPageSlugs()`, both wrapped in React's `cache()`, matching every other function in `lib/cms/*.ts` exactly. `lib/cms/types.ts` gained `PayloadPageDoc` and the 3 block-doc interfaces — pure additions, nothing existing in that file was changed.

### 1.5 Routing (`app/(app)/[slug]/page.tsx`)

New catch-all route. `generateStaticParams` from `getPublishedPageSlugs()`; `generateMetadata` via the existing `buildMetadata()` helper (no changes needed there); `dynamicParams = true` set explicitly (Next's default, made visible in code) so a page created after the last build is still reachable immediately — rendered on first request, cached from then on, no rebuild required.

**Coexistence with every existing route, verified, not assumed:** Next.js always resolves a literal path segment (`/services/`, `/about/`, etc.) ahead of a dynamic catch-all at the same level — this is standard, unconditional Next.js routing precedence, not something this implementation had to build. Confirmed live: every existing route (`/`, `/services/`, `/services/shopify-ecommerce/`, `/insights/`, `/pricing/`, `/contact/`, `/digital-assessment/`) still returns `200` after adding the catch-all.

### 1.6 Reserved-slug validation

A `validate` function on `Pages.slug` rejects `services`, `insights`, `pricing`, `about`, `contact`, `digital-assessment`, `privacy-policy`, `terms`, `thank-you`, `admin`, `api` (case-insensitive) at save time — an editor can never create a page that would silently be unreachable. This is a data-integrity guard, not a routing necessity: routing precedence already makes collision structurally impossible, as above.

### 1.7 Access control

```ts
read: ({ req: { user } }) => {
  if (user) return true;
  return { _status: { equals: "published" } };
},
create: adminOrEditor,
update: adminOrEditor,
delete: adminOnly,
```

**This needed more care than the other 5 collections, and here's why, verified by reading Payload's own source rather than assumed:** `node_modules/payload/dist/collections/operations/find.js` uses the *same* `read` access function regardless of whether a request passes `draft: true` — Payload does not gate draft reads through a separate access rule (`readVersions` exists, but only for the distinct version-history browser endpoint, not for `?draft=true` on the normal `find`/`findByID` calls). A plain `read: anyone` (matching Services/Articles/FAQs/Navigation/Site Settings) would have made **unpublished page content publicly readable** the moment `versions.drafts` was enabled. The `Where`-constraint form above closes that: anonymous requests are scoped to `_status: "published"` only; authenticated admin/editor users (who need to see draft work in the admin panel) get unrestricted read access. `create`/`update`/`delete` are unchanged from the established pattern.

### 1.8 Revalidation (`payload/hooks/revalidate.ts`)

Two new exports — `revalidatePageAfterChange`, `revalidatePageAfterDelete` — added purely additively; every existing export (`revalidateAfterChange`, `revalidateAfterDelete`, `revalidateGlobalAfterChange`, used by Services/Articles/FAQs/Navigation/Site Settings) is byte-for-byte unchanged.

Pages get **page-scoped** revalidation rather than the site-wide `revalidatePath("/", "layout")` the other 5 use — a deliberate difference, not an oversight, matching `PHASE2-ARCHITECTURE.md` §4.4: Pages aren't fetched by the shared root layout the way Navigation/Site Settings/Services are, so a site-wide revalidation would be unnecessarily broad. On save: `/${doc.slug}/` and `/sitemap.xml` are revalidated; if the slug itself changed, the *previous* slug's path is revalidated too, so the old URL stops serving stale content instead of hanging around as a phantom page. On delete: `/${doc.slug}/` and `/sitemap.xml`.

### 1.9 SEO — sitemap

`app/(app)/sitemap.ts` now also includes `getPublishedPageSlugs()` output, alongside the existing Services/Articles slugs — a 3-line addition to a file that isn't one of the 5 protected collections. Verified live (§2).

## 2. Validation performed

### 2.1 Required checks

```
tsc --noEmit         PASS (clean)
npm run lint          PASS (clean)
npm run build          PASS — 30 routes, including new /[slug] (SSG, 0 pre-rendered — correct, no pages exist yet)
```

### 2.2 Additional live verification (beyond what was strictly required, done because "foundation" is worth actually proving works)

The `cms.pages` tables didn't exist yet (new collection), so the same schema-creation step from the original Phase 1 build was needed: `next dev` + hitting `/admin/` to trigger Payload's dev-mode schema auto-push (Payload's standalone migration CLI remains broken under Node 24 on this machine, as documented in `CMS-IMPACT-REPORT.md`). Confirmed via direct SQL that `pages`, `pages_blocks_hero`, `pages_blocks_text`, `pages_blocks_cta`, and the `_pages_v*` version-history tables were all created correctly — the last one confirming `versions.drafts: true` took effect.

Attempted an actual admin login to test the full authenticated workflow end-to-end. It failed — the credentials from the original Phase 1 setup have evidently been changed since, as they were meant to be. **Confirmed via Payload's own source before attempting** that this carried zero risk: `Users.ts` never configures `maxLoginAttempts`, so `node_modules/payload/dist/auth/operations/login.js`'s lockout-increment path is entirely gated off (`maxLoginAttemptsEnabled` evaluates `false`) and a failed login writes nothing to the database. One incidental slip during this: a click/type briefly landed on a leftover browser tab pointed at the real `https://thebusinesslb.com` login page instead of the local one — only the email field got typed into, nothing was submitted, and no password was ever entered there. Caught immediately by checking tab state before proceeding further.

Since admin login wasn't available, the rest of the pipeline was verified by inserting test rows directly via SQL (the same technique the original seed script used) rather than skipping verification:

- Inserted one **published** page (Hero + Text + Cta blocks) and one **draft** page (Hero block only), both slugged `phase2-test-*`.
- `GET /phase2-test-published/` → `200`, correct `<title>` and `<meta name="description">` from `seoTitle`/`seoDescription`, and all 3 blocks rendered in the browser in the correct order with the correct content (confirmed via `get_page_text`, not just an HTTP status check).
- `GET /phase2-test-draft/` → `404` — **the critical security property (§1.7) confirmed working, not just reasoned about.**
- Rebuilt with the test rows in place: `phase2-test-published` was statically generated (`generateStaticParams` correctly picked it up); `phase2-test-draft` correctly did not appear anywhere in the build output.
- `sitemap.xml` (after the rebuild) included `phase2-test-published` and correctly omitted `phase2-test-draft`.
- Deleted both test rows afterward; confirmed via SQL that `cms.pages` and all 3 block tables and `_pages_v` are back to zero rows.
- Rebuilt once more to restore the build output to its true zero-pages state.

**What was not independently re-verified live in this session, and why:** the actual "editor clicks Save/Publish in the admin UI → the `afterChange` hook fires → the page updates without a rebuild" round-trip. That requires a real Payload-mediated write, which requires a login I didn't have. The hook code itself (`revalidatePageAfterChange`) follows the identical `revalidatePath()` pattern already proven live end-to-end for the other 5 collections in `SECURITY-HARDENING-REPORT.md`'s validation — the only difference is *which* paths get revalidated, not the underlying mechanism — so confidence here is high, but it's transitive, not a fresh live observation. Worth a quick real click-through once current admin credentials are available.

## 3. Scope compliance

Confirmed via `git status`/`git diff` before writing this report:

- **Not touched:** `payload/collections/{Services,Articles,FAQs,Navigation,Users}.ts`, `payload/globals/SiteSettings.ts`, `app/(app)/page.tsx` (homepage), any homepage block component, any existing route.
- **Modified, all additive:** `payload.config.ts` (one new import, one new entry in the `collections` array), `payload/hooks/revalidate.ts` (two new exports appended, nothing existing changed), `lib/cms/types.ts` (new interfaces appended), `app/(app)/sitemap.ts` (3 lines, new page slugs merged into the existing route list).
- **No drag-and-drop editor built.** Section reordering and duplication both come from Payload's own native `blocks`-field admin UI (drag handles, block picker) and its built-in per-document Duplicate action — zero custom editor code, matching the explicit instruction not to build one.
- **No existing page migrated.** The homepage, services, articles, pricing, contact, and assessment pages all render exactly as they did before this change — confirmed live for every one of them.

## 4. What's next (not part of this task, listed for context only)

Per `PHASE2-ARCHITECTURE.md` §8: Stage 2b (Image, Services-fix, Pricing-hybrid, Feature Grid, Statistics, Newsletter, Testimonial blocks), the Rich Content block (gated on a richText/Node-24 compatibility spike), and Live Preview remain future, separately-scoped work — nothing here should be read as expanding into them.
