# CMS Specification — THE BUSINESS lb

**Status:** Blueprint only — no code written against this document yet.
**Method:** Every row below was produced by reading the actual current
codebase (`app/`, `components/`, `content/`, `lib/`), not by inference from
the original strategy document. File paths are cited so this spec can be
verified line-by-line against what's actually deployed.

---

## 0. Architecture note — two schemas, not one

This site already has a working Postgres database (Supabase + Drizzle) —
but it stores **lead data**, not **content**: `assessment_applications`,
`contact_submissions`, `newsletter_subscribers` (`lib/db/schema.ts`). That
schema is live in production, receiving real submissions, and is **out of
scope for this CMS** — it doesn't change.

Everything in *this* document describes a **second, separate schema** for
**marketing content** — the text, images, and structure currently hardcoded
in `content/*.ts` and `components/**/*.tsx`. Today, changing a headline
requires editing a `.ts` file and redeploying. The CMS's job is to move
that content into the database so it can be edited without a code deploy.

The two schemas will eventually share one concept: a CMS-managed `services`
table's slug (e.g. `shopify-ecommerce`) is the same string currently
hardcoded as `service_interest` enum values in the lead schema. That
coupling is noted where it matters below.

---

## 1. Content inventory

Format: `SECTION | Current Content Source | Editable | CMS Screen | Database Table`

### 1.1 Global — Header, Navigation, Footer

*Shared across every page. Source: `components/layout/*.tsx`, `content/site.ts`.*

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Logo (ink/white variants) | `public/logo-wordmark-*.svg`, rendered by `components/layout/logo.tsx` | No — brand asset, not content | — | — |
| Primary nav labels (Services / Insights / About / Contact) | `content/site.ts` -> `nav` | Yes | Navigation Manager | `navigation_items` |
| Header CTA button label + link | `components/layout/header.tsx` (hardcoded "Get your assessment") | Yes | Navigation Manager -> Header Settings | `site_settings` |
| Services mega-menu — Column 1 links | `content/site.ts` -> `megaMenuServices` | Yes | Navigation Manager | `navigation_items` |
| Services mega-menu — Column 2 links + CTA card | `content/site.ts` -> `megaMenuStartHere`, `components/layout/mega-menu.tsx` | Yes | Navigation Manager | `navigation_items` |
| Mobile drawer structure | `components/layout/mobile-drawer.tsx` (mirrors main nav + WhatsApp/email buttons) | Yes (inherits from primary nav) | Navigation Manager | `navigation_items` |
| Sticky mobile action bar copy/behavior | `components/layout/sticky-action-bar.tsx` (WhatsApp / "Get your assessment" / per-service price) | Partially — labels yes, the price-lookup logic is code, not content | Site Settings | `site_settings` |
| Footer column headings + links (Services / Company / Start here) | `content/site.ts` -> `footerColumns` | Yes | Navigation Manager | `navigation_items` |
| Footer company info (email, location, Instagram) | `lib/config.ts` -> `siteConfig` | Yes | Site Settings | `site_settings` |
| Footer newsletter block heading/sub/consent text | `content/site.ts` -> `newsletter` | Yes | Site Settings -> Newsletter | `site_settings` |
| Footer base bar (slogan, tagline, copyright, legal links) | `content/site.ts` -> `footerCopy` | Yes | Site Settings | `site_settings` |
| WhatsApp number | `lib/config.ts` -> `siteConfig.whatsappNumber`, env fallback | Yes | Site Settings | `site_settings` |
| Phone / street address / LinkedIn URL | `lib/config.ts` — currently **blank**, intentionally not invented | Yes | Site Settings | `site_settings` |

