# Phase 5C — Homepage Preview Plan

**Status:** Planning only. No code, branches, or PRs produced as part of this deliverable.
**Objective:** Convert the Homepage Global from "Save → Live" to "Draft → Preview → Publish," reusing Phase 5A/5B's preview infrastructure (PREVIEW_SECRET, Draft Mode, `/api/draft`, the Preview Banner) rather than building anything new.
**Prior art this plan builds directly on:** `PHASE5-LIVE-PREVIEW-PLAN.md` (original architecture), `PHASE5A-IMPLEMENTATION-REPORT.md`/`PHASE5A-VALIDATION-REPORT.md` (Pages/Case Studies — proved the mechanism), `PHASE5B-*.md` (Services/Articles — proved the mechanism survives a retrofit onto **live, populated** content, and surfaced two real defects worth inheriting the fixes for, see §3.5 and §9).

## 1. Architecture Review — current state, verified against the code

### 1.1 Homepage is a Global, not a Collection — the one structural difference from every prior draft-enabled document type

Confirmed via `payload/globals/Homepage.ts` and `payload.config.ts` (`globals: [SiteSettings, Homepage]`): Homepage is a **singleton** — there is exactly one document, always addressed by its global `slug: "homepage"`, never by an `id` or a URL `slug` field. Every other draft-enabled type so far (Pages, Case Studies, Services, Articles) is a Collection with N documents, each with its own `slug` and its own detail route. Homepage has:

- No `isPublished`-style field, and no publish-state concept **at all** today — confirmed via the full field list in `payload/globals/Homepage.ts` (10 tabs: Hero, Problem, Transformation, Process, Founder, Featured Services, Featured Testimonials, Featured Case Studies, Final CTA, SEO). This is a genuine difference from Phase 5B's starting point: Services/Articles at least had a boolean flag to retire; Homepage has nothing to retire, only something new to add.
- `access: { read: anyone, update: adminOrEditor }` — identical shape to Services/Articles' pre-5B config. Same latent gap Phase 5B closed (Payload's own access layer imposes no restriction; only the app's own fetch path controls what's shown) applies here too.
- `hooks.afterChange: [revalidateGlobalAfterChange]`, which calls `revalidatePath("/", "layout")` — confirmed via `payload/hooks/revalidate.ts`. This is the **broadest-blast-radius revalidation call in the codebase**: it invalidates every route under `app/(app)/layout.tsx`, not just `/`. Already accepted behavior for every Homepage save today; relevant here because a Homepage *draft* save would trigger the same site-wide cache-touch (harmless per the same "extra revalidation, no content leak" reasoning already applied to every other drafts-enabled type — see §6).

### 1.2 Payload confirms Globals support both `versions.drafts` and `admin.preview` — verified in this installed version, not assumed

