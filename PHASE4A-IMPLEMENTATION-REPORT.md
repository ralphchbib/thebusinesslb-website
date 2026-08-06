# Phase 4A — Homepage CMS: Implementation Report

Based on `PHASE4A-HOMEPAGE-CMS-PLAN.md`, approved with all 5 recommendations accepted. Branch: `feat/phase4a-homepage-cms` (off `main` @ `a4d7cf4`, the commit currently live in production with Phase 3 merged).

## 1. What was built

### 1.1 `Homepage` Global (`payload/globals/Homepage.ts`, slug `homepage`)

A singleton, **not** a collection, per the explicit requirement. `versions.drafts` is deliberately **not** set — same as `SiteSettings`, per approved decision #5: every Save goes live immediately, sitewide, with no staged/preview state. Ten tabs, matching `SiteSettings.ts`'s proven tabbed-global pattern: Hero, Problem, Transformation, Process, Founder, Featured Services, Featured Testimonials, Featured Case Studies, Final CTA, SEO — full field list in the plan doc, §A.

`access: { read: anyone, update: adminOrEditor }` per approved decision — Marketing Manager/VA-level editors can use it, not Admin-only. `hooks: { afterChange: [revalidateGlobalAfterChange] }` — the exact same hook `SiteSettings` already uses in production, zero new revalidation code.

### 1.2 Data layer (`lib/cms/homepage.ts`)

`getHomepage()`, `cache()`-wrapped, matching every other `lib/cms/*.ts` file's convention. Fetches the global at `depth: 0` (consistent with the codebase's established "resolve relationships manually, don't rely on Payload's auto-population" pattern), then:
- Resolves each Featured Services card's `service` relationship ID via a new `getServicesByIds()` (added to `lib/cms/services.ts`, mirroring `getTestimonialsByIds`'s existing order-preserving pattern exactly).
- Passes Featured Testimonials/Case Studies through as raw ID arrays — no resolution needed here, since `TestimonialsRow`/`CaseStudiesRow` (built in Phase 3) already do their own ID-or-Featured-fallback resolution internally. Reused as-is, zero changes.

### 1.3 Component refactor (7 files)

`hero.tsx`, `problem-block.tsx`, `transformation-strip.tsx`, `process-block.tsx`, `founder-block.tsx`, `service-grid.tsx`, `final-cta.tsx` all converted from importing `content/home.ts` directly to accepting props. `transformation-strip.tsx` stays a Client Component (`"use client"`, holds the mobile "show all" `useState`) — data now flows in as props from its Server Component parent (`page.tsx`), exactly as the plan specified; the component itself does no fetching.

`service-grid.tsx` is the one structurally different refactor: it now renders `HomepageServiceCard[]` (a resolved `Service` + `featured` flag + optional `overrideBody`/`overrideBullets`) instead of a flat hardcoded array, splitting into the large 2-card / small 3-card layout by `card.featured` — preserving the exact current visual split.

### 1.4 `app/(app)/page.tsx`

Static `metadata` export replaced with `generateMetadata()` reading `getHomepage()`. Page component fetches `getHomepage()` and `getFaqsByScope("global")` in parallel, prop-drills the 7 refactored components (including both the mobile and desktop `FounderBlock` instances — same props, different `className`, matching the existing responsive-duplication pattern). Two new sections added — `<TestimonialsRow>` and `<CaseStudiesRow>` — inserted after `InsightsRow` and before `FinalCta`, matching the placement convention Phase 3 already established on Service pages (social proof immediately before the closing CTA).

### 1.5 Hero highlighted-text (new capability, decision #5)

`Headline` sub-component in `hero.tsx`: if `highlightedText` is unset or isn't found as an exact substring of `headline`, renders the headline as one plain text node — pixel-identical to the pre-4A design. If it matches, wraps that substring in `<span className="text-petrol">` (reusing the site's existing accent color, not a new design element). Verified live with both states (§2.3).

### 1.6 Scope boundary held exactly as planned

`content/home.ts` still exports `positioning`, `assessmentBlock`, `foundingClients`, `sectors`, `insights`, `faq` — untouched, still hardcoded, out of scope. **One correction made during implementation, not anticipated in the plan**: `process` also had to stay in `content/home.ts`, unchanged — `app/(app)/about/how-we-work/page.tsx` imports it independently, and removing it would have broken that page. The Homepage Global has its **own** copy of the same step/trust data (seeded from the same source values, but stored and editable independently) — editing one does not affect the other. Caught via a full grep of every `content/home` import site before deleting anything, not discovered by trial and error.

### 1.7 Image fields — a real constraint, documented in the field UI itself

