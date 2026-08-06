# Engineering Review — Media Collection Revalidation Gap

Analysis only, per explicit instruction — no code written, no PR opened. Findings grounded in the actual current source (`payload/collections/Media.ts`, `payload/hooks/revalidate.ts`, and every collection that consumes `Media`), not assumption.

---

## 1. Root cause analysis

**Confirmed**: `payload/collections/Media.ts` has no `hooks` field at all — no `afterChange`, no `afterDelete`. Every other collection in this project does:

| Collection | Hook |
|---|---|
| Services, Articles, FAQs, Navigation | `revalidateAfterChange` / `revalidateAfterDelete` (site-wide) |
| Testimonials, Case Studies | Same site-wide hooks, explicitly reused for a documented reason (see below) |
| Pages | `revalidatePageAfterChange` / `revalidatePageAfterDelete` (page-scoped, different reasoning — Pages own a single URL, the others don't) |
| Site Settings, Homepage | `revalidateGlobalAfterChange` (site-wide) |
| **Media** | **none** |

**This is an omission, not a deliberate design decision.** Nothing in `PHASE4B-MEDIA-LIBRARY-PLAN.md`, `MEDIA-ARCHITECTURE.md`, or `PHASE4B-IMPLEMENTATION-REPORT.md` discusses revalidation for Media at all — every other collection's hook choice is explicitly reasoned about in its own file's comments (e.g., Testimonials.ts: *"Testimonials don't own a single URL the way a Page does — the same testimonial can appear on many service pages and landing pages simultaneously, so precisely tracking which pages reference a given testimonial isn't practical"*), and no equivalent reasoning exists anywhere for Media. It was simply not carried over when the collection was built.

**Why it's easy to have missed**: Media is the one collection in this project that is never displayed *directly* — it only ever appears indirectly, through another document's relationship field (`Homepage.heroImage`, `Testimonials.logo`, etc.). Every other collection's hook was added at the same time the collection itself was built and was tested by publishing that collection's own content. Media was validated (Phase 4B implementation) primarily through direct file-serving/rendering checks and through the *referencing* documents' own saves — which happened to also revalidate correctly, masking the gap in Media's own hook coverage during that testing.

---

## 2. Impact assessment

### Scope — every current image surface on the site

Media is referenced from: `Homepage.heroImage`, `Homepage.founderImage`, `Homepage.ogImage`, `Testimonials.logo`, `CaseStudies.featuredImage`, `CaseStudies.gallery[].image`. This is currently **100% of the site's image-bearing fields** — there is no image anywhere on the site that this gap doesn't potentially touch.

### Exactly when it bites

**Not** every Media edit — only the specific sequence of *editing or deleting a Media document without also re-saving whatever references it*. If an editor edits the Homepage global itself (any field, not just the image), Homepage's own hook fires and revalidates everything currently on the homepage, including whatever Media it currently references — masking the gap. The gap is invisible until an editor does the single most natural-seeming thing in a media library: open the Media collection directly and replace a file or fix its alt text, without touching the page that uses it.

**This is not a rare edge case — it's the primary, intended workflow of a reusable media library.** The whole point of Phase 4B (§2 of `PHASE4B-MEDIA-LIBRARY-PLAN.md`, "reuse, not just upload") was to let an editor swap an image in one place and have it update everywhere it's used. Right now, that specific action — the feature's own headline capability — is exactly the one that doesn't trigger a visible update.

### Severity

- **Not data loss.** The database is always correct; `Media(id: X).url` reflects the current file the moment it's saved (confirmed in the recent incident's own investigation — the Media API always served current data).
- **User-facing and confusing, but self-healing.** Any subsequent edit to the referencing document (or a redeploy) revalidates and shows the correct current image. The failure mode is "I fixed it and it still looks wrong," not permanent breakage.
- **Directly relevant to why the recent incident's timeline was confusing.** Not the cause of either the Blob-token incident or the `remotePatterns` incident (both independently root-caused and fixed) — but this gap is exactly the kind of thing that would produce a similar-looking "I changed it, why isn't it showing" report in the future, for a genuinely different reason each time. Left unfixed, it's a standing source of confusable, hard-to-diagnose reports.

### Likelihood

Moderate-to-high, ongoing. Every future testimonial-logo replacement, case-study-image swap, or homepage-photo update that doesn't happen to *also* touch the referencing document will silently fail to appear until something else revalidates it.

---

## 3. Recommended fix

**Add `hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] }` to `Media.ts`, importing both from the existing `payload/hooks/revalidate.ts` — zero new hook code.**

This is the same site-wide hook Testimonials and Case Studies already use, and for the identical underlying reason, stated more strongly for Media than for either of them: a single Media document can be referenced from an arbitrary, unbounded number of places across every collection that has an upload field, with no practical way to enumerate "which pages currently use this specific image" at hook-execution time. Site-wide revalidation (`revalidatePath("/", "layout")`) is the same broad-but-correct tradeoff this codebase already made twice before for exactly this "reused everywhere, can't be traced" shape of problem — not a new pattern being introduced, just the existing one applied to the one collection that was missed.

**Why not a narrower, more targeted revalidation instead**: would require tracking every relationship *into* Media from every other collection (a reverse-lookup this project's schema doesn't maintain) and revalidating each specific referencing page — meaningfully more complex, with real risk of missing a path (the exact risk `revalidate.ts`'s own top-of-file comment already argues against for this class of problem), to save invalidating a cache that regenerates on next request anyway at effectively no user-facing cost.

---

## 4. Implementation effort

Small — this is a two-line functional change reusing an already-proven pattern, not new engineering.

| Step | Estimate |
|---|---|
| Add the hook import + wiring to `Media.ts` | 5 min |
| `tsc`/`lint`/`build` | 10 min |
| Live verification: edit an existing Media document (e.g., alt text or a file replace) without touching the referencing document, confirm the referencing page revalidates without a manual resave | 15–20 min |
| Short implementation note (not a full phase report — see §5) | 10 min |
| **Total** | **~45 minutes** |

No schema change, no data migration, no new dependency — this is the smallest-scoped fix of anything touched across Phase 4B or its two follow-up incidents.

---

## 5. Phase 4B.2 or Phase 4C

**Phase 4B.2 — a small, scoped patch, not a new roadmap phase.**

Reasoning: this is a gap in Media's *own* implementation from Phase 4B, not a new capability. It belongs to Phase 4B's own scope by definition (§A of the original brief — "Media collection" — this is literally the collection's own missing revalidation coverage, not an adjacent concern). Phase 4C, by the naming convention this project has used throughout (each phase = a new user-facing capability — Homepage CMS, Media Library, and per the roadmap in `POST-PHASE4A-PRODUCTION-ACCEPTANCE-REVIEW.md`, next up is Live Preview / Advanced Page Builder / Search / Team Workflows), would misrepresent a mechanical two-line fix as new scope-worthy work.

This also matches how the two prior Media-related issues were actually handled in practice: both the Blob-token gap and the `remotePatterns` bug were resolved as small, immediately-actioned fixes on their own short-lived branches (`fix/homepage-image-remote-pattern`), not folded into a formally re-numbered phase. Recommend the same treatment here — a small fix branch, its own short PR, reviewed and merged (or bundled with the still-open `remotePatterns` PR #6 if that hasn't merged yet, since both are Media-related fixes touching disjoint files with no conflict risk) — rather than opening a new "Phase 4B.2" planning cycle with its own multi-document report suite. The label "4B.2" is right for *tracking/reference purposes* (this review's own filename reflects that); it doesn't need the full ceremony a numbered phase like 4B or 4C gets in this project's established process.
