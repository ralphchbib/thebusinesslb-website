# Phase 6B — Content Operations Guide

For whoever creates landing pages in `/admin/collections/pages/` — marketing/content editors, not developers. Covers naming, the pre-publish checklist, and the recurring cleanup habit the Landing Page Factory needs to stay healthy at volume. Process documentation, not code — nothing here is enforced by the schema (see `PHASE6B-RISK-ASSESSMENT.md` for why).

## 1. Choosing a `pageType`

Every Page now has 7 `pageType` options. Pick the one that actually matches the page's purpose — this drives its search-engine priority and whether it automatically gets Service structured data:

| pageType | Use for | Sitemap weight | Gets Service schema? |
|---|---|---|---|
| Service landing page | A specific service offering, standalone from `/services/` (e.g. "Ecommerce Consulting") | High, evergreen | ✅ |
| Industry landing page | A pitch tailored to one industry (e.g. "Restaurant Marketing") | High, evergreen | ✅ |
| Location landing page | A pitch tailored to one city/region (e.g. "Website Design Beirut") | High, evergreen | ✅ |
| Campaign page | A time-boxed promotional offer (e.g. "Startup Launch Package") | Low, fast-changing | ❌ |
| Seasonal page | A calendar-tied offer (e.g. a holiday promotion) | Low, fast-changing | ❌ |
| Event page | A webinar/workshop/one-time event | Low, fast-changing | ❌ |
| Landing page | Anything that doesn't fit the above (general-purpose, the original default) | Standard | ❌ |

## 2. Slug naming convention

Fragmented, inconsistent slugs for near-identical intent (`website-design-lebanon` vs. `web-design-lebanon` vs. `websites-lebanon`) split search authority across multiple weak URLs instead of concentrating it on one strong page. Use:

- **Service landing pages**: `{service}` (e.g. `ecommerce-consulting`)
- **Industry landing pages**: `{service}-for-{industry}` or `{industry}-marketing` (e.g. `restaurant-marketing`)
- **Location landing pages**: `{service}-{location}` (e.g. `website-design-lebanon`, `seo-beirut`)
- **Campaign/Seasonal/Event pages**: `{offer-name}` (e.g. `startup-launch-package`)

Always lowercase, hyphenated, no dates baked into evergreen (service/industry/location) slugs — dates belong on campaign/seasonal/event slugs where the page's short lifespan is part of its identity.

## 3. Pre-publish checklist

Preview is a required step, not optional — this CMS has no separate approval workflow beyond Editor/Admin roles (see `PHASE6B-RISK-ASSESSMENT.md`'s Editorial Risks), so reviewing your own draft via Preview before clicking Publish is the only quality gate that exists. Before publishing any landing page:

- [ ] **Distinct copy check** — if this page is a location/industry variant of an existing page (e.g. a second city, a second industry), confirm the H1, intro paragraph, and at least one FAQ or Rich Content section contain genuinely different substance, not a find-and-replace of one word. This is the single biggest defense against duplicate-content search penalties (see `PHASE6B-SEO-STRATEGY.md` §2) — the schema cannot check this for you.
- [ ] **`pageType` set correctly** — see §1. Wrong category means wrong sitemap priority and a missed (or wrongly emitted) Service schema.
- [ ] **`noindex` reviewed** — for Campaign/Seasonal/Event pages, confirm whether this page should actually be hidden from search results (recommended if it's genuinely short-lived and thin) or intentionally left indexed. Pages created via API/bulk tooling default this to checked automatically for Campaign/Seasonal `pageType`; pages created by hand in the admin UI do not auto-check it — verify it yourself.
- [ ] **`seoTitle`/`seoDescription` filled in and specific** to this page, not copy-pasted from a sibling page.
- [ ] **Preview reviewed** — click the Preview button and actually look at the rendered page before publishing.
- [ ] **Slug follows the convention** in §2.

## 4. Block composition guidance

Not required, but a starting-point recipe per page type (see `PHASE6B-LANDING-PAGE-FACTORY-PLAN.md` §1/§3 for the full reasoning):

- **Service/Industry/Location landing pages**: Hero → Feature Grid or Rich Content → Logo Cloud (cold-traffic trust) → Pricing or Services Grid → Testimonials → FAQ → CTA
- **Campaign pages**: Hero → Statistics → Pricing → CTA (keep it short and focused on one offer)
- **Event pages**: Hero → Process/Timeline (agenda) → Feature Grid → CTA

Placement notes: Logo Cloud and Statistics work best early (right after Hero) on pages targeting visitors with no prior brand familiarity. Testimonials read best after a Pricing or Feature Grid section, once the visitor has seen what they'd be getting. Every page should end in a CTA block or Hero CTA pointing at `/contact/` or `/digital-assessment/` — the two proven conversion endpoints.

## 5. Quarterly unpublish review

Every quarter, review all Pages with `pageType: campaign`, `seasonal`, or `event`:

- If the offer/event has genuinely ended and the page has no ongoing value, **unpublish it** (switch to Draft — don't delete, so the content and its edit history are preserved for reuse).
- If it's still relevant, leave it published and re-confirm its `noindex` setting still makes sense.

This keeps the sitemap and crawl budget focused on genuinely current content, and avoids a visitor landing on a page for an offer that expired months ago. See `PHASE6B-RISK-ASSESSMENT.md`'s SEO Risks for why this matters more as page volume grows.

## 6. What this guide does not cover

- **Analytics/performance tracking** — this CMS has no built-in analytics. Track landing-page performance in whatever web analytics tool the business already uses; this guide only covers content creation and hygiene, not measurement.
- **Contact Form / Lead Magnet blocks** — not part of this phase (see `PHASE6B-BLOCK-GAP-ANALYSIS.md`). Until they ship, every landing page's conversion path is a link-based CTA to `/contact/` or `/digital-assessment/`.
