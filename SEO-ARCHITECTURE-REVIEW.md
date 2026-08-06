# Phase 4C — SEO Architecture Review (Current State)

Read-only audit findings. This document describes what exists **today**, precisely, with file references — the proposed additions are in `PHASE4C-SEO-PLAN.md`; exact field-level changes are in `SEO-SCHEMA-CHANGES.md`.

## 1. Metadata generation — `lib/seo/metadata.ts`

Single shared helper, used by all 17 route files:

```ts
buildMetadata({ title, description, path, ogImage? }) → {
  title: { absolute: ... },
  description,
  alternates: { canonical: `${siteConfig.url}${path}` },
  openGraph: { title, description, url, images: [ogImage ?? `${siteConfig.url}/og/default.png`], ... },
  twitter: { card: "summary_large_image", title, description, images: [...] },
}
```

**Finding**: canonical URL generation and Twitter Card metadata are already comprehensive and correct sitewide, as a side effect of this one helper's existing design — not gaps to be built, contrary to how Objectives 8 and 11 read in isolation. The only hardcoded, non-CMS-editable piece is the OG-image fallback (`/og/default.png`, a static file).

**Usage map** (confirmed via `grep -r 'from "@/lib/seo/metadata"' app/`): all 17 route files import and call `buildMetadata()`. No route generates metadata by hand outside this helper — full consistency, no exceptions found.

## 2. Structured data — `lib/seo/schema-org.ts`

102 lines, 6 exported functions:

| Function | `@type` | Notes |
|---|---|---|
| `organizationSchema()` | `ProfessionalService` | Sitewide, called once from root `layout.tsx`. Description/priceRange/areaServed are hardcoded literals, not CMS fields. `sameAs` built from `siteConfig.instagramUrl`/`linkedinUrl`. |
| `breadcrumbSchema(items)` | `BreadcrumbList` | Generic, reused across 4 page types |
| `faqSchema(faqs)` | `FAQPage` | Used on 2 of the (at least) 4 pages that render real FAQ content |
| `serviceSchema(params)` | `Service` | Used on Service detail pages and `/digital-assessment/` |
| `personSchema()` | `Person` | Hardcoded to the Founder; hardcoded URL `/about/ralph-chbib/` |
| `caseStudySchema(params)` | `Article` | Explicit in-code comment: "`Article` is the correct, valid schema.org type here — there's no dedicated 'case study' type in the vocabulary." Centralized correctly — the pattern every other type follows. |

**Finding — no `WebSite` schema type anywhere in the codebase.** This is the one schema.org type with zero implementation, not partial implementation.

**Finding — Article schema is NOT in this file.** `app/(app)/insights/[slug]/page.tsx` hand-writes its own `Article` JSON-LD inline (see §3) rather than calling a shared function, the only content type where this is true. `caseStudySchema()` produces a near-identical shape but lives correctly in the shared file — the inconsistency is specifically that Articles didn't follow the same pattern Case Studies did, despite being built to the same shape.

**Schema usage map** (confirmed via `grep -r 'from "@/lib/seo/schema-org"' app/`):

| Page | Schemas emitted |
|---|---|
| Root layout (sitewide) | `organizationSchema()` |
| `/case-studies/[slug]/` | `breadcrumbSchema` + `caseStudySchema` |
| `/digital-assessment/` | `breadcrumbSchema` + `faqSchema` + `serviceSchema` |
| `/about/ralph-chbib/` | `breadcrumbSchema` + `personSchema` |
| `/insights/[slug]/` | `breadcrumbSchema` (imported) + inline hand-written `Article` schema |
| `/services/[slug]/` | `breadcrumbSchema` + `faqSchema` + `serviceSchema` |
| **Homepage (`/`)** | **None beyond sitewide `organizationSchema()`** |
| `/case-studies/` (hub) | **None** |
| `/services/` (hub) | **None** |
| `/insights/` (hub) | **None** |
| Pages catch-all (`/{slug}/`) | **None** |
| `/pricing/` | **None** — despite rendering FAQ content |
| `/contact/` | **None** — despite rendering FAQ content |

**Finding**: the FAQ-schema gap on Homepage/`/contact/`/`/pricing/` was already identified in an earlier content audit (`CONTENT-GAPS-ANALYSIS.md`, referenced from an earlier phase) and remains unfixed — this is a known, previously-documented gap, not a new discovery.

