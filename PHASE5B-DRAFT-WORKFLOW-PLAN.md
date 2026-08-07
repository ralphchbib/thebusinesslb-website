# Phase 5B — Draft Workflow Plan (Master Plan)

**Status:** Planning only. No code, branches, or PRs produced as part of this deliverable.
**Scope:** Extend true Payload draft/publish versioning (as already shipped for Pages and Case Studies in Phase 5A) to **Services** and **Articles**.
**Companion documents:** `PHASE5B-ARCHITECTURE-REVIEW.md` (evidence base), `PHASE5B-MIGRATION-PLAN.md`, `PHASE5B-WORKFLOW-DESIGN.md`, `PHASE5B-RISK-ASSESSMENT.md`, `PHASE5B-VALIDATION-STRATEGY.md`, `PHASE5B-ROLLBACK-PLAN.md`.

## 1. Objective

Today, Services and Articles have no real draft state — only a boolean `isPublished` checkbox with no version history and no distinction between "saved" and "public." Editing a live Service or Article makes the change public the instant it's saved. Phase 5B closes this gap using the same native Payload mechanism (`versions: { drafts: true }`) already proven in production for Pages and Case Studies, giving editors a genuine Save Draft / Publish workflow and secure preview links, without disturbing the 5 Services and 3 Articles currently live.

## 2. Required Payload configuration changes

1. **`versions: { drafts: true }`** added to `payload/collections/Services.ts` and `payload/collections/Articles.ts` — no `autosave` (matches Pages/CaseStudies, avoids extra version-row churn from keystroke-debounced saves; see `PHASE5B-ARCHITECTURE-REVIEW.md` §6 on revalidation-hook frequency).
2. **`access.read`** changed on both collections from `anyone` to the established pattern:
   ```ts
   read: ({ req: { user } }) => (user ? true : { _status: { equals: "published" } })
   ```
   (identical to Pages/CaseStudies/Testimonials today — closes the latent gap noted in the Architecture Review §2).
3. **`admin.preview`** added to both, generating a link through the existing `/api/draft` route:
   ```ts
   preview: (doc) => {
     const secret = process.env.PREVIEW_SECRET;
     if (!secret || typeof doc?.slug !== "string") return null;
     return `${siteConfig.url}/api/draft?secret=${secret}&collection=services&slug=${encodeURIComponent(doc.slug)}`;
   },
   ```
   (`collection=articles` for Articles.)
4. **`isPublished` field**: retired from application logic in favor of Payload's native `_status`, but **not deleted from the schema in this phase** — see §5 and `PHASE5B-MIGRATION-PLAN.md` for the reasoning (this is a deliberate, safety-first sequencing choice, not an oversight).
5. **`admin.defaultColumns`** updated on both collections to show `_status` instead of `isPublished`.
6. **`/api/draft/route.ts`** collection whitelist extended with two branches (`"services"`, `"articles"`), calling the new draft-aware lookups (§4).

No new content fields are introduced. This is a structural/behavioral change, not a schema-content change — although, internally, it does create two new Payload-managed tables (`cms._services_v`, `cms._articles_v`) plus one new column (`_status`) per collection.

## 3. Versioning strategy

Adopt Payload's native draft/publish versioning exactly as already proven for Pages/CaseStudies — **no custom-built alternative**. Key decisions:
- **No autosave.** Editors explicitly choose "Save Draft" or "Publish."
- **No `maxPerDoc` cap set** — inherit whatever default Pages/CaseStudies already run with, for consistency. Revisit only if version-table growth becomes a real operational concern (flagged as a future tuning knob, not a Phase 5B blocker).
- **`_status` becomes the single source of truth** for publish state going forward, replacing `isPublished` in all application code (data-layer queries, sitemap generation, RSS/feed generation if any).

## 4. Draft/publish workflow

- Admin UI changes from a single "Published" checkbox to Payload's native Save Draft / Publish button pair plus a status pill in the list view — identical UX to what Pages/CaseStudies editors already use today.
- `getServiceBySlug`/`getArticleBySlug` (in `lib/cms/services.ts`/`lib/cms/articles.ts`) gain a second parameter, following the exact Phase 5A precedent:
  ```ts
  export const getServiceBySlug = cache(async (slug: string, draft: boolean = false) => { ... });
  ```
  (plain boolean, not an options object — preserves React `cache()` memoization across `generateMetadata()` + the page component, per the reasoning already documented in `PHASE5A-IMPLEMENTATION-REPORT.md`.)
- List-returning functions (`getAllServices`, `getAllArticles`, `getRecentArticles`, sitemap slug generators) are **unaffected in signature** — they continue to query published-only content by default; only the single-document detail lookups need draft-awareness, since only detail pages support preview.

## 5. Preview integration approach

Full reuse of Phase 5A's infrastructure — **not a new preview mechanism**:
- `/api/draft` — extend the collection whitelist (2 new branches), reusing the same secret + session + collection-scoping security model already validated in production.
- `/api/exit-draft` — zero changes, already generic.
- `lib/seo/preview.ts` (`isPreviewMode()`, `PREVIEW_ROBOTS`) — zero changes, reused as-is on the Services/Articles detail routes.
- `app/(app)/services/[slug]/page.tsx` and `app/(app)/insights/[slug]/page.tsx` gain the same `isPreviewMode()` + `PREVIEW_ROBOTS` wiring already shipped on the Pages/CaseStudies routes in Phase 5A, plus the `draft` param threaded into `getServiceBySlug`/`getArticleBySlug`.
- While touching these two routes, also add the missing `export const dynamicParams = true;` (present on Pages/CaseStudies, absent here today per Architecture Review §1) — a minor consistency fix bundled into the same change, not a separate initiative.

