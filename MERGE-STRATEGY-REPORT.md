# Phase 4C — Merge Strategy Report

Analysis only, per explicit instruction: no code written, no branch created, no merge performed. Findings are based on direct `git diff`/`git merge-base` inspection of all 7 pushed branches against `origin/main` (`8e18a51`), not recollection.

## 1. Branch dependency graph

```
                                   origin/main (8e18a51)
                                          |
        ┌──────────┬──────────┬──────────┼──────────┬──────────┬──────────┐
        │          │          │          │          │          │          │
     4C.1        4C.2       4C.3       4C.4       4C.5       4C.6       4C.7
  site-settings  website+   services   articles   pages      breadcrumb  ai-search
  seo-defaults   faq-gap    og-image   og-image+  og-image+  completion  readiness
                                        schema     noindex
```

**All 7 branches are siblings, not a chain.** `git merge-base origin/main origin/feat/phase4c-N-*` returns `8e18a5126ac434e9a7d2fd1026ca833981948e9e` — main's current tip — for every one of the 7 branches, with no exceptions. None was created from another 4C branch; each was checked out fresh from `main` independently, exactly as `SEO-IMPLEMENTATION-SEQUENCE.md`'s "each sub-phase independently shippable" design called for.

This means: **no branch functionally requires another to build or pass validation.** I confirmed this empirically, not just by construction — each branch's own diff against `main`, taken alone, was separately validated (`tsc`/lint/test/`next build`, 31/31 routes) at the time it was built. A functional dependency would show up as a build failure; none did.

What *does* exist is **textual overlap** — several branches edit the same file, sometimes the same lines, because they touch the same shared plumbing (`generateMetadata()` calls, `lib/seo/schema-org.ts`, `lib/cms/types.ts`). That is a **merge-conflict risk**, not a build dependency, and the two are easy to conflate — the rest of this report keeps them distinct.

## 2. Does 4C.2 contain 4C.1's changes?

**No.** `feat/phase4c-2-website-schema-faq-gap`'s diff against `main` does not include any of 4C.1's field additions to `SiteSettings`, `lib/cms/site-settings.ts`, or the `organizationSchema()` signature change. Confirmed via `git diff --name-only origin/main origin/feat/phase4c-2-website-schema-faq-gap` — the file list contains none of 4C.1's touched files except two incidental overlaps (`app/(app)/page.tsx` and `lib/seo/schema-org.ts`), and in both cases 4C.2's diff is against **unmodified `main` content**, not against 4C.1's version of those files. 4C.2 was built and validated against `main` exactly as it stands today, with no knowledge of 4C.1's edits.

## 3. Does 4C.3 contain 4C.1 + 4C.2's changes?

**No**, same finding. `feat/phase4c-3-services-og-image`'s merge-base with `main` is `main`'s own tip, not any commit on `feat/phase4c-1-*` or `feat/phase4c-2-*`. Its diff touches `app/(app)/services/[slug]/page.tsx`, `content/services/types.ts`, `lib/cms/services.ts`, `lib/cms/types.ts`, `payload/collections/Services.ts` — none of it layered on top of 4C.1 or 4C.2's work. Notably, `app/(app)/services/[slug]/page.tsx`'s `generateMetadata()` in 4C.3 still reads as if 4C.1 never happened — it doesn't fetch Site Settings or reference `settings.defaultOgImage` at all, only `service.ogImage`. This is a real, verified textual conflict (detailed in §5below), not a hidden dependency.

## 4. Does 4C.4 contain all prior changes?

**No**, same pattern again. `feat/phase4c-4-articles-og-image-schema` branches from `main`'s tip, not from 4C.1/4C.2/4C.3. Its `app/(app)/insights/[slug]/page.tsx` diff replaces the inline Article JSON-LD with a call to the new `articleSchema()`, and adds `ogImage: article.ogImage` — again with no awareness of 4C.1's `settings.defaultOgImage` fallback, which was also added to this exact same file, at the exact same insertion line, in the 4C.1 branch.

**General finding for all 7**: none of the later sub-phases (4C.2 through 4C.7) contain any of the others' changes. Every branch is exactly `main` plus that one sub-phase's own diff — confirmed for all 7 via `git diff --name-only`, not sampled.

