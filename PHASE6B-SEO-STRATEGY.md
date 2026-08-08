# Phase 6B — SEO Strategy

How to scale Pages from a handful of hand-built landing pages to potentially dozens of service/industry/location/campaign variants, without degrading metadata quality, canonicals, structured data, or sitemap quality — read against the actual current implementation in `lib/seo/*` and `app/(app)/[slug]/page.tsx`.

## 1. What already scales for free

`lib/seo/metadata.ts`'s `buildMetadata()` and `app/(app)/sitemap.ts` are both **collection-driven, not hand-maintained** — every published Page automatically gets a canonical URL, Open Graph tags, and a sitemap entry with zero per-page code. `lib/seo/preview.ts`'s `PREVIEW_ROBOTS` gate is unconditional and collection-agnostic. **None of this needs to change to support higher page volume.** The risk at scale is not infrastructure, it's **content quality at the editor layer** — see §6.

## 2. The real gap: duplicate-content risk from templated landing pages

This is the single biggest SEO risk a "Landing Page Factory" introduces that today's one-off Pages don't have. When "Website Design Lebanon," "Website Design Beirut," and "Website Design Tripoli" are all built from the same block composition with only the location swapped, search engines can legitimately treat them as near-duplicate content, which can suppress all of them in rankings rather than helping any one of them.