## 3. Article schema — inline implementation

`app/(app)/insights/[slug]/page.tsx`, lines confirmed via full file read:

```ts
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: siteConfig.founder },
    publisher: { "@type": "Organization", name: siteConfig.name },
  },
  breadcrumbSchema([...]),
];
```

`generateMetadata()` on this same page calls `buildMetadata({ title: article.metaTitle, description: article.metaDescription, path: ... })` with **no `ogImage` argument** — there is no image field on `Articles` to supply one from.

## 4. `app/robots.ts` — current, full content

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/thank-you/", "/go/"] }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
```

One blanket rule. No per-crawler entries. AI crawlers (GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, ClaudeBot, CCBot, anthropic-ai, Bingbot) are covered only implicitly by the wildcard — never named or reasoned about explicitly.

## 5. `app/(app)/sitemap.ts`

Already dynamic, already includes Services/Articles/Pages/Case Studies slugs pulled live from the CMS. No gap identified in this file during this audit.

## 6. `public/llms.txt`

Exists, static, hand-written. Lists: Home, Digital Assessment, Services, Pricing, About, Ralph Chbib, Insights, Contact. **Does not mention Case Studies** (shipped Phase 3) or **Testimonials** (Phase 3), and predates all Phase 4A/4B capability. Confirmed stale by omission, not by incorrect content — everything listed is still accurate, it's simply incomplete relative to the site's current structure.

## 7. Per-collection SEO field inventory

| Collection/Global | SEO fields present | Image field | Canonical override | Noindex |
|---|---|---|---|---|
| `SiteSettings` (global) | **None** — confirmed via full field list: `siteName, slogan, serviceStatement, contactEmail, whatsappNumber, phoneDisplay, address, instagramHandle, instagramUrl, linkedinUrl, footerSlogan, footerServicesLine, footerCopyright, newsletterHeading, newsletterSub, newsletterConsent, servicesHubIntro, servicesHubConnectBody, servicesPricingTable` (+ nested array fields) | — | — | — |
| `Homepage` | `metaTitle`, `metaDescription` | `ogImage` (upload→media, optional) | No (auto via path — correct, not a gap) | No |
| `Services` | `metaTitle` (required, ≤60), `metaDescription` (required, ≤155) | **None** | No (auto) | No |
| `Articles` | `metaTitle` (required, ≤60), `metaDescription` (required, ≤155) | **None** | No (auto) | No |
| `Pages` | `seoTitle` (required, ≤60), `seoDescription` (required, ≤155) | **None** | No (auto) | **None** |
| `CaseStudies` | `seoTitle` (required, ≤60), `seoDescription` (required, ≤155) | `featuredImage` (upload→media, dual-purposed as OG image) | No (auto) | No |

**Finding**: Homepage and Case Studies are the only two content types with any image available for OG purposes today; Services, Articles, and Pages have no image field of any kind, not merely "no OG-specific image field" — this is a full gap, not a naming/purpose gap.

## 8. Architectural consistency notes

- **Canonical URL and Twitter Card generation is a solved problem sitewide** — the one clean, consistent piece of this system. Any Phase 4C work here should extend `buildMetadata()`'s inputs (e.g., where its OG-image fallback sources from), not rebuild it.
- **Structured data is the least consistent subsystem**: one function lives outside the shared file (`Article`, inline), one schema.org type is entirely unimplemented (`WebSite`), and coverage across pages is uneven with no discernible rule for which page types get which schemas beyond "whichever page happened to need it when it was built."
- **The Media relationship pattern (Phase 4B) is the correct, established way to add any new image field** — every existing OG-image-capable field (`Homepage.ogImage`, `CaseStudies.featuredImage`) already uses `upload: true, relationTo: "media"`, not a plain URL/text field. Any Phase 4C image field must follow this precedent, both for consistency and to avoid reintroducing the plain-URL pattern Phase 4B was built specifically to retire.
- **`noindex` has no precedent anywhere in the codebase** — this would be a genuinely new capability, not an extension of an existing pattern, the one true "net-new mechanism" in the entire Phase 4C scope (everything else is either a new field following an established pattern, or a new call to an existing function).
