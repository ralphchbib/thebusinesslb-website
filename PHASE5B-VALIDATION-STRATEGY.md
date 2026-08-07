# Phase 5B — Validation Strategy

## 1. Standard checks (baseline, every phase)

- `tsc` (typecheck)
- Lint
- Test suite
- Production build

## 2. Migration-specific checks (new to this phase — see `PHASE5B-MIGRATION-PLAN.md`)

- **V-1 — Draft-mode fallback for pre-existing documents.** Confirm that a `draft: true` fetch of one of the 8 existing records — which, immediately post-migration, has a `_status` on the base table but no corresponding `_services_v`/`_articles_v` row — correctly falls back to the base table's published content rather than erroring or returning empty. This is the one code path in this phase with no prior in-repo precedent (Pages/CaseStudies never had pre-existing data); must be verified directly, not assumed.
- **V-2 — Relationship fan-in resolution.** For each of the 5 fields identified in the Architecture Review §4 (`Services.relatedServices`, `Articles.relatedServices`, `CaseStudies.servicesUsed`, `FAQs.service`, `Homepage.servicesCards[].service`), confirm the referenced Service still renders correctly (name, link, content) after Services gains drafts. Specifically confirm these resolve to the *published* version by default (no `draft: true` leaking into unrelated queries).
- **V-3 — Migration checklist.** All 8 items in `PHASE5B-MIGRATION-PLAN.md` §8 confirmed complete.

## 3. Regression suite — the 8 existing live records (new emphasis for this phase)

For **each** of the 5 Services and 3 Articles, compare pre-migration vs. post-migration:
- Rendered page content (full text parity — no truncation, no missing sections).
- `metaTitle` / `metaDescription` output in `<head>`.
- Open Graph tags (`og:title`, `og:description`, `og:image` where set).
- Twitter Card tags.
- Structured data: `serviceSchema()` output for Services, `articleSchema()` output for Articles — byte-for-byte JSON-LD comparison.
- Canonical URL.
- HTTP status (200, not 404/500).
- Presence in `sitemap.xml`.
- Presence in `getPublishedServiceSlugs`/`getPublishedArticleSlugs` output (confirms list-query call sites were correctly migrated off `isPublished` — directly covers Risk R6).

This is the single most important validation category in this phase — it is the direct test of "zero content regression on live data," the concern the user explicitly flagged as top priority.

## 4. Draft/preview isolation checks (same methodology as Phase 5A's proven live test)

- Create one test-only draft Service and one test-only draft Article (not published).
- Confirm: **not** visible to an anonymous visitor (direct URL, sitemap, listing pages).
- Confirm: **visible** via the real `admin.preview` → `/api/draft` flow, with the preview banner shown and `noindex,nofollow` applied.
- Confirm: **not** visible again after `/api/exit-draft`.
- Delete the test records after validation (leaving no test data behind in production) — mirroring the exact "create, verify, remove" discipline already used for Phase 5A's live validation and for this planning phase's own database-inspection script.

## 5. Security validation (extends Phase 5A's already-passing suite)

- No secret → 401.
- Wrong secret → 401.
- Correct secret, no session → 401 (proves the session check, not just the secret check, gates access — same methodology already used in Phase 5A's production validation).
- Correct secret, valid session, non-editor role (if applicable) → confirm role gating still holds.
- Direct REST/GraphQL query for a draft Service/Article without authentication → confirm now correctly blocked (this is the direct test of closing Risk R9 / Architecture Review §2's `read: anyone` gap).

## 6. Sign-off criteria

Phase 5B implementation is considered validated only when:
- All standard checks pass.
- V-1, V-2, V-3 all pass.
- All 8 existing records show zero regression across every dimension in §3.
- Draft/preview isolation confirmed working exactly as it does today for Pages/CaseStudies.
- Security validation suite passes with the same rigor as Phase 5A's (which reached 16/16 live assertions in production).

No implementation work should be considered complete, nor a PR opened for merge consideration, until this full checklist is satisfied — consistent with this project's established plan → implement → validate → report → PR → await-approval workflow.