No new `PREVIEW_SECRET`, no new authentication mechanism, no new API routes.

## 6. Existing data migration impact (summary — full mechanics in `PHASE5B-MIGRATION-PLAN.md`)

5 Services and 3 Articles are live in production today, all `isPublished: true`, zero drafts. The migration must set `_status: "published"` for all 8 with zero visible change and zero downtime. The recommended approach explicitly **defers dropping the `isPublished` column** to a later, optional cleanup — this phase only adds columns/tables and switches application code to read `_status`, keeping the change purely additive and trivially reversible (see Rollback Plan).

## 7. Editorial workflow impact (summary — full detail in `PHASE5B-WORKFLOW-DESIGN.md`)

Editors gain the ability to stage in-progress edits to a live Service or Article (e.g., testing new pricing copy, a new package tier, updated SEO metadata) without it going public until they explicitly click Publish — a meaningfully new and lower-risk editing capability for the two most frequently updated, most commercially visible content types on the site.

## 8. Security considerations (summary — full detail in `PHASE5B-RISK-ASSESSMENT.md`)

Reuses Phase 5A's exact 3-layer security model (secret + `payload.auth()` session + collection whitelist). The `access.read` tightening (§2.2) is itself a net security improvement, closing the pre-existing `read: anyone` gap identified in the Architecture Review.

## 9. Validation strategy (summary — full detail in `PHASE5B-VALIDATION-STRATEGY.md`)

Standard tsc/lint/test/build, **plus** a regression suite unique to this phase: byte-for-byte content/metadata/structured-data parity checks on all 8 existing live records, and explicit re-verification of every relationship-dependent surface (Homepage service cards, FAQ service-scoping, CaseStudies service tags, Articles' related-services) identified in the Architecture Review §4.

## 10. Rollback strategy (summary — full detail in `PHASE5B-ROLLBACK-PLAN.md`)

Because `isPublished` is deliberately kept (not dropped) through this phase, rollback is a straightforward code revert — the old `isPublished`-based code path continues to work unmodified, since its data was never touched.

## 11. Recommended implementation sequence

1. Extract Payload's computed schema for the new `_status` columns + `_services_v`/`_articles_v` tables (same "extract, don't hand-write" discipline used in every prior schema-affecting phase).
2. Apply schema (additive only: new column + new tables, nothing dropped).
3. Backfill `_status: "published"` on all 8 existing records via Payload's Local API (not raw SQL — matches established write discipline).
4. Add `versions: { drafts: true }`, `access.read`, `admin.preview`, `admin.defaultColumns` to both collection configs.
5. Add `draft` parameter to `getServiceBySlug`/`getArticleBySlug`; switch all list-query call sites from `isPublished` to `_status`.
6. Wire `isPreviewMode()`/`PREVIEW_ROBOTS`/`dynamicParams` into the two detail-page routes.
7. Extend `/api/draft`'s collection whitelist.
8. Full regression validation (existing 8 records + relationship dependents + new draft-isolation tests).
9. Reports, PR — **held for explicit approval before merge**, per standing project workflow.

## 12. Business impact

- Editors can now stage Service/Article changes (new pricing, new packages, revised copy) and review them privately before they go live — reduces the risk of visibly-wrong content reaching the public site, directly relevant since Services pages are the primary commercial conversion surface.
- No visible change for site visitors or search engines on day one — all 8 existing records remain published and unchanged.
- Closes a real (if so-far unexploited) access-control gap on two of the site's most commercially important collections.

## 13. Technical impact

- Two new Payload-managed database tables, one new column per collection — fully additive, no destructive schema change in this phase.
- `isPublished` becomes dead application-code-wise but remains present in the database as an inert safety net.
- No change to public-facing URLs, routing, or existing SEO output for any of the 8 live records.

## 14. Estimated effort

| Workstream | Estimate |
|---|---|
| Schema extraction + migration + backfill | 2.5–3 h |
| Collection config changes (versions, access, preview, columns) | 1 h |
| Data-layer changes (`draft` param, `_status` query switch) | 1.5 h |
| Detail-route wiring (preview mode, robots, dynamicParams) | 1 h |
| `/api/draft` whitelist extension | 0.5 h |
| Relationship-dependency verification | 1 h |
| Validation (regression + draft isolation + relationship checks) | 2.5–3 h |
| Reports (7 documents already covered by this planning pass; implementation-phase reports separately) | 1.5 h |
| **Total** | **~11.5–13 h** |

Larger than Phase 5A (which had zero pre-existing data to protect) due to the migration and regression-testing burden being genuinely new work, not a repeat of a proven pattern.

## 15. Final recommendation

**Proceed.** The technical design is a direct, low-ambiguity extension of infrastructure already proven safe in production twice (Pages, Case Studies). The one genuinely new risk — retrofitting drafts onto live, populated, relationship-referenced collections — is fully addressed by the additive-only migration sequencing (defer the `isPublished` column drop) and the expanded regression-test scope defined in the companion documents. No architectural blockers identified. Recommend implementing as its own phase (5B), sequenced after this plan's explicit approval, following the same plan → implement → validate → report → PR → await-approval workflow used for every prior phase.
