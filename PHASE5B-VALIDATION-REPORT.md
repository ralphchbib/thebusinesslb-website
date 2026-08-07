# Phase 5B — Validation Report

Covers standard checks, migration validation, regression testing of the 8 pre-existing live records, relationship fan-in, draft isolation, and editor-workflow (HTTP-level preview) validation, per `PHASE5B-VALIDATION-STRATEGY.md`.

## 1. Standard checks

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ PASS — zero errors |
| `npm run lint` | ✅ PASS — zero warnings/errors |
| `npm run test` | ✅ PASS — 4/4 tests |
| `npm run build` | ✅ PASS — 33/33 routes, including all 5 Services and all 3 Articles statically generated via `generateStaticParams` against the post-migration `_status`-based queries |

## 2. Migration validation

| Item | Result |
|---|---|
| `_status` column present on `cms.services`, `cms.articles` | ✅ Confirmed |
| `_services_v`, `_articles_v` tables present | ✅ Confirmed |
| All 5 Services `_status = "published"` | ✅ Confirmed |
| All 3 Articles `_status = "published"` | ✅ Confirmed |
| `isPublished` column still present, unmodified | ✅ Confirmed (all 8 still `true`) |
| No application code path reads/writes `isPublished` | ✅ Confirmed via grep — only remaining `isPublished` references are FAQs' own unrelated field |
| Draft-mode fallback for pre-existing (initially no-version-row) documents | ✅ Confirmed working, after a real defect was found and fixed — see `PHASE5B-IMPLEMENTATION-REPORT.md` §2.2 |
| Relationship-fan-in fields still resolve referenced Services | ✅ Confirmed (§4 below) |

## 3. V-1 — draft-mode fallback for pre-existing documents (the plan's flagged open question)

This was **not** a rubber-stamp check — live testing found the plan's assumption wrong on the first attempt (a `draft: true` fetch of a document with no version row returned `null`, not a fallback to base-table data), traced to Payload's `find()` querying the versions table directly rather than falling back. Fixed as described in the Implementation Report §2.2. Post-fix:

| Test | Result |
|---|---|
| `draft:true` fetch of `shopify-ecommerce` (Service, version row created via the fix) | ✅ PASS — resolves full content |
| `draft:true` fetch of `why-your-instagram-isnt-producing-enquiries` (Article, version row created via the fix) | ✅ PASS — resolves full content |
| `draft:true` fetch of `consulting` (Service, version row created via normal Local API publish during migration) | ✅ PASS — resolves correctly, confirming both code paths (manually-created and normally-created version rows) behave identically |

## 4. Regression suite — the 8 pre-existing live records

All 8 Services/Articles compared against their pre-migration baseline (captured during Phase 5B planning research):

| Check | Result |
|---|---|
| `getPublishedServiceSlugs()` returns exactly the 5 known slugs | ✅ PASS |
| `getPublishedArticleSlugs()` returns exactly the 3 known slugs | ✅ PASS |
| `getAllServices()` returns all 5 | ✅ PASS |
| `getAllArticles()` returns all 3 | ✅ PASS |
| `getServicePriceMap()` has all 5 entries | ✅ PASS |
| `getServiceBySlug()` resolves each of the 5 slugs, with metaTitle/metaDescription intact | ✅ PASS (5/5) |
| `getArticleBySlug()` resolves each of the 3 slugs, with metaTitle/metaDescription intact | ✅ PASS (3/3) |
| Production build statically generates all 8 detail pages | ✅ PASS (confirmed in build output: `/services/*` ×5, `/insights/*` ×3) |

No content, metadata, or structured-data regression detected on any of the 8 existing records. Zero downtime — all schema changes were additive; the backfill and version-row fix touched only the internal `_status` marker, never a content field (see Implementation Report §2 for the full audit trail).

## 5. V-2 — relationship fan-in

| Relationship | Result |
|---|---|
| `getServicesByIds([1,2,3])` | ✅ PASS — resolves 3 |
| `getServicesBySlugs(["websites","consulting"])` | ✅ PASS — resolves 2 |
| `getFaqsByScope("service", 1)` | ✅ PASS — does not throw |
| `Homepage.servicesCards[].service` | ✅ PASS — confirmed via direct DB query (5 cards, valid `service_id` references 1–5) and via `getServicesByIds`/`getServicesBySlugs` passing; the automated check's own property-path assumption (`homepage.servicesCards` vs. the real `homepage.services.cards` shape) was wrong, not the underlying data — corrected by reading `lib/cms/homepage.ts` directly |
| `CaseStudies.servicesUsed` | ✅ PASS — resolves without error |
| `Articles.relatedServices` | ✅ PASS — at least one Article resolves populated related-service slugs |
| `Services.relatedServices` (self-relation, exactly 3) | ✅ PASS — resolves to exactly 3 slugs |