`heroImage`/`founderImage` remain `next/image` (not a plain `<img>` like Testimonials'/Case Studies' logo fields), because the hero image is `priority` (the page's LCP candidate) and this project has no `remotePatterns` configured in `next.config.ts`. Switching to a plain `<img>` would have satisfied "editable via URL" but silently regressed image-optimization performance on the most performance-sensitive image on the page — directly against requirement #4. Instead, both fields' admin `description` explicitly states they must be a path to a file already in `/public`, not an external URL — the same tradeoff already accepted for Testimonials/Case Studies logos, made explicit rather than silently different for this one case.

### 1.8 Seed script (`scripts/seed-homepage.ts`)

Idempotent: checks `cms.homepage` for an existing row first and refuses to run if one exists (verified live, §2.2). Seeds every field from the exact original `content/home.ts` values plus the CTA hrefs/image paths/alt text that were previously inline in JSX (never in `content/home.ts` at all) — so the seeded homepage is word-for-word and link-for-link identical to the pre-4A hardcoded version. Runs via `node -r @swc-node/register scripts/seed-homepage.ts`, the same mechanism `package.json`'s `test` script already uses — no new dependency.

## 2. Validation performed

### 2.1 Required checks

```
npm run test       PASS — 4/4
npm run lint         PASS (clean)
npx tsc --noEmit     PASS (clean)
npm run build        PASS — 31 routes, unchanged count from pre-4A
```

### 2.2 Schema push and seed

Dev-mode schema push (`next dev` + hit `/admin/`) created 8 new tables: `homepage`, `homepage_problem_symptoms`, `homepage_transformation_stages`, `homepage_process_steps`, `homepage_process_trust_points`, `homepage_services_cards`, `homepage_services_cards_override_bullets`, `homepage_rels` — confirmed via `information_schema`, no existing table touched.

Seed script run: produced exactly 1 `homepage` row (id=1), 6 problem symptoms, 7 transformation stages, 5 process steps, 4 trust points, 5 featured-service cards — all counts matching the original `content/home.ts` arrays exactly. Re-run a second time to confirm idempotency: correctly refused ("already has a row"), zero duplicate rows created.

### 2.3 Live content-parity verification

Full rendered-text extraction of the live (seeded) homepage, section by section, compared against the original `content/home.ts` + inline JSX values read at the start of this phase — **word-for-word match**, including all 6 problem symptoms, all 7 transformation stages (with the "Show all 7 stages" mobile toggle still present and correctly reading the live count), all 5 process steps, all 4 trust points, and all 5 service cards' bespoke override copy (confirmed pulling from the *override* fields, not each Service's own longer `intro` text — proving the override mechanism, not just the fallback, works).

**Highlighted-text feature tested with a real edit**, not just code review: updated `hero_headline`/`hero_highlighted_text` via SQL, rebuilt, confirmed `<span class="text-petrol">EDIT TEST</span>` rendered correctly in the output HTML, then reverted and rebuilt again to restore the exact seeded state — confirmed via a final content-parity re-check.

**Service-grid resolution confirmed via GraphQL**, not just the rendered page: `Homepage.servicesCards[].service.slug` correctly resolves each relationship, `overrideBody` correctly returns the bespoke homepage copy per card.

### 2.4 SEO / structured data / sitemap