### 1.2 Homepage — `app/page.tsx` (12 blocks, per the original spec's section 6.5)

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| 1. Hero (eyebrow, H1, sub, 2 CTAs, reassurance line, portrait image) | `content/home.ts` -> `hero`, `components/blocks/hero.tsx` | Yes | Page Builder -> Home | `page_blocks` (type `hero`) |
| 2. Positioning bar (one-line strip) | `content/home.ts` -> `positioning` | Yes | Page Builder -> Home | `page_blocks` (type `text_strip`) |
| 3. Problem block (eyebrow, H2, 2 body paragraphs, quote, 6 symptom bullets) | `content/home.ts` -> `problem` | Yes | Page Builder -> Home | `page_blocks` (type `problem`) |
| 4. Service grid (5 cards: 2 "revenue engine" + 3 standard) | `content/home.ts` -> `services.cards` — but `href` fields point at CMS `services` records | Yes, with card **selection** locked to real `services` rows (can't invent a 6th fake service here) | Page Builder -> Home | `page_blocks` + FK refs into `services` |
| 5. Transformation strip (7 stages: stage/where/what) | `content/home.ts` -> `transformation.stages` | Yes | Page Builder -> Home | `page_blocks` (type `stage_strip`), repeatable field group |
| 6. Assessment block (dark section — eyebrow, H2, body, quote, offer text, 5 deliverable bullets) | `content/home.ts` -> `assessmentBlock` | Yes | Page Builder -> Home | `page_blocks` (type `dark_cta`) |
| 7. Process block (5 numbered steps + 4 trust statements) | `content/home.ts` -> `process` | Yes | Page Builder -> Home | `page_blocks` (type `process`) |
| 8. Founding clients (retire-by-date block per spec — body, 4 offer bullets, CTA) | `content/home.ts` -> `foundingClients` | Yes — **flag as time-limited**; CMS should support a "retire after" date so it doesn't get forgotten in production | Page Builder -> Home | `page_blocks` (type `founding_clients`), `expires_at` field |
| 9. Sector grid (10 sector tiles + 5 qualifier lines) | `content/home.ts` -> `sectors` | Yes | Page Builder -> Home | `page_blocks` (type `tile_grid`) |
| 10. Founder block (quote, short bio, portrait, link to full story) | `content/home.ts` -> `founder` | Yes, portrait via Media Library, quote/bio synced with `people` table (see 1.8) | Page Builder -> Home + Media Library | `page_blocks` + FK into `people` |
| 11. Insights row (3 featured article cards) | Auto-pulled from `content/insights/*` — currently always "3 most recent" | Yes — should become "pick 3 specific articles OR auto-latest" toggle | Page Builder -> Home | `page_blocks` (type `article_picker`) |
| 12. Final CTA + inline contact form | `content/home.ts` -> `finalCta`, form itself is `components/forms/contact-form.tsx` | Copy yes; form fields no (see 1.15) | Page Builder -> Home | `page_blocks` (type `cta_form`) |
| Homepage FAQ | `content/home.ts` -> `faq[]` (5 items) | Yes | FAQ Manager | `faqs` (scope=`global`, shown on home) |

### 1.3 Services Hub — `app/services/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| H1 + intro paragraph | `content/services/index.ts` -> `servicesHub.h1`, `.intro` | Yes | Page Builder -> Services Hub | `pages` |
| Service card grid (5 cards, auto-generated from all published services) | Iterates `serviceOrder` / `services` registry | Dynamic — no manual editing needed, reflects `services` table `is_published` + `order` | Services Manager (ordering only) | `services` |
| "Most clients follow the same path" narrative block | `servicesHub.connect` | Yes | Page Builder -> Services Hub | `page_blocks` |
| Indicative pricing table (4 rows: package/covers/range) | `servicesHub.pricing` | Yes | Page Builder -> Services Hub | `page_blocks` (type `pricing_table`) |
| Hub-level FAQ | `servicesHub.faqs` | Yes | FAQ Manager | `faqs` (scope=`pricing` or new scope `services_hub`) |

### 1.4 Service Detail Template — `app/services/[slug]/page.tsx` (5 live instances)

*One template, five content records. This is the clearest, highest-value CMS candidate — a non-technical editor should be able to launch a 6th service without a developer.*

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Slug (URL segment) | `content/services/types.ts` -> `slug` | Yes, with uniqueness + reserved-word validation | Services Manager | `services.slug` |
| Meta title / description | `.metaTitle` / `.metaDescription` | Yes, with character-count guardrails (<=60 / <=155, per spec 10.3) | Services Manager -> SEO tab | `services` |
| Eyebrow label (e.g. "Revenue engine 01") | `.eyebrow` | Yes, optional | Services Manager | `services` |
| H1 | `.h1` | Yes | Services Manager | `services` |
| Price anchor + timeline summary | `.priceAnchor`, `.timelineSummary` | Yes | Services Manager | `services` |
| Intro paragraph | `.intro` | Yes | Services Manager | `services` |
| Local problem block (H2, intro, N items of title+body, closing note) | `.localProblem` | Yes, repeatable item group | Services Manager | `service_local_problem_items` |
| Packages (3 tiers: name, price display, summary, inclusions[], isRecommended) | `.packages[]` | Yes — enforce **exactly one `isRecommended=true`** per service (existing spec rule 10.3) | Services Manager -> Packages tab | `service_packages` |
| Inclusions list | `.inclusions[]` | Yes | Services Manager | `service_inclusions` |
| Exclusions list | `.exclusions[]` | Yes — **required non-empty**, matches existing hard rule in spec 10.3 ("never publish a service page without them") | Services Manager | `service_exclusions` |
| Client-provides list | `.clientProvides[]` | Yes, optional | Services Manager | `service_client_provides` |
| Timeline steps (label + body) | `.timeline[]` | Yes, repeatable | Services Manager | `service_timeline_steps` |
| "After launch" block (optional, currently only on Shopify page) | `.afterLaunch` | Yes, optional | Services Manager | `services` (nullable jsonb or child table) |
| Service-specific FAQ | `.faqs[]` | Yes | FAQ Manager (scope=`service`, linked to service) | `faqs` |
| Related services (exactly 3) | `.relatedServices[]` | Yes — **must enforce count = 3** per spec 10.3 | Services Manager | `service_related` (join table) |
| Publish state / nav order | Currently implicit (all 5 always shown) | Yes | Services Manager | `services.is_published`, `services.order` |

### 1.5 Digital Business Assessment — `app/digital-assessment/page.tsx`

*Single most important page on the site — the primary conversion target.*

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Hero (badge, H1, sub, 2 CTAs, micro-copy, "what you receive" tiles) | `content/assessment.ts` -> `hero` | Yes | Page Builder -> Assessment | `page_blocks` |
| "Why this exists" block + pull quote | `assessment.why` | Yes | Page Builder -> Assessment | `page_blocks` |
| 11 assessment areas (area name + question) | `assessment.areas[]` | Yes, repeatable — but changing these has product implications (they describe the actual deliverable), so pair with an Admin-only warning | Page Builder -> Assessment | `page_blocks` (type `area_grid`) |
| Deliverable list (8 bullets) | `assessment.deliverable[]` | Yes | Page Builder -> Assessment | `page_blocks` |
| 6-step "how it works" | `assessment.steps[]` | Yes | Page Builder -> Assessment | `page_blocks` |
| "Why it's free" block (ink section, 3 exchange terms) | `assessment.free` | Yes — **flag as time-limited** (spec explicitly says retire the "first five free" framing once real clients exist) | Page Builder -> Assessment | `page_blocks`, `expires_at` |
| Form heading/intro/submit label/consent text | `assessment.form` | Copy yes; the 11 actual form fields are code, not CMS content (see 1.15) | Page Builder -> Assessment | `page_blocks` |
| Assessment-page FAQ | `assessment.faqs[]` | Yes | FAQ Manager (scope=`assessment`) | `faqs` |
| Thank-you copy (H1, personalized lead line, 3 next-steps, reading list) | `content/assessment.ts` -> `thankYouAssessment` | Yes | Page Builder -> Thank-You Pages | `page_blocks` |

### 1.6 Pricing — `app/pricing/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| H1 + intro | Hardcoded in `app/pricing/page.tsx` | Yes | Page Builder -> Pricing | `pages` |
| Indicative pricing table | Reuses `servicesHub.pricing` | Yes (shared with 1.3) | Page Builder -> Pricing | `page_blocks` (shared block reference) |
| "By service" cards (auto from `services`) | Dynamic | No manual entry — reflects `services` table | — | `services` |
| Closing CTA (ink section) | Hardcoded copy | Yes | Page Builder -> Pricing | `page_blocks` |
| Pricing FAQ | Reuses `servicesHub.faqs` | Yes (shared) | FAQ Manager | `faqs` (scope=`pricing`) |

### 1.7 About — `app/about/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| H1 + intro | `content/about.ts` -> `about.h1`, `.intro` | Yes | Page Builder -> About | `pages` |
| "Why" block (H2, subhead, body) | `about.why` | Yes | Page Builder -> About | `page_blocks` |
| 5 beliefs (numbered title + body) | `about.beliefs.items[]` | Yes, repeatable | Page Builder -> About | `page_blocks` |
| 5 divisions (name + one-line body) | `about.divisions[]` | Yes, repeatable | Page Builder -> About | `page_blocks` |
| Founder pull-quote (ink section) | `about.founderQuote`, `.founderQuoteAttribution` | Yes — synced with `people` record | Page Builder -> About | FK into `people` |
| 3-stage roadmap (Now / Next / Eventually) | `about.roadmap.stages[]` | Yes | Page Builder -> About | `page_blocks` |

### 1.8 Founder Page — `app/about/ralph-chbib/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Eyebrow, H1 | `content/about.ts` -> `founderPage` | Yes | People Manager | `people` |
| Narrative (currently 3 paragraphs — flagged in spec as the single highest-priority content gap) | `founderPage.narrative[]` | Yes, rich text / repeatable paragraphs | People Manager | `people` (or `person_bio_blocks` if it needs mixed formatting) |
| Pull quote | `founderPage.quote` | Yes | People Manager | `people` |
| Portrait photo | `public/ralph-chbib-source.png` (currently 375x500px — below the >=2000px spec requirement) | Yes, via Media Library | People Manager + Media Library | `media`, referenced by `people.photo_id` |
| "Works directly on every project" line | `founderPage.workDirectly` | Yes | People Manager | `people` |

### 1.9 How We Work — `app/about/how-we-work/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| H1 + intro | `content/about.ts` -> `howWeWork` | Yes | Page Builder -> How We Work | `pages` |
| 5-stage process cards | Reuses `content/home.ts` -> `process.steps` | Yes (shared block with homepage 1.2.7) | Page Builder -> How We Work | `page_blocks` (shared reference) |
| 4 trust statements | Reuses `process.trust` | Yes (shared) | Page Builder -> How We Work | `page_blocks` (shared reference) |

### 1.10 Insights — Hub (`app/insights/page.tsx`) + Article Template (`app/insights/[slug]/page.tsx`)

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Hub H1 + intro | Hardcoded in `app/insights/page.tsx` | Yes | Page Builder -> Insights | `pages` |
| Article grid | All published `content/insights/*` articles, newest first | Dynamic | — | `articles` |
| Newsletter block (hub + footer, shared component) | `content/site.ts` -> `newsletter` | Yes (shared with 1.1) | Site Settings | `site_settings` |
| Article: slug, title, excerpt | `content/insights/types.ts` -> `Article` | Yes, slug uniqueness enforced | Article Manager | `articles` |
| Article: meta title/description | `.metaTitle`, `.metaDescription` | Yes, with length guardrails | Article Manager -> SEO tab | `articles` |
| Article: topic taxonomy | `.topic` (enum: ecommerce/websites/social/ai/strategy/lebanon-business) | Yes — should become a managed taxonomy, not a hardcoded enum, so new topics don't require a code change | Category Manager | `article_categories` |
| Article: published date, reading time | `.publishedAt`, `.readingMinutes` | Published date yes; reading time — auto-calculated from body word count, editable override | Article Manager | `articles` |
| Article: body (mix of paragraphs/headings/bulleted lists) | `.body[]` — typed blocks: `p` / `h2` / `list` | Yes — this is the clearest case for a **rich text editor**, not raw TS objects | Article Manager (Page Builder-style block editor) | `article_blocks` |
| Article: related services | `.relatedServices[]` | Yes, FK picker into `services` | Article Manager | `article_related_services` |
| Article: author | Implicit — always Ralph, not currently a real field | Yes — should become explicit `author_id` | Article Manager | FK into `people` |

### 1.11 Contact — `app/contact/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| H1 + intro | `content/contact.ts` -> `contact.h1`, `.intro` | Yes | Page Builder -> Contact | `pages` |
| Channel cards (WhatsApp "fastest" / Email / Location) | `contact.channels` | Copy yes; the actual WhatsApp number and email are `site_settings`, not per-page content | Page Builder -> Contact | `page_blocks` + FK into `site_settings` |
| "What to expect" (3 numbered steps) | `contact.next.items[]` | Yes | Page Builder -> Contact | `page_blocks` |
| Exit-ramp block (petrol-veil section) | `contact.exitRamp` | Yes | Page Builder -> Contact | `page_blocks` |
| Contact-page FAQ | `contact.faqs[]` | Yes | FAQ Manager (scope=`contact`) | `faqs` |
| Thank-you copy | `content/contact.ts` -> `thankYouContact` | Yes | Page Builder -> Thank-You Pages | `page_blocks` |

### 1.12 Thank-You Pages — `app/thank-you/[type]/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Assessment / Contact / Subscribe variants | `content/assessment.ts`, `content/contact.ts` | Yes (already covered in 1.5, 1.11) | Page Builder -> Thank-You Pages | `page_blocks` |
| "While you wait" reading list (assessment variant) | Auto-pulled: 3 most recent articles | Dynamic, same pattern as 1.2 block 11 | — | `articles` |

### 1.13 Legal — Privacy Policy & Terms — `app/privacy-policy/page.tsx`, `app/terms/page.tsx`

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Full body text (currently genuine working drafts, flagged as needing lawyer review) | Hardcoded JSX in each page file | Yes — but **Admin-only**, given legal/compliance sensitivity | Legal Pages Manager | `pages` (template=`legal`), rich text |
| "Last updated" date | Hardcoded | Yes — should auto-set on save, not manually typed (prevents a stale date sitting on a changed policy) | Legal Pages Manager | `pages.updated_at` |

### 1.14 System / SEO / Structured Data

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Sitemap (`app/sitemap.ts`) | Auto-generated from route list + `services` + `articles` | No — logic, not content | — | derived from `pages`/`services`/`articles` |
| Robots.txt (`app/robots.ts`) | Hardcoded disallow rules | Yes, rarely changed | SEO Settings | `site_settings` |
| `llms.txt` (`public/llms.txt`) | Static file | Yes | SEO Settings | `site_settings` |
| Per-page canonical/OG metadata (`lib/seo/metadata.ts`) | Built from each page's title/description | Yes, per-page (already covered above) | Per-page SEO tabs | `pages.seo_*`, `services.seo_*`, `articles.seo_*` |
| Organization JSON-LD (`lib/seo/schema-org.ts`) | Built from `siteConfig` | Yes | SEO Settings -> Structured Data | `site_settings` |
| Default OG image (`public/og/default.png`) | Static generated image, shared by every page (known gap — spec wants unique per page) | Yes, via Media Library | Media Library + per-page SEO tab | `media`, referenced by `*.og_image_id` |
| Favicon / monogram (`public/monogram.svg`) | Static placeholder asset | Yes (brand asset, Admin-only) | Site Settings -> Branding | `media` |

### 1.15 Forms

*Distinguish sharply between form **copy** (editable) and form **field structure** (not editable via CMS — changing a field name breaks the Zod schema, the DB column, and the email notification template simultaneously).*

| SECTION | Current Content Source | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Assessment form — field labels, helper text, step headings | `components/forms/assessment-form.tsx`, `content/assessment.ts` | Yes | Page Builder -> Assessment | `page_blocks` |
| Assessment form — field list/order/validation rules | `lib/validation/schemas.ts`, `lib/db/schema.ts` | **No** — requires a developer; this is the lead schema, not CMS content | — | existing `assessment_applications` schema, out of CMS scope |
| Contact form — field labels, submit button copy | `components/forms/contact-form.tsx`, `content/contact.ts` | Yes | Page Builder -> Contact | `page_blocks` |
| Contact form — field list/validation | `lib/validation/schemas.ts` | **No** | — | existing `contact_submissions` schema |
| Newsletter form — heading/sub/consent copy | `content/site.ts` -> `newsletter` | Yes | Site Settings -> Newsletter | `site_settings` |
| Newsletter form — email field | Hardcoded, single field | **No** | — | existing `newsletter_subscribers` schema |
| Sector / budget / contact-preference option lists (chip options) | `lib/validation/schemas.ts` -> `sectorOptions`, `budgetOptions`, `contactPrefOptions` | **Debatable — recommend No for v1.** These values are hard-wired into the Postgres enum types (`sector`, `budget_bracket`) in the *existing* production lead schema. Editing them via CMS without a matching migration would break form submissions silently. | — | code + Postgres enum, out of CMS scope |

### 1.16 Images & Media (cross-cutting)

| Asset | Current Location | Editable | CMS Screen | Database Table |
|---|---|---|---|---|
| Wordmark logos (ink/white) | `public/logo-wordmark-*.svg` | No (locked brand asset) | — | — |
| Monogram / favicon | `public/monogram.svg`, `public/icon-*.png` | Admin-only | Site Settings -> Branding | `media` |
| Founder portrait | `public/ralph-chbib-source.png` | Yes | People Manager, Media Library | `media` |
| Default OG image | `public/og/default.png` | Yes | Media Library | `media` |
| Article hero images | **None currently exist** — articles are text-only today | Yes (net-new capability) | Article Manager, Media Library | `media`, `articles.hero_image_id` |
| Service/package icons | **None currently exist** — icon plates described in design system are not yet implemented in code | Yes (net-new) | Media Library | `media` |

### 1.17 Advertisements

**Current state: none.** This is a lead-generation agency site with zero
ad inventory, ad placements, or ad-serving code anywhere in the codebase —
confirmed by search, not assumed. There is nothing to inventory here today.

Because ad management was explicitly requested as a required deliverable,
section 8 below specifies a **forward-looking, opt-in module** — most
plausibly useful for the Phase 2 "partner network" concept already named in
the original strategy doc (`website-specification.md` section 12.2), e.g.
a sponsored listing in the future `/directory/` or a partner banner in
`/insights/`. It should **not** be built until there's an actual commercial
need for it.

---

## 2. Complete database schema

Naming convention: snake_case tables, `id uuid default gen_random_uuid()`
primary keys (matching the existing lead schema's convention), `created_at`
/ `updated_at` timestamps on everything mutable.

### 2.1 Content core

```
pages
  id, slug (unique), template (enum: standard | legal | system),
  title, meta_title, meta_description, og_image_id (FK -> media),
  is_published, published_at, updated_at, updated_by (FK -> users)

page_blocks
  id, page_id (FK -> pages, nullable — null if block belongs to a
    services/articles record instead), owner_type (enum: page | service |
    article), owner_id, block_type (enum — see block type list below),
  content (jsonb — shape validated per block_type at the application layer,
    not by Postgres), order, is_shared_ref (nullable FK -> page_blocks.id,
    for blocks reused across pages like the process steps on Home + How We
    Work), created_at, updated_at, updated_by

  Block types (enum), matching the inventory above:
    hero, text_strip, problem, service_card_grid, stage_strip, dark_cta,
    process, founding_clients, tile_grid, founder_summary, article_picker,
    cta_form, pricing_table, area_grid, faq_ref
```

### 2.2 Services

```
services
  id, slug (unique), is_published, order,
  eyebrow, h1, price_anchor, timeline_summary, intro,
  meta_title, meta_description, og_image_id (FK -> media),
  after_launch_heading, after_launch_body,   -- nullable
  created_at, updated_at, updated_by

service_local_problem_items
  id, service_id (FK), title, body, order

service_packages
  id, service_id (FK), name, price_display, summary,
  is_recommended (boolean — app-layer constraint: exactly one true per
    service_id, enforced the same way section 10.3 of the original spec
    requires),
  order

service_package_inclusions
  id, package_id (FK), text, order

service_inclusions
  id, service_id (FK), text, order

service_exclusions
  id, service_id (FK), text, order   -- app-layer constraint: at least 1 row

service_client_provides
  id, service_id (FK), text, order

service_timeline_steps
  id, service_id (FK), label, body, order

service_related
  service_id (FK), related_service_id (FK)   -- composite PK
  -- app-layer constraint: exactly 3 rows per service_id
```

### 2.3 Articles (Insights)

```
articles
  id, slug (unique), title, excerpt,
  meta_title, meta_description, og_image_id (FK -> media),
  category_id (FK -> article_categories), author_id (FK -> people),
  hero_image_id (FK -> media, nullable),
  reading_minutes (int, nullable override — auto-computed if null),
  is_published, published_at, updated_at, updated_by

article_categories
  id, slug (unique), label, order
  -- seeds from the current hardcoded topic enum: ecommerce, websites,
  -- social, ai, strategy, lebanon-business — but becomes editable

article_blocks
  id, article_id (FK), block_type (enum: paragraph | heading | list),
  content (jsonb: {text} or {items: []}), order

article_related_services
  article_id (FK), service_id (FK)   -- composite PK
```

### 2.4 People

```
people
  id, slug (unique), name, role, is_founder (boolean),
  bio (rich text / jsonb blocks), quote, photo_id (FK -> media),
  links (jsonb: [{label, url}]),
  created_at, updated_at, updated_by
```

### 2.5 FAQs

*Matches the `Faq` collection already specified in the original
`website-specification.md` section 10.2 — reused here directly rather than
re-invented.*

```
faqs
  id, question, answer,
  scope (enum: global | service | assessment | contact | pricing),
  service_id (FK, nullable — set only when scope = service),
  order, is_published
```

### 2.6 Site-wide settings (singleton table — one row)

```
site_settings
  id (singleton, always 1),
  site_name, slogan, service_statement,
  contact_email, whatsapp_number, phone_display, address,
  instagram_handle, instagram_url, linkedin_url,
  footer_slogan, footer_services_line, footer_copyright,
  newsletter_heading, newsletter_sub, newsletter_consent,
  robots_txt_overrides (text, nullable),
  llms_txt_content (text),
  org_schema_overrides (jsonb, nullable),
  default_og_image_id (FK -> media),
  favicon_media_id (FK -> media),
  monogram_media_id (FK -> media),
  updated_at, updated_by
```

### 2.7 Navigation

```
navigation_items
  id, menu (enum: header_primary | header_mega_col1 | header_mega_col2 |
    footer_services | footer_company | footer_start_here),
  label, href, order,
  is_external (boolean, default false)
```

### 2.8 Media library

```
media
  id, url, storage_path, filename,
  alt_text, width, height, mime_type, file_size_bytes,
  focal_point (jsonb: {x, y}, nullable — for responsive cropping),
  tags (text[]),
  uploaded_by (FK -> users), created_at
```

### 2.9 Advertisements (forward-looking module — see section 8, not built today)

```
ad_placements
  id, slug (unique), name, location (enum: insights_sidebar |
    insights_inline | directory_listing | newsletter_footer),
  max_width, max_height, is_active

ad_campaigns
  id, placement_id (FK), advertiser_name, creative_media_id (FK -> media),
  click_url, starts_at, ends_at, weight (int, for rotation),
  is_active, impressions_count, clicks_count
```

### 2.10 Redirects (standard CMS requirement, not currently needed but cheap to have)

```
redirects
  id, from_path (unique), to_path, status_code (301 | 302), is_active
```

### 2.11 Auth, roles, audit (see section 4 for the role definitions themselves)

```
users
  id, email (unique), name, role_id (FK -> roles), is_active,
  last_login_at, created_at

roles
  id, slug (unique), name, description

permissions
  id, slug (unique), description
    e.g. content.edit, content.publish, services.edit, pricing.edit,
    legal.edit, users.manage, media.upload, media.delete, settings.edit,
    seo.edit, ads.manage

role_permissions
  role_id (FK), permission_id (FK)   -- composite PK

content_revisions
  id, owner_type, owner_id, snapshot (jsonb — full record at save time),
  changed_by (FK -> users), changed_at, change_note (nullable)
  -- append-only, never edited or deleted; powers "revert to previous version"
```

### 2.12 Explicitly unchanged (existing production schema)

`assessment_applications`, `contact_submissions`, `newsletter_subscribers`
— defined in `lib/db/schema.ts`, live in Supabase, receiving real
submissions today. The CMS reads from these (to power a future "Leads"
dashboard, if wanted) but never writes marketing content into them, and
this spec does not modify their structure.

---

## 3. CMS navigation structure

```
Dashboard
  Recent activity (last 20 content_revisions)
  Lead summary (read-only counts from the 3 existing lead tables)

Content
  Pages                      -> pages + page_blocks (Home, Services Hub,
                                 Pricing, About, How We Work, Insights Hub,
                                 Contact, Thank-You Pages)
  Services                   -> services + all child tables (2.2)
  Insights / Articles        -> articles + article_blocks
  Categories                 -> article_categories
  FAQs                       -> faqs (filterable by scope)
  People                     -> people (founder today, team later)
  Legal Pages                -> pages (template=legal) — Admin-only

Media Library                -> media

Navigation & Site Settings
  Menus                      -> navigation_items
  Site Settings              -> site_settings (singleton)
  SEO Defaults                -> site_settings.org_schema_overrides,
                                 default_og_image_id
  Redirects                  -> redirects

Advertisements (hidden until section 8 module is enabled)
  Placements                 -> ad_placements
  Campaigns                  -> ad_campaigns

Leads (read-only view into the existing, separate schema)
  Assessment Applications
  Contact Messages
  Newsletter Subscribers

Users & Roles                -> users, roles, permissions — Admin-only
Activity Log                 -> content_revisions — Admin-only
```

---

## 4. User roles and permissions

| Role | Can do | Cannot do |
|---|---|---|
| **Super Admin** | Everything, including Users & Roles, Site Settings, Legal Pages, deleting any content, managing API keys/integrations | — |
| **Admin** | Everything except managing other Admins/Super Admins and destructive account-level settings (billing, domain, API keys) | Change another Admin's role; edit Legal Pages *(recommend requiring Super Admin here specifically, given liability)* |
| **Editor** | Create/edit/publish Pages, Services, Articles, FAQs, People, Navigation labels, Media upload | Site Settings, Legal Pages, Users & Roles, Advertisements, deleting Media that's in use elsewhere |
| **Author** | Create/edit **own** Articles as drafts; submit for review | Publish directly (goes to Editor/Admin for approval); edit Services, Pages, Navigation, Site Settings |
| **Viewer** | Read-only access to everything in the CMS, including the Leads views | Edit anything |

Rationale for the split: this is a single-founder business today (Ralph
does everything), but the role model is designed for the moment a second
person joins — e.g., a copywriter who should be able to draft an Insights
article without being able to touch pricing or the legal pages, which is
exactly the kind of mistake a flat "everyone's an Editor" model invites.

**Field-level exception, not just page-level:** `service_packages.price_display`
and the price-anchor equivalent fields should require **Admin**, even
though the rest of a Service record is Editor-accessible — a wrong price
publishing instantly is a different risk category than a typo in a bullet
point. Implement this as a permission on the specific field group
(`permissions.slug = 'services.pricing.edit'`), not the whole `services.edit`
permission.

---

## 5. Page builder requirements

1. **Block-based, not freeform.** Editors choose from the fixed `block_type`
   list (2.1) — no arbitrary HTML/embed field. This matches the existing
   design system's own constraint (signature "rule" element, strict surface
   alternation, one primary CTA per viewport) — a freeform builder would let
   someone accidentally violate the brand system the design docs spent so
   much effort defining.
2. **Enforce the existing structural rules at save time, not just in the
   design system doc:**
   - Reject a page save if two adjacent blocks are both "tinted" surfaces
     (mist/veil) — this is a *literal bug class already found and fixed by
     hand* during development (see the creative-director review earlier in
     this project's history); the CMS should make it structurally
     impossible to reintroduce.
   - Reject more than one "primary CTA" block type per page section/viewport.
   - Warn (not block) if a page has zero blocks — matches the existing rule
     "any route with no real content stays unbuilt and unlinked."
3. **Shared blocks.** Some content (Process steps, FAQ groups, Pricing
   table) appears on multiple pages today by direct code reuse. The builder
   needs a "reference an existing block" mode, not copy-paste, so editing
   the shared Process block once updates it everywhere it's used — exactly
   preserving current behavior.
4. **Preview before publish.** Draft state per page/block, with a live
   preview URL, before anything goes to `is_published = true`.
5. **Mobile/desktop preview toggle** in the builder — given how much of
   this site's design system is breakpoint-specific (package card reorder
   on mobile, founder block repositioning, sticky bar behavior), an editor
   needs to see both, not just desktop.
6. **Field-level validation surfaced inline**, matching existing hard
   rules: exclusions non-empty, exactly 3 related services, exactly one
   recommended package, meta title/description length limits, zero
   `[PLACEHOLDER]`-style strings allowed to publish (the original spec's
   own build-failing rule 10.3 — the CMS should replicate this as a
   publish-time validation, not just a build-time one).
7. **Revision history + revert**, backed by `content_revisions` (2.11) —
   every save is a new row, nothing is overwritten silently.

---

## 6. Media library requirements

1. **Enforce minimum dimensions per usage context** at upload time — this
   directly addresses two already-known real problems in the current site:
   the founder photo is 375x500px against a documented >=2000px requirement,
   and the wordmark logos needed manual pixel-level cropping before they
   were usable (done by hand during development, described in this
   project's build history). A media library that validates dimensions
   against the slot it's being uploaded for (portrait, OG image, logo)
   would have caught both automatically.
2. **Automatic responsive variant generation** (AVIF/WebP + explicit
   width/height) — matches the existing performance budget requirement
   (section 7.8 of the original spec: page weight <1MB, lazy-loaded below
   fold).
3. **Required alt text before an image can be attached to a published
   page** — not optional, given the accessibility requirements already
   baked into the rest of the build (visible focus rings, 4.5:1 contrast,
   `prefers-reduced-motion`).
4. **Usage tracking** — before allowing delete, show what's currently
   referencing a media item (which page/service/article/person), to
   prevent the class of bug where an image quietly breaks somewhere unseen.
5. **Focal point selection** for portrait/hero crops, since several
   layouts (hero portrait at `aspect-[4/5]`, founder block at
   `aspect-square`) crop the same source image differently per placement.
6. **No SVG upload for arbitrary content images** — SVG should be
   restricted to logo/icon slots specifically (XSS surface via inline
   SVG scripts is a real risk if editors can upload SVG into any image
   field).

---

## 7. Advertisement management requirements

*Speculative module — see 1.17. Specified because it was requested, not
because it's needed now. Do not build until there's a real placement to
serve.*

1. **Placement-scoped, not global** — an ad campaign targets one named
   `ad_placement` (e.g. "Insights sidebar"), never "the whole site," so
   adding a new placement later doesn't retroactively need every existing
   campaign reconfigured.
2. **Scheduling** — `starts_at`/`ends_at` on every campaign; expired
   campaigns stop serving automatically, not left live by omission (same
   philosophy already applied to the "founding clients" and "first five
   free" content blocks elsewhere in this spec — time-bound claims need
   structural expiry, not a human remembering to remove them).
3. **Weighted rotation** if multiple active campaigns share a placement.
4. **Disclosure requirement** — any served creative must render with a
   visible "Sponsored"/"Partner" label; this is a legal/trust requirement,
   not a nice-to-have, especially given this brand's own stated voice
   principle of plain, non-manipulative communication.
5. **Impression/click tracking** at the campaign level, feeding into the
   same analytics event system already defined (`lib/analytics/track.ts`,
   Appendix D of the original spec) rather than a separate ad-tech stack.
6. **Admin/Super Admin only** — ad sales/placement is a business
   relationship, not routine content editing.

---

## 8. SEO management requirements

1. **Per-record SEO tab**, not a separate global SEO section — every
   `pages`, `services`, and `articles` row carries its own `meta_title`,
   `meta_description`, `og_image_id`, matching the current one-metaTitle-
   per-page reality in the code (`lib/seo/metadata.ts`).
2. **Enforce length limits at input time** — <=60 char title, <=155 char
   description — visually (character counter + red state), not just as a
   rejected save, matching the existing rule in the original spec 10.3.
3. **Auto-generate OG images per page** as a real feature — currently a
   known, explicitly-documented gap (every page shares one
   `public/og/default.png`). The CMS should template-generate an OG image
   from the page's H1 + eyebrow the way `og/default.png` was hand-built for
   this launch, or allow a manual per-page override via Media Library.
4. **Canonical URL and slug editing kept in sync** — changing a service or
   article slug must either redirect the old URL automatically (writing to
   the `redirects` table from 2.10) or block the rename with a clear
   warning, never silently 404 a URL that was previously indexed.
5. **Structured data preview** — before publish, show the actual JSON-LD
   that will render (`Service`+`FAQPage`+`BreadcrumbList` for service
   pages, `Article`+`Person` for insights, `Organization` sitewide),
   sourced from `lib/seo/schema-org.ts`'s existing logic, so an editor can
   catch a broken schema before it ships.
6. **Sitemap/robots stay code-derived, not manually maintained** —
   `app/sitemap.ts` should keep dynamically deriving from `pages` +
   `services` + `articles` `is_published` flags, exactly as it does today
   from the hardcoded content modules; the CMS should not introduce a
   parallel manually-edited sitemap that can drift out of sync.
7. **Zero-placeholder publish gate** — reject publishing any record
   containing literal placeholder markers (matching the existing
   `[PLACEHOLDER]` convention used throughout `website-specification.md`),
   the same hard rule the original build already enforces at the code
   level, now enforced at the CMS save level instead.

---

## Open questions before implementation

1. Does "custom CMS" mean building an admin UI from scratch inside this
   Next.js app (e.g., under `/admin`, protected by the roles in section 4),
   or adopting a headless CMS (Payload, Sanity — both already named as
   Wave 2 options in the original spec section 0.3) and pointing this
   schema at it? The schema above is written to work either way, but the
   page-builder UI effort (section 5) is much larger if built from scratch.
2. Should `service_*` option enums (sector, budget, contact preference —
   1.15) ever become CMS-editable, given they're currently hard-wired
   Postgres enum types shared with the live lead-capture schema? Recommend
   explicitly deciding "no" for v1 rather than leaving it ambiguous.
3. Who is the first non-Ralph CMS user, and when? The role model in
   section 4 is designed for a team of one becoming a team of two-to-five;
   if that's not imminent, a simpler two-role model (Admin/Editor only) may
   be enough for launch and the rest can be added later without a schema
   change.