## 5. Concrete file-level conflict map

Cross-referencing every file touched by more than one branch (16 files total; 12 are single-branch and will merge with zero conflict):

| File | Branches | Conflict? | Detail |
|---|---|---|---|
| `app/(app)/services/[slug]/page.tsx` | 4C.1, 4C.3 | **Real conflict** | Both insert an `ogImage:` line at the identical position inside `generateMetadata()`'s `buildMetadata()` call — 4C.1 writes `ogImage: settings.defaultOgImage`, 4C.3 writes `ogImage: service.ogImage`. Git will flag this as a conflicting hunk; a human (or the integrator) needs to combine them into `service.ogImage ?? settings.defaultOgImage` — the fallback chain the plan always intended, just split across two branches. |
| `app/(app)/insights/[slug]/page.tsx` | 4C.1, 4C.4 | **Real conflict** | Identical shape to the above: `ogImage: settings.defaultOgImage` (4C.1) vs `ogImage: article.ogImage` (4C.4) at the same line. 4C.4 additionally rewrites the page's JSON-LD block and import list in a region 4C.1 doesn't touch — that part merges cleanly; only the one `ogImage:` line conflicts. |
| `app/(app)/[slug]/page.tsx` (Pages catch-all) | 4C.1, 4C.5, 4C.6 | **Real conflict** (4C.1 × 4C.5) + likely-clean addition (4C.6) | 4C.1 and 4C.5 both restructure `generateMetadata()`'s return statement — 4C.1 changes `const page = await getPageBySlug(slug)` into a `Promise.all` fetch and adds `ogImage: settings.defaultOgImage`; 4C.5 changes the `return buildMetadata({...})` into `const metadata = buildMetadata({...}); if (page.noindex) {...}; return metadata;` and adds `ogImage: page.ogImage`. These overlap on multiple adjacent lines, not just one — the messiest conflict of the four. 4C.6 only touches the import list and the default-export body (unrelated region to `generateMetadata()`), so it should apply cleanly against whichever of 4C.1/4C.5 is merged first, though its import-line insertion sits close enough to 4C.1's to warrant a quick visual check rather than blind trust. |
| `app/(app)/services/page.tsx` (hub) | 4C.2, 4C.6 | **Real conflict** | Both insert a new import on the same line (`faqSchema` vs `breadcrumbSchema`, right after the `buildMetadata` import) and both insert a new `<script>` JSON-LD block at the identical JSX position — immediately after `<>` and before `<Breadcrumb items={[{ name: "Services" }]} />`. Combine into two sibling `<script>` tags (or one array-mapped block, matching the homepage's existing pattern from 4C.2) plus both imports. |
| `app/(app)/page.tsx` (homepage) | 4C.1, 4C.2 | Likely clean | 4C.1 only touches `generateMetadata()`; 4C.2 only touches the import list (a different line, with unchanged context lines between the two insertion points) and the default-export body. No identical line touched by both — should auto-merge, but worth a build check after combining since the two import insertions land close together. |
| `lib/seo/schema-org.ts` | 4C.1, 4C.2, 4C.4 | Likely clean | 4C.1 modifies `organizationSchema()`'s body (lines ~1–25); 4C.2 inserts `websiteSchema()` immediately after `organizationSchema()`'s closing brace — adjacent to, but not overlapping, 4C.1's edit; 4C.4 inserts `articleSchema()` much further down (after `personSchema()`, before `caseStudySchema()`), with zero proximity to the other two. The 4C.1 × 4C.2 adjacency is the only one worth double-checking after combining. |
| `lib/cms/types.ts` | 4C.1, 4C.3, 4C.4, 4C.5 | Clean | Four different interfaces (`PayloadSiteSettingsDoc`, `PayloadServiceDoc`, `PayloadArticleDoc`, `PayloadPageDoc`) at four well-separated line numbers (123, 50, 74, 261 respectively, in the pre-change file). No shared lines — this file will combine without any conflict despite four branches touching it. |

**Files touched by exactly one branch** (no conflict by definition): `payload/globals/SiteSettings.ts`, `lib/cms/site-settings.ts`, `app/(app)/layout.tsx`, `app/(app)/case-studies/[slug]/page.tsx` (4C.1 only); `app/(app)/contact/page.tsx`, `app/(app)/pricing/page.tsx` (4C.2 only); `payload/collections/Services.ts`, `content/services/types.ts`, `lib/cms/services.ts` (4C.3 only); `payload/collections/Articles.ts`, `content/insights/types.ts`, `lib/cms/articles.ts` (4C.4 only); `payload/collections/Pages.ts`, `lib/cms/pages.ts` (4C.5 only); `app/(app)/case-studies/page.tsx`, `app/(app)/insights/page.tsx` (4C.6 only); `app/robots.ts`, `public/llms.txt` (4C.7 only — the only sub-phase with **zero** file overlap with any other branch).

## 6. A relevant operational fact: the database is already fully cumulative

Separately from the code/branch analysis above: every sub-phase's schema change was applied to the **same shared development database** during this initiative's build-and-validate process (documented in each sub-phase's own implementation report — the dev-mode schema-push workflow, plus targeted SQL for 4C.3/4C.4/4C.5 after a schema-push false-positive). That means the live database already has all 7 sub-phases' columns applied simultaneously, even though the *code* on any individual branch only reflects one sub-phase. This doesn't change the merge-conflict analysis above, but it does mean: whichever merge strategy is chosen, no *new* schema-push work is needed to bring the database in line with the fully-merged code — it's already there.

## 7. Merge strategy recommendation

**Recommend: B — create an integration branch containing 4C.1–4C.7.**

Reasoning:

- **The conflicts are real but small and already fully mapped** (§5): 4 files, each with a clearly-understood, correctly-resolvable conflict (in 3 of the 4 cases, a single line combining two fallback values the plan always intended to combine — e.g. `service.ogImage ?? settings.defaultOgImage`). This is not a large or risky integration; it's a known, bounded set of mechanical combinations.
- **Option A (merge sequentially) doesn't avoid the conflicts — it just spreads them out** across up to 5 separate PR-merge events (4C.1 first is conflict-free into `main`, but 4C.2 into `main`-plus-4C.1 hits the `schema-org.ts`/`page.tsx` adjacency, 4C.3 into that hits the `services/[slug]` conflict, and so on). Each of those merge points would need its own careful review and its own full `tsc`/lint/test/build re-validation of the *combined* result — effectively doing the integration-branch work anyway, just six times over, in the GitHub merge UI, with less room to test the full combination before anything lands in `main`.
- **Option C (rebase all branches before opening PRs) doesn't help here.** Rebasing only replays commits on top of a new base — it doesn't resolve the fact that 4C.3/4C.4/4C.5/4C.6 were written without knowledge of 4C.1's/4C.2's overlapping lines. Rebasing each branch onto an already-updated `main` (after the prior one merges) is mechanically the same operation as sequential merging with conflict resolution — it doesn't reduce the number of conflict-resolution touchpoints, just renames the git operation used to hit them.
- **An integration branch lets every conflict be resolved exactly once**, side by side, with the full intended end-state visible (e.g., seeing both 4C.1's and 4C.3's `ogImage:` lines at the same time makes the correct `??` combination obvious, whereas resolving them across two separate sequential PR merges risks the second resolution being done without full context of the first). It also allows **one comprehensive validation pass** (`tsc`/lint/test/`next build`, 31 routes) over the fully-combined 4C.1–4C.7 result before any of it touches `main` — matching this initiative's own established discipline of validating before merging, applied once to the true final state instead of 5–7 times to intermediate ones.
- This also matches §6: since the database is already fully cumulative, an integration branch's code will finally match what the database has had applied to it all along — sequential merging would instead pass through several intermediate states where the code and the (already-ahead) database schema are temporarily mismatched by design.

**What this does not decide** (out of scope for this analysis-only report, and not undertaken here since no code/merge was authorized): the exact resolution text for each of the 4 conflicting files, and whether the integration branch ships to `main` as one squashed PR or is opened as its own reviewable PR before a final merge. Both are natural next steps once this strategy is approved.