Read directly from `node_modules/payload/dist/globals/config/types.d.ts`:
```ts
preview?: GeneratePreviewURL;
versions?: boolean | IncomingGlobalVersions;
```
and `node_modules/payload/dist/versions/types.d.ts`:
```ts
export type IncomingGlobalVersions = {
  drafts?: boolean | IncomingDrafts;
  max?: number;
};
```
Identical shape to the Collection version of these types, sharing the same underlying `IncomingDrafts` type Services/Articles already use (including the `validate` flag whose default-off behavior Phase 5B's implementation relied on — see §3.5). **This is not a new Payload capability being bolted on — it's the same feature, on the same document type family, already proven twice.**

### 1.3 The rendering path — `app/(app)/page.tsx` and the root layout

- `getHomepage()` (`lib/cms/homepage.ts`) currently takes **no parameters** and always calls `payload.findGlobal({ slug: "homepage", depth: 1 })` — no `draft` option, no `_status` filter (there's nothing to filter on today).
- `app/(app)/page.tsx` has no `dynamic`/`dynamicParams` export and doesn't call `isPreviewMode()` — the homepage is rendered statically today and revalidated on-demand via the `afterChange` hook, same caching model as every other CMS-backed page.
- **The Preview Banner is already wired site-wide.** Confirmed via `app/(app)/layout.tsx`: `isPreviewMode()` is called at the root layout level and `<PreviewBanner />` renders there, not per-route. This means enabling Draft Mode for a Homepage preview requires **zero new banner work** — the banner already shows on every route, including `/`, whenever Draft Mode is on. This is a direct, concrete example of "reuse the Preview Banner" being satisfied by not touching it at all.
- Draft Mode itself is already a site-wide, cookie-based flag (Next.js's own mechanism) — an editor previewing the Homepage and then clicking through to a Service page today would find that Service page **doesn't** honor Draft Mode unless that Service also happens to have an unpublished draft they're specifically checking (Services already checks `isPreviewMode()` since Phase 5B). Adding Homepage support is simply one more route starting to *honor* a flag that already exists globally — not a new cross-cutting mechanism.

### 1.4 Homepage's outbound relationships are already draft-safe — no new relationship risk

Homepage references: `heroImage`/`founderImage`/`ogImage` (Media, unversioned, no change), `servicesCards[].service` (Services — **already versioned with drafts since Phase 5B**), `testimonialsIds` (Testimonials — **already versioned with drafts since Phase 3/5A-era work**), `caseStudiesIds` (Case Studies — **already versioned with drafts since Phase 5A**). Every single relationship Homepage points at already resolves to the *published* version by default when queried without `draft: true` — this is the exact same already-proven pattern Phase 5B's own Architecture Review relied on for `CaseStudies.testimonial` → `Testimonials`. **Unlike Phase 5B, Homepage has zero new relationship-fan-in risk to validate — every dependency is already a proven, versioned collection.** (And unlike Services, nothing points *at* Homepage — it's a global, never a relationship target.)

### 1.5 Scope boundary: Site Settings is explicitly excluded

`SiteSettings` (the other Global, `payload/globals/SiteSettings.ts`) is **not in scope for Phase 5C**. It carries sitewide SEO fallbacks, footer/newsletter copy, and the Services Hub page content — a separate, even broader-blast-radius surface (it back­stops metadata for content that has none of its own). Converting it to drafts is a future, separately-scoped decision, not bundled into this plan.

## 2. Draft/Publish Workflow Design

- Payload's admin UI renders the same Save Draft / Publish control pair on a drafts-enabled **Global**'s single edit screen that it does on a Collection document's edit screen — confirmed by the shared `versions`/drafts admin component architecture (same underlying feature, not a per-document-type reimplementation). No new UX pattern for editors to learn beyond what Phase 5B already introduced for Services/Articles.
- Because Homepage has no list view (there's only one document), there's no `defaultColumns` equivalent to update — the status pill appears directly on the single edit screen's header, next to the Save Draft/Publish buttons.
- Editors gain the ability to stage a full homepage redesign — new hero copy, reordered featured services, a different founder quote, updated SEO — and review it live on the real site template before it goes public, instead of every field-level edit being instantly live sitewide. Given the homepage is the single highest-traffic, highest-visibility page on the site, this is arguably the **strongest** case for draft protection of any content type covered so far (stronger than Services/Articles, which Phase 5B already argued was a stronger case than Pages/Case Studies).
- All 10 tabs (Hero through SEO) move together as one document — there is no per-tab or per-section publish granularity, matching how the Global already behaves today (one Save affects the whole document). This is not a new constraint Phase 5C introduces; it's preserving the existing all-or-nothing save unit, just adding a draft/publish gate in front of it.

## 3. Versioning Strategy

### 3.1 Mechanism

`versions: { drafts: true }` added to `payload/globals/Homepage.ts`, identical in shape to every Collection that already has it. No `autosave` (same rationale as every other drafts-enabled type in this project: avoids unnecessary version-row churn and the associated site-wide revalidation firing on every keystroke-debounced save).

### 3.2 What Payload will add to the schema

- A `_status` column on the `cms.homepage` table (mirroring `cms.services`/`cms.articles`'s post-5B shape).
- A new `cms._homepage_v` versions table, mirroring every field with a `version_` prefix — this will be the **largest single versions table in the project so far**, since Homepage has more fields and more nested arrays (10 tabs' worth) than any individual Service or Article document. Purely a size difference, not a structural risk — the same additive, Payload-computed schema mechanism applies regardless of field count.

### 3.3 The migration problem — smaller in one way, but with a known pitfall to pre-empt this time

Unlike Services/Articles (5 + 3 pre-existing rows to backfill), Homepage has **exactly one** existing document (populated since Phase 4A). The migration is: add `_status`, set it to `"published"` on that one row, done. Structurally simpler than Phase 5B's 8-record migration.

**However — Phase 5B's implementation surfaced a real defect that directly applies here, and this time it should be pre-empted rather than discovered live:** a document whose `_status` is set via direct means (or whose version row is never created through a real draft-save) is **invisible to `draft: true` fetches**, because Payload's `find`/`findGlobal` with `draft: true` queries the versions table directly rather than falling back to the base table (confirmed by reading `node_modules/payload/dist/collections/operations/find.js` during Phase 5B; the equivalent `findGlobal` code path uses the same versions-querying logic). The Phase 5B fix — a validation-skipping draft save (`data: {}, draft: true`) followed by a single-column SQL flip from `draft` to `published` — is the exact template to reuse here for Homepage's one existing row. This is now a **known, documented pattern** rather than something to re-discover; the implementation plan for Phase 5C should apply it directly, and validation should explicitly re-test the fallback behavior as step one, not step ten.

### 3.4 Pre-flight check this plan recommends before implementation starts

Phase 5B also surfaced that `metaTitle`/`metaDescription` on 2 Services and all 3 Articles already exceeded their `maxLength` constraints (60/155), which blocks Payload's full-document validation on *publish* (though not on *draft save*, per §3.5). Homepage has the identical `metaTitle: maxLength 60` / `metaDescription: maxLength 155` constraint in its SEO tab. **Recommend checking Homepage's current `metaTitle`/`metaDescription` length before implementation begins** — a two-minute query — so that if the same issue exists here, it's known up front rather than discovered mid-migration. If it does exist, the same resolution applies: leave the content untouched (per "preserve all existing content"), and use the draft-save-then-flip technique rather than a direct publish-triggering update.

### 3.5 Why the draft-save-then-flip technique works (for whoever implements this)

Payload skips full-document validation when `isSavingDraft` is true (`draftArg` is set AND `data._status !== "published"`) and the collection/global doesn't have `versions.drafts.validate` explicitly enabled (Phase 5B confirmed via reading `node_modules/payload/dist/collections/operations/utilities/update.js`; the same `hasDraftValidationEnabled` check applies to globals). Homepage's config should **not** set `drafts.validate: true`, matching every other drafts-enabled type in this project — preserving the ability to save incomplete/in-progress work as a draft without being blocked by required-field or length validation, exactly like a real editor mid-edit would expect.

## 4. Preview Integration Strategy

### 4.1 `admin.preview` on the Global

```ts
preview: () => {
  const secret = process.env.PREVIEW_SECRET;
  if (!secret) return null;
  return `${siteConfig.url}/api/draft?secret=${secret}&collection=homepage`;
},
```
No `slug` needed — there's only one document, and the redirect target is always `/`. This is the one genuine shape difference from every Collection's `preview` function (which all key off `doc.slug`).

### 4.2 `/api/draft` route extension

The route's existing collection whitelist (currently `"pages" | "case-studies" | "services" | "articles"`) needs one more branch, but a **structurally different one** from the other four: every existing branch calls `getXBySlug(slug, true)` (a Collection lookup keyed by a `slug` query param). Homepage has no slug — the new branch should call a new `getHomepage(true)` (draft-aware) and skip the "not found" case entirely (a Global with drafts enabled always has exactly one document, once the one-time migration in §3.3 has run) — matching the pattern already used by other single-instance data, just via `payload.findGlobal` instead of `payload.find`. Redirect target is unconditionally `/`.

This is the **only piece of shared infrastructure that needs new code** — `PREVIEW_SECRET`, the session/role check, `isPreviewMode()`, `PREVIEW_ROBOTS`, and `/api/exit-draft` are all reused completely unchanged, exactly as required.

### 4.3 `getHomepage(draft)` — same plain-boolean pattern as every other drafts-aware fetcher

```ts
export const getHomepage = cache(async (draft: boolean = false): Promise<HomepageData> => {
  const payload = await getCms();
  const doc = await payload.findGlobal({
    slug: "homepage",
    draft,
    depth: 1,
  });
  ...
});
```
`getHomepage` is currently called from exactly one place, `app/(app)/page.tsx` — confirmed via grep. That call site keeps working unchanged by simply omitting the new argument, matching the exact rule already applied to `getServiceBySlug`/`getArticleBySlug`/`getPageBySlug`/`getCaseStudyBySlug`.

### 4.4 `app/(app)/page.tsx` wiring

```ts
export async function generateMetadata(): Promise<Metadata> {
  const preview = await isPreviewMode();
  const [home, settings] = await Promise.all([getHomepage(preview), getSiteSettings()]);
  const metadata = buildMetadata({ ... });
  if (preview) metadata.robots = PREVIEW_ROBOTS;
  return metadata;
}

export default async function Home() {
  const preview = await isPreviewMode();
  const [home, faq] = await Promise.all([getHomepage(preview), getFaqsByScope("global")]);
  ...
}
```
Directly mirrors the exact pattern already shipped on `app/(app)/[slug]/page.tsx` and `app/(app)/services/[slug]/page.tsx`. Calling `draftMode()` (via `isPreviewMode()`) inside a page that's otherwise statically rendered is already proven safe at scale — every SSG detail route in this project does exactly this today, and Next.js's own behavior (opt into dynamic rendering only for requests where Draft Mode is actually enabled; stay static for everyone else) is what makes this safe for the site's highest-traffic route specifically. This is explicitly called out because the homepage carries more performance stakes than any single Service/Article page — see §9.

### 4.5 The Preview Banner — genuinely zero new work

As established in §1.3, the banner is already rendered at the root layout level, gated on `isPreviewMode()`, which itself doesn't care which route triggered Draft Mode. Once `/api/draft?collection=homepage` successfully enables Draft Mode and redirects to `/`, the banner Exit Preview control (`/api/exit-draft`, also already fully generic) works with no changes at all.

## 5. Security Assessment

- **No new secret, no new authentication mechanism.** `PREVIEW_SECRET` is reused verbatim — the same environment variable, same value, same 3-layer check (secret → session → whitelist) already validated live in production twice (Phase 5A: 16/16 assertions; Phase 5B: full round-trip via the real admin UI).
- **`access.read` tightening closes the same latent gap Phase 5B closed for Services/Articles**: today, `read: anyone` means Payload's own access layer imposes zero restriction on the Homepage global — nothing currently exploits this (there's only ever one document, always published, today), but adopting `({req:{user}}) => user ? true : {_status:{equals:"published"}}` is a direct, in-kind security improvement, not merely a side effect.
- **Root-path consideration**: because Homepage renders at `/`, an editor's Draft Mode session landing on `/` after clicking Preview is the **first thing any visitor to that same browser session would see** on every subsequent page load until they exit preview — no different in kind from previewing any other page, but worth naming explicitly since `/` is the page most likely to be glanced at accidentally by someone sharing a screen or a link. `PREVIEW_ROBOTS` (`noindex, nofollow`) and the visible banner both already exist specifically to make an active preview session unmistakable and unindexable — no new control needed, just confirmation the existing ones cover the highest-visibility route too.

## 6. Validation Strategy

Standard checks (`tsc`, lint, tests, build) plus, informed directly by what Phase 5B's validation pass actually caught:

1. **V-1 equivalent, tested first, not last**: after migrating the single existing Homepage document, explicitly verify a `draft: true` fetch resolves it correctly (not `null`) — per §3.3, this is a known risk with a known fix; validation should confirm the fix was applied, not assume it.
2. **Zero-regression check on the one existing document**: full field-by-field comparison of rendered homepage HTML (hero copy, all 10 tabs' worth of content, SEO metadata, structured data) before and after migration — same discipline as Phase 5B's 8-record regression suite, scaled to Homepage's single document.
3. **Relationship resolution**: confirm `servicesCards`, `testimonialsIds`, `caseStudiesIds` all still resolve to their published counterparts post-migration (expected to pass trivially per §1.4, but confirmed rather than assumed, matching this project's standing discipline).
4. **Draft isolation**: stage a real draft edit (e.g., a temporary, clearly-marked headline change) on the live Homepage document, confirm the public `/` is unaffected, confirm the draft is visible only via the real `admin.preview` → `/api/draft` → banner flow (ideally via an actual authenticated browser session against the real admin UI, exactly as Phase 5B's release review ultimately did — that method proved itself the most trustworthy, since it never requires knowing or reconstructing `PREVIEW_SECRET` outside the app itself), then revert.
5. **Performance sanity check**: confirm the public (non-preview) homepage remains statically served/cached — i.e., that adding `isPreviewMode()` to `page.tsx` didn't inadvertently make the page dynamic for *everyone*, only for actual preview sessions. This is specific to Homepage's root-route, highest-traffic status and doesn't have a direct precedent check in Phase 5A/5B's validation (their SSG detail pages are lower-traffic than `/`).
6. **Sitewide revalidation confirmation**: confirm a Homepage *publish* (not draft save) still correctly invalidates the cached `/` route via the existing `revalidateGlobalAfterChange` hook, and that a *draft* save does not make stale published content disappear from the public site in the interim (same "hooks fire on draft saves too, harmlessly" pattern already accepted project-wide).

## 7. Rollback Strategy

Directly inherits Phase 5B's rollback design, adapted for a Global:

- Since Homepage has no pre-existing publish-state field to preserve (unlike `isPublished`), there is no equivalent "keep the old field untouched" safety net available here — but the risk it protected against doesn't apply either, since there's no legacy code path reading a boolean flag to fall back to.
- Rollback is a `git revert` of the code change (removing `versions.drafts`, the `access.read` gate, the `draft` param on `getHomepage`, and the `/api/draft` branch). The **schema** (`_status` column, `_homepage_v` table) is left in place, orphaned but harmless — matching this project's established "tolerate an orphaned additive schema element rather than force a symmetric down-migration" precedent (Phase 4B, Phase 5B).
- Because the single Homepage document's `_status` will be `"published"` immediately after migration (§3.3) and stays that way unless an editor explicitly saves a draft, a revert at any point restores the exact pre-5C behavior: every save goes live immediately, reading the same (unversioned-by-old-code, still-present) row.
- If a draft was actively in progress at the moment of rollback, that in-progress draft is not lost (it's still sitting in `_homepage_v`) but becomes inaccessible via the old, reverted code — an acceptable, disclosed tradeoff, matching how this project has always treated in-flight editorial work during an emergency rollback (rare enough, and recoverable by a human re-entering the change once forward-fixed).

## 8. Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | The one existing Homepage document becomes inaccessible via `draft: true` after migration (the known Phase 5B-class defect) | Low (now a known, documented fix — §3.3) | High if unmitigated (breaks Preview for the homepage specifically) | Apply the draft-save-then-flip technique proactively; validate first, not last (§6.1) |
| R2 | Pre-existing `metaTitle`/`metaDescription` already exceed `maxLength`, blocking a real publish-triggering update | Unknown until checked (§3.4) | Medium (blocks re-publishing until fixed, doesn't affect the public page) | Explicit pre-flight length check before implementation begins |
| R3 | Adding `isPreviewMode()` to the homepage route inadvertently makes it dynamic for all visitors, not just previewers | Low (Next.js's own behavior already proven safe on every other SSG route in this project) | High if it happened (homepage is the highest-traffic route; losing static caching there has real performance cost) | Explicit performance-sanity validation step (§6.5), unique to this phase given the homepage's traffic profile |
| R4 | `access.read` tightening has some unforeseen interaction with a caller that currently relies on `anyone` (e.g., an unauthenticated build-time or ISR fetch) | Very low (identical change already made safely for 4 other types) | Medium | Same validated pattern, re-confirmed for this specific route during validation |
| R5 | Site-wide revalidation (`revalidatePath("/", "layout")`) firing on Homepage draft saves | Certain, already true today for every Homepage save | Very low (already-accepted, harmless — no content leak, just a cache-invalidation call) | No new mitigation needed, same as every other drafts-enabled type |
| R6 | Editorial confusion — editors used to "Save = Live" for Homepage specifically now need to remember to Publish | Medium (same as Phase 5B's R10) | Low–Medium (arguably higher stakes than Services/Articles given Homepage's visibility, but same nature of risk) | Editor communication, same recommendation as Phase 5B §5 |

**Overall risk posture: low, comparable to Phase 5B post-implementation.** The single largest source of risk (R1) already has a proven fix on record from Phase 5B; the one genuinely new risk class this phase introduces (R3, homepage-specific performance) has a direct, already-proven mitigation pattern from every other SSG route in the project, just not yet exercised on the highest-traffic one specifically.

## 9. Effort Estimate

| Workstream | Estimate | Notes |
|---|---|---|
| Schema extraction + migration + backfill (1 document) | 1–1.5 h | Simpler than Phase 5B's 8-record migration, but apply the known draft-save-then-flip fix proactively rather than discover it live |
| Pre-flight `metaTitle`/`metaDescription` length check | 0.25 h | New, cheap, recommended step (§3.4) |
| Global config changes (`versions`, `access.read`, `admin.preview`) | 0.75 h | Same shape as Phase 5B, one document instead of two collections |
| Data-layer change (`draft` param on `getHomepage`) | 0.5 h | Single function, not two |
| Page-level wiring (`isPreviewMode`/`PREVIEW_ROBOTS` on `app/(app)/page.tsx`) | 0.5 h | Same pattern as 4 prior routes |
| `/api/draft` route extension (new global-shaped branch) | 0.5 h | Slightly different code shape (no slug) than the 4 existing branches |
| Validation (regression, draft isolation, relationship checks, **homepage-specific performance check**) | 2–2.5 h | Includes the one genuinely new check class (R3) |
| Reports (implementation + validation, following this project's standing format) | 1 h | |
| **Total** | **~7–7.5 h** | Smaller than Phase 5B's ~11.5–13h, mainly because there's one document instead of eight and no relationship-fan-in to re-verify from scratch |

## 10. Recommended implementation sequence

1. Pre-flight: check Homepage's current `metaTitle`/`metaDescription` lengths (§3.4).
2. Extract Payload's computed schema for `_status` + `_homepage_v`; apply (additive only).
3. Backfill the one existing document's `_status` to `"published"` using the draft-save-then-flip technique from the start (§3.3), not as a reactive fix.
4. Add `versions.drafts`, `access.read` gate, `admin.preview` to `payload/globals/Homepage.ts`.
5. Add `draft` parameter to `getHomepage`.
6. Wire `isPreviewMode()`/`PREVIEW_ROBOTS` into `app/(app)/page.tsx`.
7. Extend `/api/draft`'s whitelist with the `homepage` (global-shaped) branch.
8. Full validation, in the order given in §6 (draft-fallback check first).
9. Reports, PR — held for explicit approval before merge, per standing project workflow.

## 11. Business and technical impact summary

**Business impact**: the single highest-visibility page on the site gains the same staging safety net Services/Articles gained in Phase 5B — reduces the risk of a visibly-wrong homepage (broken layout, wrong pricing anchor, a founder quote mid-edit) ever reaching a real visitor, at the cost of one extra click (Publish) editors must remember to take.

**Technical impact**: one new column, one new (larger-than-average) versions table, fully additive. No change to any other Global, Collection, or route. No new secret, no new authentication surface, no new revalidation pattern. The one genuinely novel technical element — confirming a statically-rendered, highest-traffic route stays static for non-preview visitors after gaining `isPreviewMode()` — is a validation step, not a new mechanism.

## 12. Final recommendation

**Proceed.** This phase is lower-risk and lower-effort than Phase 5B: it inherits two hard-won, already-solved technical lessons (the draft-fallback defect and its fix; the maxLength pre-existing-content gotcha) as known quantities to design around from the start rather than discover mid-implementation, and it has zero new relationship-fan-in risk (every dependency Homepage points at is already a proven, versioned collection). The one genuinely new consideration — protecting the homepage's static-rendering performance for non-preview visitors — has a direct, already-proven mitigation already exercised on four other routes in this project. Recommend implementing as its own phase (5C), sequenced after this plan's explicit approval, following the same plan → implement → validate → report → PR → await-approval workflow used for every prior phase.
