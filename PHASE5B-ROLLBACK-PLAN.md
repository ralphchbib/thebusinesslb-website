# Phase 5B — Rollback Plan

## 1. Why rollback is low-risk in this phase, by design

The migration plan (`PHASE5B-MIGRATION-PLAN.md` §5) deliberately **defers dropping the `isPublished` column**. As a direct consequence, at every point during and after this phase's rollout, `isPublished`'s original data remains present and untouched in the database. This single sequencing decision is what keeps rollback a pure code operation rather than a data-reconstruction exercise.

## 2. Rollback scenarios

### Scenario A — Issue found before the schema migration is applied
No action needed. Nothing has changed yet.

### Scenario B — Issue found after schema migration + backfill, before code deploy
The new `_status` column, `_services_v`/`_articles_v` tables, and backfilled values exist, but application code still reads `isPublished` (deploy hasn't happened). Public site is completely unaffected — no rollback needed; simply pause before deploying the code that reads `_status`.

### Scenario C — Issue found after code deploy (application now reads `_status`)
1. `git revert` the merge commit (standard project practice — never force-push, never delete branches without authorization).
2. Redeploy the reverted code. Application code reverts to reading `isPublished`, whose original values were never modified — the 8 existing records immediately resume behaving exactly as they did before this phase, with no data loss.
3. The new `_status` column and `_services_v`/`_articles_v` tables become orphaned but harmless — identical precedent to how this project has already tolerated orphaned/unused columns in prior phases rather than treating every schema addition as requiring a symmetric down-migration.
4. No `isPublished` value needs to be reconstructed, because it was never overwritten.

### Scenario D — Issue found specifically in preview/draft functionality, not the public site
Given `access.read` still requires `_status: "published"` for anonymous reads, any bug here is contained to authenticated/preview flows and cannot leak draft content publicly. Rollback of just the preview-related code (the `/api/draft` whitelist extension, `admin.preview` config) can be done independently of the `_status` migration if the two are found to be separable causes — investigate root cause before choosing full vs. partial rollback.

## 3. What would make rollback harder (and why this plan avoids it)

If a future cleanup phase drops the `isPublished` column (the explicitly deferred step in the Migration Plan), rollback after that point would require reconstructing `isPublished` values from `_status` (a simple reverse mapping: `_status = "published"` → `true`, `_status = "draft"` → `false`) before old code could run again. This is why that column drop is recommended as a **separate, later, optional phase** — only after Phase 5B has run in production long enough to be confident no rollback will be needed, decoupling "ship drafts" risk from "clean up the old field" risk.

## 4. Rollback authority

Per standing project workflow, rollback of a merged and deployed change follows the same authorization boundaries as any production action: reverting code and redeploying requires the same approval discipline already established (no autonomous merge/deploy without explicit go-ahead). This plan documents the mechanics; execution still requires the user's authorization at the time, consistent with every prior phase in this project.

## 5. Rollback validation

After any rollback, re-run the same 8-record regression suite defined in `PHASE5B-VALIDATION-STRATEGY.md` §3 to confirm the public site has fully returned to its pre-Phase-5B behavior — rollback is not considered complete until that suite passes again.
