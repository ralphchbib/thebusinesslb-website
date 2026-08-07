# Phase 5B — Migration Plan

Full mechanics for retrofitting `versions: { drafts: true }` onto the live, populated `Services` (5 records) and `Articles` (3 records) collections. This is the first phase in the project's history where drafts are added to a collection that already has public, business-relied-upon data — Pages and Case Studies both gained drafts while empty. The sequencing below is designed around that difference.

## 1. What changes at the schema level

Adding `versions: { drafts: true }` to a Payload collection produces, per the already-observed `_pages_v` precedent (Phase 4C.5):

- A new `_status` column on the base table (`cms.services`, `cms.articles`), enum-like (`"draft" | "published"`).
- A new parallel versions table (`cms._services_v`, `cms._articles_v`) mirroring every field with a `version_` prefix, plus `version__status`, `version_updated_at`, `version_created_at`, `parent_id`, `latest`.

Both are strictly **additive** — no existing column is altered or dropped by this step.

**Process:** extract Payload's own computed schema for the updated collection configs (the established "extract, verify, then apply" technique used in every prior schema-affecting phase — 4B's field-type conversions, 4C.3/4C.4/4C.5's new columns) rather than hand-writing DDL. Apply only after the extracted SQL is reviewed and matches expectations (new column + new tables only, nothing else touched).

## 2. The central open question: mapping `isPublished` onto `_status`

All 8 existing records are `isPublished: true` today (verified directly against production — see `PHASE5B-ARCHITECTURE-REVIEW.md` §3). Two live options were considered:

| Option | Description | Verdict |
|---|---|---|
| A. Retire `isPublished`, use `_status` exclusively | Matches Pages/CaseStudies/Testimonials exactly; single source of truth | **Recommended** |
| B. Keep both fields side by side | Redundant, invites drift (a document could end up `isPublished: true` + `_status: "draft"`), confusing for editors seeing two different "published" indicators | Rejected |

Option A is adopted, **but with a safety-first sequencing twist**: rather than dropping the `isPublished` column in the same change that adds `_status`, this phase:
1. Adds `_status` (additive).
2. Backfills `_status` on all 8 existing rows.
3. Switches every application read path from `isPublished` to `_status`.
4. **Leaves the now-unused `isPublished` column in the database, untouched, not read or written by any application code.**

Dropping the column is explicitly deferred to an optional future cleanup phase — see §5.

## 3. Backfill procedure

For each of the 5 Services and 3 Articles, set `_status: "published"` via Payload's Local API (`payload.update({ collection, id, data: { _status: "published" } })`), **not** a raw SQL `UPDATE` — consistent with this project's established discipline of using Payload's own write path for data changes (schema DDL is the only thing extracted/applied directly).

This is a one-time, 8-record operation. Given the small, fully-enumerated record set (verified exhaustively, not estimated), this can be scripted and run once, then the script deleted — mirroring how the verification script used during this planning phase's research was created, used, and removed without becoming part of the repo.

## 4. A specific risk unique to this migration: documents with no version-table row yet

Payload's drafts feature creates a version row in `_services_v`/`_articles_v` on save. Immediately after the schema migration, the 8 existing rows will have a `_status` value on the **base table** but **no corresponding version-table row** (since they've never been saved through drafts-aware code). Payload's `find({ draft: true })` resolution logic (`replaceWithDraftIfAvailable`) is expected to fall back to the base table's data when no version row exists — meaning "no draft in progress" correctly resolves to the current published content, not an error or empty result.

This is the one piece of behavior in this entire plan that is **not** already directly observed in this codebase (Pages/CaseStudies never had pre-existing data, so this code path has never actually been exercised here before). It must be **explicitly verified during implementation**, not assumed — call this out as validation step V-1 in `PHASE5B-VALIDATION-STRATEGY.md`, to be checked before the migration is considered complete, not after.

## 5. Deferred cleanup: dropping the `isPublished` column

Recommended as a **separate, optional, later phase** (e.g., "Phase 5B.1" or bundled into a future maintenance pass), not part of this phase's completion criteria. Rationale:
- Keeps Phase 5B's schema change purely additive, matching this project's lowest-risk pattern.
- Gives a zero-cost safety net: if the `_status` backfill or migration logic has any bug, `isPublished`'s original data is still sitting there, untouched, as a reference/recovery source.
- Makes Phase 5B's rollback (see `PHASE5B-ROLLBACK-PLAN.md`) a pure code revert with no data reconstruction needed.
- The cost of leaving one inert boolean column around temporarily is negligible; the cost of a premature, harder-to-reverse column drop is not.

## 6. Relationship-field impact during migration

None of the 5 relationship fields pointing at `services` (Architecture Review §4) need any schema change themselves — they continue to store the same integer IDs. The only behavioral question is whether Payload's relationship-population logic correctly resolves an ID to its *published* version by default once the referenced collection has drafts — already a proven, existing pattern (`CaseStudies.testimonial` → `Testimonials`, which already has drafts), and something to explicitly re-confirm for `services` specifically in validation (V-2 in the Validation Strategy), since Services' 5-way fan-in is the highest of any collection touched in this project to date.

## 7. Downtime / deployment impact

None expected. The schema change is additive; the deploy sequencing (schema push, then backfill, then code deploy reading `_status`) mirrors the exact "additive migration before code that depends on it" discipline used in Phase 4C.3–4C.5. No maintenance window required.

## 8. Migration completion checklist

- [ ] `_status` column present on `cms.services`, `cms.articles`.
- [ ] `_services_v`, `_articles_v` tables present, correctly mirroring field shape.
- [ ] All 5 Services have `_status = "published"`.
- [ ] All 3 Articles have `_status = "published"`.
- [ ] `isPublished` column still present and unmodified (safety net intact).
- [ ] No application code path still reads/writes `isPublished`.
- [ ] Draft-mode fallback behavior for pre-existing (no-version-row) documents confirmed correct (§4).
- [ ] All 5 relationship-fan-in fields still correctly resolve referenced Services (§6).
