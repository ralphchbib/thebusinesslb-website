# Phase 6B — Validation Plan

Defines how Phase 6B's implementation (whenever it proceeds) will be validated, following this project's established discipline of live, evidence-based verification over assumption — the same standard applied in every prior phase's validation and release-review reports.

## 1. Block validation

For each of the 6 new MVP blocks (Statistics, Logo Cloud, Feature Grid, Pricing, Process/Timeline, Comparison Table):

- **Schema push verification**: confirm new `pages_blocks_*` tables (and `_pages_v_blocks_*` version-table counterparts) are purely additive — direct table inspection, same method used in Phase 6A's validation report, before any content is created.
- **Isolated rendering**: create one real test Page per block (or one combined test Page with all 6, following the Phase 6A pattern of "all new block types together on one document"), verify each renders correctly from live HTML, including the `isVisible: false` hide-without-delete behavior every block must support.
- **Relationship-backed blocks specifically** (Pricing if built relationship-style): verify order-preserving, published-only resolution via the `getXByIds` pattern — including the empty-selection fallback behavior if one is defined, exactly as `ServicesGridBlock`'s "empty = all published" was verified in Phase 6A.
- **Comparison Table's fixed 2-column constraint**: verify the admin UI genuinely prevents row/column misalignment (the specific failure mode the Block Gap Analysis's design choice was meant to avoid) — attempt to reproduce a misalignment deliberately (delete a row, add a row) and confirm the data model holds up.
- **Drag-and-drop persistence**: reuse Phase 6A's validated method — reorder the block array via `payload.update()` (same operation the admin UI's drag handles call), confirm order persists, restore original order. No new code path to test since this is a native Payload feature.
- Cleanup: every test Page and any temp user created for validation must be deleted afterward, with a 0-remaining-records check — matching the standing project convention.

## 2. SEO validation

- **`pageType` extension**: confirm the new enum options (`service-landing`, `industry-landing`, `location-landing`, `event`) save and load correctly, and that existing Pages with the old three values (`landing`/`campaign`/`seasonal`) are unaffected (a `select` field option-list addition should never require a data migration, but confirm no existing Page's `pageType` value is altered).
- **Conditional `noindex` default**: verify a newly-created `campaign`/`seasonal` Page defaults to `noindex: true` while `service-landing`/`industry-landing`/`location-landing`/plain `landing` default to `false` — check both the admin-form default and the actual rendered `<meta name="robots">` on a fresh, unedited Page of each type.
- **`serviceSchema()` wiring**: for a test Page with `pageType: service-landing` (or industry/location), confirm `Service` JSON-LD appears in the rendered HTML with correct `serviceType`/`name`/`description`/`areaServed`, and confirm it does NOT appear on a plain `landing`/`campaign`/`seasonal` page (the conditional must not over-fire).
- **`offerSchema()` for Pricing block**: confirm `Product`/`Offer` JSON-LD appears when a Pricing block is present, with values matching the block's own `name`/`price` fields exactly.
- **Sitemap priority/frequency differentiation**: fetch `/sitemap.xml` and confirm entries for each `pageType` carry the expected `priority`/`changeFrequency` per the SEO Strategy's mapping, not the old flat `0.6`/`monthly` for every non-home page.
- **Regression check**: re-run the exact FAQ-schema, canonical, Open Graph, and metadata checks already proven in Phase 6A's validation to confirm zero regression to existing behavior — these should not need to change at all, and a passing re-run is the evidence for that claim rather than an assumption.

## 3. Preview validation

- Full draft → preview → publish → version-history cycle, once per new block type, through the real admin UI (not scripted where the real UI can be used, per this project's established preference for exercising actual editor-facing controls) — reusing the exact method validated in Phase 6A: Save Draft, click the real Preview button (using the live `PREVIEW_SECRET`, never reconstructed), confirm draft isolation via a cookie-free fetch, Publish, confirm live, check Version History shows the expected sequence, Exit Preview clears Draft Mode correctly.
- Since preview infrastructure itself is unchanged (Architecture Review §6), this validation exists to confirm the **new blocks don't break** the existing mechanism — e.g., a Comparison Table's nested array-of-arrays-like structure surviving a draft→publish round-trip intact, not to re-prove the mechanism itself.

## 4. Build validation

- `tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` — clean-state re-run (clear `.next`, `node_modules/.cache`, `tsconfig.tsbuildinfo` first), same standard as every prior phase.
- Explicitly watch for, and don't panic over, the known transient Supabase pooler connectivity flake (`(ENOTFOUND) tenant/user postgres.zuclv not found`) seen repeatedly during `generateStaticParams` builds in this project's history — confirm via a direct DB query + build retry if it recurs, exactly as done in Phase 6A's release review, rather than treating it as a new defect.
- Confirm route count in the build output increases only by whatever new literal routes (if any) Phase 6B adds — and cross-check any new route segment against `lib/cms/reserved-slugs.ts` per the standing maintenance obligation (Architecture Review §5).

## 5. Performance validation

- Not previously a dedicated validation category in Phases 5B/5C/6A — added here specifically because the Risk Assessment flags media-heavy, many-block landing pages as a new-at-this-phase concern.
- Build one deliberately "maximal" test Page: all 14 block types (8 existing + 6 new) stacked on one document, each image-bearing block populated with a real image. Run a Lighthouse (or equivalent) performance pass against it, both preview and published states.
- Compare against a Lighthouse baseline for a typical existing Page (e.g., the current Hero+Text+Cta composition) to confirm the *marginal* cost of the new blocks is reasonable, not just that the maximal page is "fast enough" in isolation.
- Confirm Next Image optimization is correctly applied to every new image-bearing block (Logo Cloud logos, any Pricing/Stats icons if upload-based) — same verification method as Phase 6A's Hero background-image check (inspect the optimized `/_next/image/...` URL in rendered HTML).

## 6. Accessibility validation

- Not previously a dedicated validation category either — added here because 6 new presentational components are being introduced at once, higher than any single prior phase.
- For each new block: confirm semantic heading hierarchy (no skipped heading levels introduced by a block's own `h2`/`h3` choices relative to its position on the page), confirm every image (Logo Cloud especially) renders with the already-required Media `alt` text, confirm sufficient color contrast for any new "surface"-style options (following the existing `FaqPageBlock.surface: white | mist` pattern if new blocks adopt it), and confirm the Comparison Table is screen-reader-navigable as an actual `<table>` element with proper header association, not a div-grid approximation.
- A basic automated pass (axe-core or equivalent, run against the "maximal" test Page from §5) plus manual keyboard-navigation spot-check for any block with interactive elements (Pricing's CTA buttons, Comparison Table if it has any interactive toggle) is sufficient rigor for this phase — a full WCAG audit is not proportionate to a 6-block addition on a site with no prior accessibility-specific validation history to build on.

## 7. What stays unchanged from Phase 6A's validation approach

- Real production-adjacent testing over pure unit tests where the two diverge — this project's established preference, reconfirmed here.
- Transparent disclosure of any test-methodology mistakes found during validation (the Phase 6A release review's cookie-typo and unscoped-DOM-slice precedent) rather than treating a self-discovered test bug as either a hidden non-issue or a false product-bug alarm.
- Full test-artifact cleanup (temp Pages, temp users) with an explicit 0-remaining-records confirmation before declaring validation complete.