- `<title>`, meta description, canonical URL, OG title, OG image (correctly falling back to `/og/default.png` since `ogImage` was left unset in the seed, matching the original's always-default behavior) — all confirmed matching the pre-4A hardcoded values exactly, now sourced from `generateMetadata()`.
- JSON-LD: confirmed exactly **one** `<script type="application/ld+json">` tag on the homepage, unchanged content (`ProfessionalService`/`Person`/`PostalAddress`/`Country`) — this schema lives in the root layout, is sitewide, and Phase 4A never touched it, as anticipated in the plan.
- `sitemap.xml`: homepage's `/` entry is a static route entry unrelated to `getHomepage()` — confirmed still present, unaffected.

### 2.5 Performance / caching

Production build (`next build` + `next start`, not dev mode) confirms `/` is still prerendered static: `x-nextjs-prerender: 1`, `Cache-Control: s-maxage=31536000` — identical caching behavior to before. Homepage's own bundle size in the build output is unchanged in any meaningful way (First Load JS 180kB vs. 181kB pre-4A — noise, not a regression). No new client-side JavaScript was introduced; `TransformationStrip`'s existing Client Component boundary is unchanged in size or behavior, just newly prop-driven.

### 2.6 Payload admin editing — best-effort, same constraint as every prior phase

No valid admin credentials exist in this environment (documented in every phase since Phase 1). Verified instead via: (a) GraphQL and REST both correctly return the `Homepage` global with all fields and resolved relationships, proving the collection is correctly registered in Payload's runtime config — the same config the admin UI reads from; (b) a real end-to-end edit-and-render round-trip via direct SQL (§2.3), proving the full data pipeline; (c) the revalidation hook is reused verbatim from `SiteSettings`, which **has** been exercised through the real admin UI in earlier phases.

### 2.7 Full regression sweep

Every existing route re-checked on the production build: `/`, `/services/`, `/services/shopify-ecommerce/`, `/insights/`, `/pricing/`, `/about/`, `/about/how-we-work/` (the page sharing `process` from `content/home.ts` — specifically re-verified given §1.6's finding), `/about/ralph-chbib/`, `/contact/`, `/digital-assessment/`, `/case-studies/`, `/sitemap.xml`, `/robots.txt`, `/admin/` — all `200`. DB row counts for every existing collection (Services 5, Articles 3, FAQs 49, Navigation 22, Pages 0, Testimonials 0, Case Studies 0, Users 1) confirmed unchanged before and after.

## 3. Issues found and fixed during implementation

1. **`process` export collision** (§1.6) — caught by grepping every `content/home` import site before deleting anything, not by breaking the About page and noticing later. Fixed by keeping `process` in `content/home.ts` unchanged and giving the Homepage Global its own independent copy.
2. **Hero image performance regression risk** (§1.7) — caught by checking `next.config.ts` for `remotePatterns` before assuming a plain `<img>` (Testimonials' pattern) was safe to reuse here. Fixed by keeping `next/image` and making the local-path-only constraint explicit in the field's own admin description, so an editor sees the constraint at the point of use rather than discovering it as a runtime error.
3. **TypeScript inference gaps** — two `tsc` errors during development (an optional-vs-required property mismatch in the services-card mapper, and an unnarrowed `number | undefined` in the seed script's SQL parameter). Both are ordinary type-safety catches, not design issues; fixed and re-verified clean.
4. **`postgres` package's curly-brace query-array syntax** for the seed script's `in ${sql(serviceSlugs)}` clause — used the package's documented array-helper rather than manual string interpolation, avoiding a SQL-injection-shaped pattern for what is admittedly fully-trusted, hardcoded seed data — worth doing correctly regardless.

## 4. Scope compliance

Confirmed via `git status`/`git diff` before writing this report:

- **Not touched:** every existing Payload collection (`Services`, `Articles`, `FAQs`, `Navigation`, `Pages`, `Testimonials`, `CaseStudies`, `Users`), `SiteSettings`, every existing route's own page file except `app/(app)/page.tsx` itself, `PositioningBar`/`AssessmentBlock`/`FoundingClients`/`SectorGrid`/`InsightsRow` (all still reading their original hardcoded content, as scoped).
- **Modified, all either additive or a like-for-like prop refactor:** `payload.config.ts` (1 import, 1 globals-array entry), `lib/cms/types.ts` (new interfaces appended), `lib/cms/services.ts` (`id` field added to the existing `toServiceContent()` mapper output, one new exported function appended), `content/services/types.ts` (`id` added as an *optional* field — verified non-breaking for the 5 legacy `content/services/*.ts` literal files that predate the CMS migration and never set it).
- **No design change beyond the two explicitly-approved additions** (Hero highlighted-text span, two new Testimonials/Case Studies sections) — both are additive-only with a no-op default state, confirmed via the word-for-word content-parity check in §2.3.

## 5. Production-readiness review

**Security.** `update: adminOrEditor` — same access tier as every other content collection, not more permissive than Services/Articles/Pages. No new public write surface. Image fields inherit the same constraint already accepted for Testimonials/Case Studies (no upload, URL/path only).

**SEO.** Confirmed unchanged: title/description/canonical/OG all sourced correctly from the new `generateMetadata()`, structured data untouched (lives outside this Global entirely), sitemap unaffected.

**Performance.** Confirmed unchanged: same SSG caching behavior, same bundle size, hero image optimization explicitly preserved (§1.7) rather than silently traded away.

**Access control.** Verified the same way as Security — `adminOrEditor` on `update`, `anyone` on `read` (public marketing content, matches every other public-facing collection's pattern).

**Revalidation.** Zero new revalidation code — reuses `revalidateGlobalAfterChange` verbatim from `SiteSettings`, a hook already proven live in production.

## 6. Risks carried forward (unchanged from the approved plan, now confirmed rather than theoretical)

- No draft/publish on this Global means every Save is instantly live, sitewide — by design, per approved decision #5, but worth restating: there is no "stage it, then publish" step here the way there is for Pages/Testimonials/Case Studies.
- `heroImage`/`founderImage` require a developer to add a file to `/public` before an editor can point to it — not a fully self-service image workflow. Documented directly in the field UI (§1.7), not hidden.
- Featured Services' per-card override design is more schema surface than a plain relationship picker — the direct, accepted cost of preserving today's bespoke homepage copy exactly (approved decision #2).

## 7. Recommendation

All 12 numbered requirements from the brief are implemented and verified live, not just code-reviewed: exact design preserved (word-for-word content parity, confirmed), no public URLs changed, SEO and structured data unaffected, performance and caching behavior unaffected, a Global (not a collection) was used, the seed process is idempotent and verified to refuse a second run, work is entirely on `feat/phase4a-homepage-cms`, and the full validation suite (rendering, SEO metadata, structured data, sitemap, build, TypeScript, admin editing best-effort) all pass. One real cross-page dependency (`process`) was caught and correctly handled before it could break anything, and one real performance-vs-flexibility tradeoff (hero image) was resolved in favor of preserving performance, matching the explicit requirement over a more "flexible" but slower alternative.

**Ready for review and merge**, subject to the same human sign-off used for Phases 2 and 3 — this report stops short of merging or deploying, per explicit instruction.
