# Phase 4C — Validation Strategy

Forward-looking testing plan for when Phase 4C is implemented (per sub-phase in `SEO-IMPLEMENTATION-SEQUENCE.md`). This is a plan, not an execution — no code exists yet to validate, consistent with this being a planning-only deliverable.

## 1. Standard gate (every sub-phase, unchanged from every prior phase)

```
npx tsc --noEmit      — must be clean
npm run lint           — must be clean
npm run test            — must pass, count unchanged or increased
npm run build             — must pass, route count unchanged (no route should disappear or newly fail to prerender)
```

This is the same bar Phase 4B, 4B.2, and both incident fixes were held to — no new tooling needed for Phase 4C specifically.

## 2. Structured-data validation (new for this phase, since JSON-LD is the largest surface area being touched)

For every page gaining or changing JSON-LD (`WebSite` on Homepage, `articleSchema()` on Articles, `faqSchema()` on the 4 newly-wired pages, `breadcrumbSchema()` on Pages/hub pages, any `organizationSchema()` field-sourcing change):

1. **Render the page locally, extract the `<script type="application/ld+json">` output**, and validate it against Google's Rich Results Test and the schema.org validator (both external tools — used read-only, no data submitted beyond the public page markup itself, consistent with this project's privacy posture).
2. **For the Article schema centralization specifically** (`SEO-RISK-ASSESSMENT.md` §4): diff the JSON-LD output for every existing published Article, before vs. after the refactor, in isolation from the new `image` field addition. The refactor step must produce identical output to the current inline implementation; the `image` field addition is a separate, additive diff on top of that confirmed-identical baseline.
3. **Spot-check a sample of each affected content type** (at least 1 Service, 1 Article, 1 Page with and without `noindex`, 1 Case Study unaffected-baseline) rather than exhaustively checking every record — proportionate to the low risk profile established in the risk assessment.

## 3. `noindex` behavioral verification (the one new mechanism in this plan)

1. Confirm a Page with `noindex: false` (default) renders `<meta name="robots" content="index, follow">` or no robots meta tag at all (Next's default when unset) — i.e., confirm the default truly does not change any existing Page's indexability.
2. Confirm a Page with `noindex: true` renders `<meta name="robots" content="noindex, follow">`.
3. Confirm the noindexed page is still correctly **excluded from `sitemap.xml`** if that's the intended behavior — or explicitly confirm it's included but marked noindex if not, since a noindexed-but-sitemapped page is a legitimate but different configuration choice worth deciding explicitly rather than leaving as an accidental side effect of whichever behavior the code happens to produce.

## 4. OG-image fallback chain verification (repeated per content type gaining the field: Services, Articles, Pages, plus Site Settings itself)

For each: verify all 3 levels of the fallback chain independently —
1. Content record has its own `ogImage` set → that image is used.
2. Content record's `ogImage` unset, `SiteSettings.defaultOgImage` set → the Site Settings image is used.
3. Both unset → the final hardcoded `/og/default.png` literal is used (confirms the site never regresses to a broken/missing image).

Same 3-level check for `defaultTwitterImage`, which has its own additional fallback to `defaultOgImage` before reaching the hardcoded literal — the deepest chain in this plan, worth its own explicit test.

## 5. Media resolution regression check (given direct precedent from the recent production incident)

Every new `ogImage`/`defaultOgImage`/`defaultTwitterImage` field is a `relationTo: "media"` reference. Before considering any sub-phase complete:
1. Confirm the resolved image URL in rendered OG/Twitter meta tags matches the same `/api/media/file/` proxy pattern already correctly working for `Homepage.ogImage` today — not a direct cloud-storage URL.
2. Confirm no new `next.config.ts` `remotePatterns` change is actually required (expected per the architecture, but worth confirming rather than assuming, given how costly the prior incident was).
3. Test the OG image in at least one real social-share debugging tool (e.g., a Facebook/LinkedIn OG-preview validator, or Twitter's Card Validator equivalent) for at least one page per content type — confirms the image is not just present in markup but actually fetchable by external crawlers (catches CORS/auth issues invisible to a local-only check).

## 6. Live rendering + regression sweep (matching the pattern established in `MEDIA-REVALIDATION-VALIDATION.md`)

Re-check every existing route after each sub-phase, same list used in Phase 4B.2's validation: `/`, `/services/`, `/services/{slug}/`, `/insights/`, `/insights/{slug}/`, `/pricing/`, `/about/`, `/about/how-we-work/`, `/about/ralph-chbib/`, `/contact/`, `/digital-assessment/`, `/case-studies/`, `/case-studies/{slug}/`, `/{page-slug}/`, `/sitemap.xml`, `/robots.txt`, `/admin/` — all must remain `200`, with the addition of confirming `/robots.txt`'s new AI-crawler rules are present and syntactically valid (a robots.txt parser will reject a malformed file silently in some crawlers, so a manual read-through of the rendered output is warranted, not just an HTTP 200 check).

## 7. `llms.txt` validation

Since this is informal/unstandardized (`PHASE4C-SEO-PLAN.md` §I), validation here is simpler: confirm the updated file accurately lists every current top-level content area (including Case Studies and Testimonials, the two gaps identified), and is syntactically plain enough to be readable by both humans and any tool that fetches it as plain text (no HTML, no broken markdown).

## 8. Revalidation confirmation

Since no new collections are proposed (`SEO-RISK-ASSESSMENT.md` §8), no new revalidation-hook testing is needed — existing hooks on `Services`/`Articles`/`Pages`/`Media` already cover the new fields automatically. Confirm this assumption holds by editing one new field (e.g., set a `noindex` toggle) via Payload's Local API and observing the same `revalidateAfterChange` stack-trace signature already established as proof-of-firing in `MEDIA-REVALIDATION-VALIDATION.md` — the same test methodology, not a new one.

## 9. Success criteria (validation-level, ties back to `PHASE4C-SEO-PLAN.md`)

A sub-phase is considered validated and ready to PR when:
- Standard gate (§1) is clean.
- Every JSON-LD block introduced or changed validates against Rich Results Test / schema.org validator with zero errors (warnings acceptable if pre-existing on unrelated fields, e.g., missing `aggregateRating` which is out of scope).
- Fallback chains (§4) behave correctly at all levels tested.
- Media resolution (§5) matches the established-correct pattern, with no `next.config.ts` change turning out to be necessary.
- Full regression sweep (§6) shows no route regression.
- For 4C.4 specifically: the before/after Article JSON-LD diff (§2.2) is confirmed clean before the new `image` field is layered on top.
- For 4C.5 specifically: both `noindex` states (§3) render the expected `robots` meta tag.

## 10. What this validation strategy deliberately does not cover

Consistent with `PHASE4C-SEO-PLAN.md` §I's explicit scope boundary: this plan does not include any attempt to measure or verify actual search-ranking movement, AI Overview inclusion, or any third-party indexing outcome — those are not deterministically testable in a pre-launch validation pass, and claiming otherwise would overstate what this plan can guarantee. Validation here is scoped to **correctness of the machine-readable signal produced**, not the downstream response of any external system consuming it.