Mitigations, in priority order:
1. **Editorial requirement, not a technical one**: each location/industry variant must have genuinely distinct `seoTitle`/`seoDescription`/H1 copy and at least one paragraph of location- or industry-specific substance (a local landmark, a locally-relevant example, an industry-specific pain point) — not just a find-and-replace of the place name. This belongs in the Content Operations workflow (§7 of the master plan) as a required editorial checklist item, not something the schema can enforce.
2. **`noindex` as an explicit release valve** — the field already exists on every Page (`Pages.noindex`). Campaign/seasonal pages that are genuinely thin (e.g., a short-lived ad-landing page with no unique long-term content value) should default to `noindex: true` rather than default to indexed-and-thin. Recommend making `noindex` default `true` specifically for `pageType: campaign` and `pageType: seasonal` (a one-line `defaultValue` change conditioned on `pageType`, deferred to implementation) — landing and location/industry pages intended for organic search stay indexed by default.
3. **Canonical self-reference is already correct** (`buildMetadata` sets `alternates.canonical` to the page's own URL) — there is no risk of canonical mis-pointing as long as every landing page variant gets its own real `slug`, which the schema already requires.

## 3. `pageType` is underused — extend it, don't replace it

Today `pageType: landing | campaign | seasonal` exists on every Page but is not read anywhere in application code (confirmed: no references outside the Payload field definition itself) — it's pure editorial metadata with no behavioral effect. Phase 6B's landing-page categories (service, industry, campaign, seasonal, event, location) map naturally onto an **extended** `pageType` enum rather than a new field or a new collection:

```
landing | campaign | seasonal | service-landing | industry-landing | location-landing | event
```

This is additive (a `select` field option-list change, no migration) and unlocks two real, low-effort SEO wins once it exists:
- **Sitemap differentiation** — `app/(app)/sitemap.ts` can key `priority`/`changeFrequency` off `pageType` instead of a flat `0.6`/`monthly` for every non-home Page (e.g., `service-landing`/`location-landing` at `0.7`, `campaign`/`seasonal` at `0.4` with `weekly` since they change/expire faster).
- **Conditional `noindex` default** described in §2.

This does **not** require a new collection per landing-page type. A generic Pages+blocks model with a categorizing field is the right shape for this volume of content — see the Architecture Review §1 for why a flat model is already the existing design, and the Risk Assessment for why NOT to fragment into `pages`, `service-pages`, `location-pages` as separate collections (duplicated schema/access/preview code for no behavioral gain).

## 4. Structured data — close the `serviceSchema` gap

`lib/seo/schema-org.ts`'s `serviceSchema()` is fully built and already proven in production on `/services/[slug]/`, but **Pages never calls it** — `app/(app)/[slug]/page.tsx` only ever emits `breadcrumbSchema` and conditionally `faqSchema`. For a "Website Design Lebanon" or "SEO Beirut" landing page, `Service` schema (with `serviceType`, `areaServed`) is exactly the structured data Google's documentation recommends for location/service-intent pages — and it costs nothing to add: the function exists, takes `{name, description, path}`, and could be extended to accept an optional `areaServed` override.

**Recommendation**: for Phase 6B, wire `serviceSchema()` into the Pages route conditionally — e.g., emit it whenever a Page's `pageType` is `service-landing`, `industry-landing`, or `location-landing`, using the Page's own `title`/`seoDescription` as `name`/`description`. This is a small, additive change to `app/(app)/[slug]/page.tsx` (same pattern as the existing FAQ-block scan), not new infrastructure.

`Product`/`Offer` schema for the new Pricing block (see Block Gap Analysis §4) is a second, smaller structured-data addition worth scoping into the same implementation pass — `schema-org.ts` has no `offerSchema()` yet; adding one is a direct copy of the `serviceSchema()` pattern.

`Organization` schema (`organizationSchema()`) is sitewide and homepage-scoped already — no Phase 6B change needed there. `BreadcrumbList` is already correctly wired on every Page via the existing `breadcrumbSchema()` call — no change needed, though a location/industry page nested under a conceptual "Services" or "Industries" hub (if one is ever built) would want a 2-level breadcrumb (`Home > Services > Website Design Lebanon`) rather than the current flat 1-level (`page.title` only) — worth a small enhancement if/when such a hub is built, not required for MVP.

## 5. FAQ schema at scale — no change needed, one clarification

`getFaqsByIds()` already correctly resolves and filters by `isPublished`, and the FAQ block already requires explicit picks (no scope-based fallback, unlike Services/Testimonials) — this is actually the *safer* design for a landing-page factory, since it prevents an editor from accidentally inheriting an unrelated FAQ set. No change recommended. One process note for Content Operations: reusing the exact same FAQ entries verbatim across many near-duplicate landing pages compounds the duplicate-content risk in §2 — encourage at least partial FAQ customization per landing-page variant where feasible, without making it a hard technical requirement (the current FAQs collection has no "used by N pages" indicator to make this easy to audit; a `usedBy` count is a nice-to-have, not a blocker).

## 6. Sitemap and crawl-budget hygiene at scale

At dozens of landing pages, two things become worth explicit editorial and technical discipline that weren't necessary at the current low volume:

- **Prune, don't just noindex, expired campaign/seasonal pages.** `noindex` keeps a page out of search results but it still exists, still counts toward crawl budget, and still risks a stale/broken user experience if a link to it survives after a campaign ends. Recommend a lightweight recurring process (not new code): a quarterly editorial review of `pageType: campaign`/`seasonal` Pages to unpublish (not delete — `_status: draft` preserves history) any that are past their relevant window.
- **The `RESERVED_SLUGS` maintenance obligation compounds with volume.** Every new literal route Phase 6B might add (e.g., a `/lp/` or `/campaigns/` hub, if one gets built) must be added to `lib/cms/reserved-slugs.ts` or risk the exact `/about`-collision bug already reproduced once in this project's history. This is a code-review checklist item for any future PR that adds a new route segment under `app/(app)/*`, not a Phase 6B-specific risk, but volume raises the number of opportunities to forget it.

## 7. Summary of concrete Phase 6B SEO deliverables

1. Extend `pageType` options (additive schema change) to distinguish service/industry/location/campaign/event landing pages.
2. Key `sitemap.ts`'s `priority`/`changeFrequency` off the extended `pageType`.
3. Default `noindex: true` for `campaign`/`seasonal` page types (editor can still uncheck it).
4. Wire `serviceSchema()` into `[slug]/page.tsx` for service/industry/location landing-page types.
5. Add `offerSchema()` to `schema-org.ts` alongside the new Pricing block (Block Gap Analysis §4), following the `serviceSchema()` pattern.
6. Document (not code) an editorial requirement: each templated location/industry variant needs genuinely distinct copy, not a find-and-replace — this is the primary defense against duplicate-content SEO risk and cannot be enforced by the schema.
7. Establish a quarterly unpublish-review process for expired campaign/seasonal Pages.

None of these require new SEO infrastructure — every one is either an additive schema/config change or a small, pattern-consistent addition to an existing, already-proven function.
