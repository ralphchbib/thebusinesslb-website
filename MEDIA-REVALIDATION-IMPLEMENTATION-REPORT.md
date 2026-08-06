# Phase 4B.2 — Media Revalidation: Implementation Report

Based on `MEDIA-REVALIDATION-GAP-REVIEW.md` (analysis-only review, approved before implementation). Branch: `fix/media-revalidation` (off `main` @ `6127bde`, the commit currently live in production with the `remotePatterns` incident fix merged).

## The fix — one file, three lines

`payload/collections/Media.ts`:

```diff
+import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";
 ...
+  hooks: {
+    afterChange: [revalidateAfterChange],
+    afterDelete: [revalidateAfterDelete],
+  },
```

Exactly the pattern already used by `Testimonials.ts` and `CaseStudies.ts` — same two hook functions, same import path, same reasoning (a resource referenced from an unbounded number of places elsewhere can't practically be traced to specific pages, so site-wide revalidation is the correct, already-established tradeoff, not a new one). No new revalidation infrastructure was introduced, per the explicit requirement — `payload/hooks/revalidate.ts` itself is untouched.

## Files changed

| File | Change |
|---|---|
| `payload/collections/Media.ts` | +1 import, +1 `hooks` block (4 lines), +1 doc-comment paragraph explaining the reasoning (matching every other collection's convention of explaining non-obvious hook choices inline) |

No other file was touched. No schema change, no data migration, no new dependency.

## Why this specific fix and not an alternative

Considered and rejected during the prior review (`MEDIA-REVALIDATION-GAP-REVIEW.md` §3): a narrower, per-reference revalidation (only invalidate the specific pages that use a given Media document) would require a reverse-lookup this schema doesn't maintain, with real risk of missing a path — the identical risk `revalidate.ts`'s own top-of-file comment already argues against for this exact shape of problem. Reusing the existing site-wide hook is the same tradeoff already made twice before in this codebase, not a new one being introduced for Media specifically.

## Testing performed

Full detail in `MEDIA-REVALIDATION-VALIDATION.md`. Summary: `tsc`/`lint`/`test`/`build` all pass clean; a live edit-only-the-Media-document test (via Payload's Local API, editing `alt` text without touching any referencing document) directly confirmed `revalidateAfterChange` executes — the stack trace names the hook explicitly — and a rebuild confirmed the changed value correctly appears in the rendered homepage output, closing the loop end-to-end. Full regression sweep clean; test data reverted; database confirmed back to its pre-test state.

## Risks

Minimal, and strictly a subset of risks already accepted for Testimonials/Case Studies' identical hook usage — this changes nothing about the hook's own behavior, only adds one more collection to its existing set of callers. The one Media-specific consideration: Media saves may now be marginally more frequent going forward if editors treat "swap a photo" as a routine, low-friction action (exactly the workflow Phase 4B was built to enable) — each one now triggers a full-layout revalidation, same cost profile already accepted for Services/Testimonials/Case Studies saves.

## Rollback plan

`git revert` the fix commit — removes the `hooks` block and import, restoring Media to its pre-4B.2 (no-revalidation) state exactly. Zero data or schema involvement; a pure code revert with no additional steps, identical in shape to the `remotePatterns` incident fix's own rollback plan.
