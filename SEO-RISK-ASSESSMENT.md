# Phase 4C — Risk Assessment

Risks specific to this initiative, informed by established precedent from Phases 4A/4B/4B.2 and the two production incidents already resolved in this project.

## 1. Schema/migration risk — LOW

**Precedent**: Phase 4B's field-type *conversions* (plain text/URL → `upload`/`relationTo: "media"`) triggered Payload's dev-mode schema-push TTY blocker, requiring a manual schema-extraction-and-apply workaround (documented in that phase's implementation report). That blocker has never been observed on purely additive new fields in any phase to date.

**Applicability to Phase 4C**: every proposed field in `SEO-SCHEMA-CHANGES.md` is a brand-new, nullable column — no existing field changes type or is removed. This is the same shape of change as Phase 4B.2's Media revalidation hooks (also purely additive) and Phase 4B's original `Homepage.ogImage`/`CaseStudies.featuredImage` fields when they were first introduced (as opposed to when *other* fields were later converted) — both landed without hitting the TTY blocker.

**Residual risk**: cannot be stated as zero-probability with certainty, since the exact trigger condition for Payload's schema-push blocker has never been root-caused in this project, only empirically observed on conversions. Mitigation: if it recurs despite this being additive-only work, the same manual-extraction workaround already proven in Phase 4B applies unchanged — this is a known, solved problem if it happens, not a new unknown.

## 2. Data-fallback correctness risk — LOW

Every new image/text field in this plan is designed with a fallback chain (content-specific → Site Settings default → hardcoded literal). The risk here is a logic bug in the fallback chain itself (e.g., an empty string treated as "unset" incorrectly, or a fallback pointing at a deleted Media document). This is a standard, well-understood class of bug — mitigated by the same build/test/validate discipline applied in every prior phase (`SEO-VALIDATION-STRATEGY.md`), not by anything specific to SEO.

## 3. Structured-data correctness risk — MEDIUM (for one specific item)

Adding `WebSite` and `articleSchema()` is low risk (both are additive, new JSON-LD blocks with no existing consumer to break). The one item flagged **medium** is the recommendation in `PHASE4C-SEO-PLAN.md` §H to re-validate whether `ProfessionalService` remains the right `@type` for the sitewide Organization schema — this schema is already live and presumably already indexed/cached by search engines; changing its `@type` (as opposed to adding new sibling schemas) is a change to something already in production, not a pure addition. **Recommendation**: treat this as optional, out of the initial implementation sequence, and only pursued after independent validation (Google Rich Results Test, schema.org validator) confirms a real, material benefit — not bundled into the same PR as the purely-additive work.

## 4. Article schema centralization risk — LOW, but requires a specific check

Extracting the inline `Article` JSON-LD from `insights/[slug]/page.tsx` into a shared `articleSchema()` function is a refactor of live, already-indexed structured data. **Specific risk**: if the extracted function's output isn't byte-for-byte equivalent to the current inline object (field order doesn't matter for JSON-LD, but field presence/values do), existing articles' search-result rich snippets could silently regress.

**Mitigation** (validation-time, not implementation-time): diff the JSON-LD output for every existing published Article before/after the refactor, for the refactor step in isolation, *before* adding the new `image` field in the same change. Detailed in `SEO-VALIDATION-STRATEGY.md`.

## 5. `noindex` misuse risk — LOW technical, MEDIUM editorial

Purely additive, defaults to `false` (indexable) — zero risk of accidentally deindexing existing content on rollout. The real risk is downstream and editorial: once available, an editor could mistakenly check `noindex` on a page meant to be public, silently removing it from search results with no visible symptom until organic traffic for that page drops (a delayed, hard-to-attribute symptom).

**Mitigation**: clear admin-UI field description (already standard practice in this codebase — see `Media.alt`'s description field for the established convention), and a mention in onboarding/editor documentation when this ships. Not a code-level mitigation — a process one.

## 6. Performance risk — LOW

Additional JSON-LD (`WebSite`, FAQ schema on 4 more pages, breadcrumb on Pages/hub pages) adds a small amount of `<script type="application/ld+json">` payload per page — bytes, not render-blocking resources, no client-side JS execution. Comparable in scale to the schema already live on Service/Case Study pages today, which have not been a documented performance concern in any prior phase's Lighthouse/build output. No new client-side dependency, no new network request (all schema is server-rendered inline).

## 7. Media/image risk — LOW, with one direct precedent to respect

**Precedent**: the recent production incident (`INCIDENT-ROOT-CAUSE.md`/`FIX-IMPLEMENTATION-REPORT.md`, already resolved) established that Payload's Media `url` field always resolves through this site's own `/api/media/file/` proxy — not a direct cloud-storage domain — unless `disablePayloadAccessControl: true` is explicitly set, and that `next.config.ts`'s `images.remotePatterns` must match whatever domain is actually used.

**Applicability**: every new OG-image field in this plan (`Services.ogImage`, `Articles.ogImage`, `Pages.ogImage`, `SiteSettings.defaultOgImage`/`defaultTwitterImage`) is a `relationTo: "media"` field, reusing the exact same resolution path already correctly configured for `Homepage.ogImage`/`CaseStudies.featuredImage` today. **No new `next.config.ts` change is anticipated** — this plan does not introduce any new image domain, only new *references* to the same Media collection already routed correctly. This should be explicitly re-verified during implementation (not assumed) given how costly the prior incident was, but the architecture gives no reason to expect a repeat.

## 8. Revalidation risk — NONE (already covered)

No new collections are proposed; `Media` (Phase 4B.2), `Services`, `Articles`, and `Pages` all already have correct `afterChange`/`afterDelete` revalidation hooks from prior phases. New fields on existing collections are covered by those collections' existing hooks automatically — no hook changes needed.

## 9. Rollback strategy (applies across all of Phase 4C)

Consistent with every prior phase's approach: because every change here is additive (new nullable fields, new functions, new JSON-LD blocks — no field removed or retyped, no existing function's signature changed in a breaking way), rollback at any implementation stage is a straightforward `git revert` of the relevant commit(s), with no data-loss risk — new columns simply go unused again, they don't need to be dropped for the site to function correctly (Payload tolerates orphaned nullable columns without issue, as already established in this codebase). The one item warranting a distinct rollback note is the Article schema centralization (§4): rolling that back specifically means reverting to the inline JSON-LD, not just removing a field, since it's a code-organization change rather than a schema addition.

## 10. Overall risk rating: LOW

No item in this plan touches authentication, payments, data deletion, or any existing field's type — the categories that have caused every real incident in this project's history to date. The highest-risk item (§3, Organization schema `@type` reconsideration) is explicitly recommended as optional and deferred, not part of the core additive scope.