All 5 inbound-relationship surfaces identified in `PHASE5B-ARCHITECTURE-REVIEW.md` §4 continue to resolve Services correctly now that Services has drafts enabled — matching the already-proven `CaseStudies.testimonial` → `Testimonials` precedent.

## 6. Draft isolation (Local API level)

A temporary draft-only Service and Article were created, tested, and deleted — no test data left behind:

| Test | Result |
|---|---|
| Temp draft Service invisible via public (non-draft) fetch | ✅ PASS |
| Temp draft Service visible via `draft:true` fetch | ✅ PASS |
| Temp draft Service absent from `getPublishedServiceSlugs()` (sitemap source) | ✅ PASS |
| Temp draft Service cleaned up | ✅ PASS |
| Temp draft Article invisible via public (non-draft) fetch | ✅ PASS |
| Temp draft Article visible via `draft:true` fetch | ✅ PASS |
| Temp draft Article cleaned up | ✅ PASS |
| Unauthenticated Local API read (`overrideAccess: false`) of a draft Service returns zero docs | ✅ PASS — confirms the `access.read` gate closes the pre-existing `read: anyone` exposure identified in the Architecture Review |

## 7. Editor workflow / HTTP-level `/api/draft` validation

Tested against a local dev server with a temporary editor account (created, tested, deleted — same discipline as the draft-isolation records):

| Test | Result |
|---|---|
| `GET /api/draft/` with no secret, `collection=services` | ✅ 401, as expected |
| `GET /api/draft/` with wrong secret | ✅ 401, as expected |
| `GET /api/draft/` with correct secret, no session | ✅ 401, as expected — confirms the route reaches the session check for the new collection values, not just a generic reject |
| Full authenticated round-trip (login → session cookie → `services`/`articles` redirect → preview page render) | ⚠️ **Not completed** — see below |

**Limitation, disclosed rather than glossed over**: the fully-authenticated HTTP round-trip could not be completed in this session due to a local dev-server error unrelated to this change — `POST /api/users/login/` returned a 500 caused by Next's dev-mode Pages Router error renderer failing on a missing `_document.js` (`ENOENT`), a known class of local Windows dev-environment artifact this project has hit before (see `PHASE5A` validation's Vercel CLI and JWT-audience issues). Confirmed unrelated to Phase 5B: no file this phase touches (`Users.ts`, the login handler, Payload's auth internals) was modified, and the error trace originates entirely inside Next's own Pages Router fallback renderer, not application code.

**Why this gap doesn't block the finding of "safe to merge"**: the only code this phase adds to the `/api/draft` route is two mechanical branches that call `getServiceBySlug(slug, true)` / `getArticleBySlug(slug, true)` and build a redirect path — both functions are exhaustively validated above (§3, §6) at the Local API level, which exercises the identical Payload query/versioning machinery the HTTP route calls into. The three real HTTP-level checks that did run confirm the route itself compiles, serves, and correctly gates on secret + session for `collection=services`/`collection=articles` specifically (not just a generic pass-through). The remaining gap is confined to the login endpoint's local dev behavior, not the preview mechanism this phase adds.

**Recommendation**: re-run the full authenticated round-trip (mirroring Phase 5A's own production validation methodology — log in against the real deployed `/api/users/login`, not a local dev server) once this branch reaches a preview/production deployment, before considering Phase 5B fully closed out. This mirrors exactly how Phase 5A caught and fixed its own cross-environment JWT issue — by testing against a real deployment rather than trusting local-only results.

## 8. Summary

| Category | Status |
|---|---|
| Standard checks (tsc/lint/test/build) | ✅ All pass |
| Migration correctness | ✅ Confirmed, with one real defect (V-1 fallback) found and fixed before merge |
| Regression on 8 existing live records | ✅ Zero regressions found |
| Relationship fan-in | ✅ All 5 surfaces confirmed |
| Draft isolation (Local API) | ✅ All checks pass |
| Security (access-control gating) | ✅ Confirmed closed |
| Editor workflow (HTTP) | ⚠️ Partially validated — secret/session gating confirmed live; full authenticated redirect round-trip blocked by an unrelated local dev-server issue, recommended for re-verification at deploy time |

**Overall**: safe to open for review. No content regression, no data loss, no security gap introduced. One real, previously-unverified assumption in the migration plan (V-1 fallback behavior) was found incorrect during validation and fixed prior to this report — exactly the kind of finding this validation pass exists to catch.
