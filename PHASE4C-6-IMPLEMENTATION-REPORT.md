# Phase 4C.6 — Breadcrumb Schema Completion: Implementation Report

Based on `PHASE4C-SEO-PLAN.md` §H and `SEO-ARCHITECTURE-REVIEW.md` §2's confirmed gap: `breadcrumbSchema()` already existed and was reused on 4 page types, but was missing from the Pages catch-all and all 3 hub pages (`/services/`, `/case-studies/`, `/insights/`). Branch: `feat/phase4c-6-breadcrumb-completion` (off `main` @ `8e18a51`).

## 1. What shipped

Wired the existing, unmodified `breadcrumbSchema()` into 4 pages that previously emitted none:

| Page | Breadcrumb JSON-LD added |
|---|---|
| `/{slug}/` (Pages catch-all) | `[{ name: page.title, path: /${page.slug}/ }]` — single-level, since Pages have no natural parent hub |
| `/services/` (hub) | `[{ name: "Services", path: "/services/" }]` |
| `/case-studies/` (hub) | `[{ name: "Case Studies", path: "/case-studies/" }]` |
| `/insights/` (hub) | `[{ name: "Insights", path: "/insights/" }]` |

Each single-level entry mirrors what each page's own already-visible `<Breadcrumb>` UI component shows.

## 2. A pre-existing convention followed, not changed

Every existing call site of `breadcrumbSchema()` (Services detail, Case Study detail, Article detail, `/digital-assessment/`, `/about/ralph-chbib/`) omits a "Home" entry — the JSON-LD breadcrumb starts at the first real segment, even though the *visible* `<Breadcrumb>` component always prepends a "Home" link of its own. This is a pre-existing inconsistency between the visual and structured-data breadcrumbs, not introduced by this sub-phase — noted here for visibility, not changed, since fixing it would touch all 4 existing call sites and wasn't part of this sub-phase's scope (breadcrumb *completion*, not breadcrumb *correction*).

## 3. Files changed

| File | Change |
|---|---|
| `app/(app)/[slug]/page.tsx` | +breadcrumb JSON-LD |
| `app/(app)/services/page.tsx` | +breadcrumb JSON-LD |
| `app/(app)/case-studies/page.tsx` | +breadcrumb JSON-LD |
| `app/(app)/insights/page.tsx` | +breadcrumb JSON-LD |

No schema/database change — pure code, matching `SEO-SCHEMA-CHANGES.md` §7's scoping (code-only). `breadcrumbSchema()` itself was not touched.
