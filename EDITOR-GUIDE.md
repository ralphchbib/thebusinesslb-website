# THE BUSINESS lb — Content Editor's Guide

Where to go in Payload, what to fill in, and exactly what shows up on the live site afterward. Written for the Founder, Marketing Manager, and VA — no code knowledge assumed.

**Admin base URL:** `https://www.thebusinesslb.com/admin`

Every field list below is read directly from the current collection code (`payload/collections/*.ts`, `payload/globals/SiteSettings.ts`), not guessed — if a field isn't listed here, it doesn't exist in the form.

**On screenshots:** I don't have a working admin login in this environment (no valid credentials were ever issued to me across this whole project), so I can't capture real screenshots of the forms. Each section below names the exact file path a screenshot should be saved to and what it should show — drop the images in once someone with real access captures them, and every reference below will resolve.

---

## Quick index

| Collection | Admin URL | Public URL |
|---|---|---|
| Services | `/admin/collections/services` | `/services/` + `/services/{slug}/` |
| Articles | `/admin/collections/articles` | `/insights/` + `/insights/{slug}/` |
| FAQs | `/admin/collections/faqs` | *(embedded, no own URL)* |
| Navigation | `/admin/collections/navigation-items` | *(embedded, no own URL)* |
| Pages | `/admin/collections/pages` | `/{slug}/` |
| Testimonials | `/admin/collections/testimonials` | *(embedded, no own URL)* |
| Case Studies | `/admin/collections/case-studies` | `/case-studies/` + `/case-studies/{slug}/` |
| Site Settings | `/admin/globals/site-settings` | *(embedded everywhere, no own URL)* |

All admin URLs are relative to `https://www.thebusinesslb.com`. To create a new item in any collection, add `/create` — e.g. `/admin/collections/services/create`.

---

## Services

**Admin:** `/admin/collections/services` · list · `/admin/collections/services/create` · new
**Public URL:** `/services/` (hub — all published services, ordered) and `/services/{slug}/` (one detail page per service)

**Where it appears:**
- The Services hub grid at `/services/`
- Its own detail page at `/services/{slug}/`
- "Related services" block on other Service pages and on Article pages (only if manually linked — see below)
- Header mega-menu and footer "Services" column — **only if** a matching Navigation item is also created (Services do not auto-populate the menus)

**Required fields:** `slug`, `h1`, `priceAnchor`, `timelineSummary`, `intro`, `packages` (at least 1 package, each needing `name`/`priceDisplay`/`summary`/at least 1 `inclusions` line), `exclusions` (at least 1 line), `metaTitle`, `metaDescription`.
**Optional fields:** `eyebrow`, `order` (controls hub sort position), `localProblem` group, plain `inclusions`, `clientProvides`, `timeline`, `afterLaunch` group.

**Publishing alone enough?** Almost — this collection has no draft/publish workflow. It uses a plain `isPublished` checkbox (default **on**). Uncheck it to hide a service without deleting it; nothing else is needed to go live once checked.

**Relationships to configure manually:**
- `relatedServices` — a relationship field, but with a hard rule: **exactly 3** services must be picked (`minRows: 3, maxRows: 3`). Leaving it empty means no "related services" cards show under this one.

**Example workflow — publishing a new Service:**
1. Go to `/admin/collections/services/create`.
2. Fill in `slug` (e.g. `email-marketing`), `h1`, `priceAnchor`, `timelineSummary`, `intro`.
3. Add at least one package under `packages` with a name, price, summary, and at least one inclusion line.
4. Add at least one line under `exclusions`.
5. Fill `metaTitle` (≤60 chars) and `metaDescription` (≤155 chars).
6. Pick exactly 3 `relatedServices` if you want cross-links to show.
7. Leave `isPublished` checked, hit Save.
8. It's live immediately at `/services/email-marketing/` and appears in the `/services/` grid — no rebuild needed.
9. **Separately**, go to Navigation (below) and add a matching link if you want it in the header/footer menus.

**Screenshots:**
- `docs/editor-guide/screenshots/services-list.png` — the collection list view showing existing services and the `isPublished`/`order` columns
- `docs/editor-guide/screenshots/services-create-form.png` — the create form, scrolled to show the `packages` array and the `relatedServices` picker
- `docs/editor-guide/screenshots/services-live-page.png` — the resulting public `/services/{slug}/` page

---

## Articles (Insights)

**Admin:** `/admin/collections/articles` · list · `/admin/collections/articles/create` · new
**Public URL:** `/insights/` (hub) and `/insights/{slug}/` (detail)

**Where it appears:**
- Insights hub grid at `/insights/`
- Its own detail page at `/insights/{slug}/`
- Header mega-menu / footer "Insights" link — only if separately added in Navigation (Articles don't auto-populate menus)

**Required fields:** `slug`, `title`, `excerpt`, `topic` (a fixed dropdown: E-commerce, Websites, Social, AI, Strategy, Lebanon business), `publishedAt` (date), `body` (at least 1 content block), `metaTitle`, `metaDescription`.
**Optional fields:** `readingMinutes` (auto-estimated from word count if left blank), `relatedServices`.

**Publishing alone enough?** Yes — same as Services, a plain `isPublished` checkbox (default on), no separate draft state.

**Relationships to configure manually:**
- `relatedServices` — relationship to Services, `hasMany`, no minimum. Leave empty for no related-service cross-links on the article.

**Body content structure:** `body` is a list of small blocks, each one of: **Paragraph** (a `text` field), **Heading**, or **Bulleted list** (an `items` array of short text lines). Add as many as needed, in the order you want them to read.

**Example workflow — publishing a new Article:**
1. Go to `/admin/collections/articles/create`.
2. Fill `slug`, `title`, `excerpt`, pick a `topic`, set `publishedAt`.
3. Under `body`, add blocks one at a time — start with a Paragraph, add a Heading where you want a section break, add a Bulleted list where useful.
4. Fill `metaTitle`/`metaDescription`.
5. Optionally pick `relatedServices`.
6. Save with `isPublished` checked — live immediately at `/insights/{slug}/`.

**Screenshots:**
- `docs/editor-guide/screenshots/articles-body-blocks.png` — the `body` array showing the Paragraph/Heading/List block picker
- `docs/editor-guide/screenshots/articles-live-page.png` — the resulting `/insights/{slug}/` page

---

## FAQs

**Admin:** `/admin/collections/faqs` · list · `/admin/collections/faqs/create` · new
**Public URL:** none of its own — FAQs are embedded inside other pages, filtered by `scope`.

**Where it appears**, by `scope` value:
| `scope` | Shows on |
|---|---|
| `global` | Homepage |
| `service` | The linked Service's detail page (needs `service` field set — see below) |
| `assessment` | `/digital-assessment/` |
| `contact` | `/contact/` |
| `pricing` | **Both** `/pricing/` and the `/services/` hub |

**Required fields:** `question`, `answer`, `scope`.
**Conditionally required:** `service` — only appears in the form when `scope` is set to "Service page," and is required in that case (a service-scoped FAQ with no service picked won't show anywhere).
**Optional:** `order` (controls display order within its scope).

**Publishing alone enough?** Yes — plain `isPublished` checkbox (default on), no draft workflow.

**Relationships to configure manually:**
- `service` — required only when `scope: service`. This is what ties a FAQ to one specific Service page; without it, a service-scoped FAQ is orphaned (saved, but not shown anywhere).

**Example workflow — adding a FAQ to one Service page:**
1. Go to `/admin/collections/faqs/create`.
2. Fill `question` and `answer`.
3. Set `scope` to "Service page" — a `service` picker appears.
4. Pick the exact Service this FAQ is about.
5. Save — appears on that service's `/services/{slug}/` page immediately, in `order` sequence among that service's other FAQs.

**Screenshots:**
- `docs/editor-guide/screenshots/faqs-scope-conditional-field.png` — the form with `scope: service` selected, showing the `service` picker that only appears in that case

---

## Navigation

**Admin:** `/admin/collections/navigation-items` · list · `/admin/collections/navigation-items/create` · new
**Public URL:** none of its own — powers the header and footer link lists sitewide.

**Where it appears**, by `menu` value: header primary nav, header mega-menu column 1 (services) or column 2 (start here), or one of the three footer columns (services / company / start here).

**Required fields:** `menu` (which exact spot in the header/footer), `label` (the link text), `href` (the URL — internal path or full external URL).
**Optional:** `order` (sort position within that menu), `isExternal` (opens in a new tab / gets external-link treatment).

**Publishing alone enough?** Yes, no draft workflow — but note the access rule is stricter here: **only Admin accounts can create, edit, or delete Navigation items** (Editors can view but not change them). If an Editor can't find the option to edit a nav link, that's by design, not a bug.

**Relationships to configure manually:** None — `href` is a plain typed-in URL, not a relationship field. **This means Navigation never auto-updates.** Publishing a new Service or Article does not add it to any menu; a matching Navigation item must be created by hand every time.

**Example workflow — adding a new footer link:**
1. Go to `/admin/collections/navigation-items/create` (must be logged in as Admin).
2. Set `menu` to "Footer — services column".
3. Set `label` to the link text (e.g. "Email Marketing").
4. Set `href` to `/services/email-marketing/`.
5. Set `order` to control where it falls among the other footer links.
6. Save — appears in the footer sitewide immediately.

**Screenshots:**
- `docs/editor-guide/screenshots/navigation-menu-picker.png` — the `menu` dropdown showing all 6 header/footer slots
- `docs/editor-guide/screenshots/navigation-live-footer.png` — the resulting footer column on the live site

---

## Pages

**Admin:** `/admin/collections/pages` · list · `/admin/collections/pages/create` · new
**Public URL:** `/{slug}/` — a dynamic catch-all, so a Page can claim almost any top-level URL (except ones already used by the rest of the site — see below).

**Where it appears:** Standalone — reachable directly by its URL and included in `sitemap.xml` once published. **Nothing on the site links to a new Page automatically** — no menu entry, no homepage callout. It's a real, live, indexable URL the moment it's published; whether anyone finds it is up to you.

**Required fields:** `title`, `slug`, `pageType` (Landing / Campaign / Seasonal — organizational only, doesn't change behavior), `seoTitle`, `seoDescription`, `blocks` (at least 1 block).

**Publishing alone enough?** **No** — Pages is the one collection here with a real Draft/Publish workflow. Saving keeps it as a draft (visible only to logged-in Admin/Editor accounts); you must explicitly click **Publish** in the admin UI for it to become publicly reachable at `/{slug}/`.

**Reserved slugs:** the `slug` field rejects anything already used by a real route on the site (`services`, `insights`, `pricing`, `about`, `contact`, `digital-assessment`, `case-studies`, etc.) — you'll get a clear validation error at save time if you try one of these, rather than silently creating an unreachable page.

**Relationships to configure manually:** None on the Page document itself — but its `blocks` field is where Testimonials and Case Studies get pulled in (see those sections below for exactly how).

**Building the page — the 5 available blocks:**
| Block | What it needs |
|---|---|
| **Hero** | `h1` required; optional eyebrow, subtext, up to 2 CTA buttons, reassurance line |
| **Text** | `body` required; optional eyebrow/heading |
| **Cta** | `h2` + `buttonLabel` + `buttonHref` required; optional body text, background surface |
| **Testimonials** | Nothing required — leave the `testimonials` picker empty to auto-show Featured testimonials, or hand-pick specific ones |
| **Case Studies** | Nothing required — same auto-Featured-or-manual-pick pattern |

Every block has an `isVisible` checkbox — uncheck to hide a section without deleting it.

**Example workflow — a landing page for a Ramadan promotion:**
1. Go to `/admin/collections/pages/create`.
2. Set `title`, `slug` (e.g. `ramadan-promo`), `pageType: Seasonal`, `seoTitle`, `seoDescription`.
3. Under `blocks`, add a **Hero** block with your headline and a CTA.
4. Add a **Testimonials** block — leave the picker empty to show your current Featured testimonials automatically.
5. Add a **Cta** block at the bottom driving to `/digital-assessment/`.
6. Save as draft, review it (only you can see it while unpublished), then click **Publish**.
7. Live instantly at `/ramadan-promo/` — no rebuild, no redeploy.
8. If you want it discoverable (not just directly linkable), add a Navigation item pointing to it, or link it from an Article/CTA elsewhere.

**Screenshots:**
- `docs/editor-guide/screenshots/pages-block-picker.png` — the "Add block" menu showing all 5 available block types
- `docs/editor-guide/screenshots/pages-draft-vs-publish.png` — the Save Draft / Publish button pair in the admin UI
- `docs/editor-guide/screenshots/pages-live-page.png` — a published Page rendering on the public site

---

## Testimonials

**Admin:** `/admin/collections/testimonials` · list · `/admin/collections/testimonials/create` · new
**Public URL:** none of its own.

**Where it appears:**
- Automatically on **every** Service detail page (`/services/{slug}/`), showing your currently **Featured** testimonials — no linking needed
- On any Page that includes a Testimonials block (see Pages above) — either auto-showing Featured, or a hand-picked subset

**Required fields:** `clientName`, `quote` (≤500 chars), `rating` (1–5, defaults to 5).
**Optional fields:** `companyName`, `position`, `industry` (dropdown), `logo` (an image URL — there's no media library yet, so you need a hosted image link, not a file upload), `website`, `displayOrder` (lower numbers show first), `featured` checkbox.

**Publishing alone enough?** **No** — Testimonials has a Draft/Publish workflow like Pages. It stays private until you explicitly click **Publish**; a saved-but-unpublished testimonial never appears anywhere public, even if `featured` is checked.

**Relationships to configure manually:** None required on the Testimonial itself. The **`featured` checkbox is the one thing that controls automatic placement** — check it and Publish, and it appears on every Service page and in any empty-picker Testimonials block sitewide, immediately.

**Example workflow — adding a client testimonial:**
1. Go to `/admin/collections/testimonials/create`.
2. Fill `clientName`, `quote`, set `rating`.
3. Optionally add `companyName`, `position`, `logo` URL.
4. Check `featured` if you want it showing automatically across the site right now.
5. Click **Publish** (not just Save).
6. It appears immediately on every Service page's testimonials section, with no further action.

**Screenshots:**
- `docs/editor-guide/screenshots/testimonials-featured-checkbox.png` — the create form with the `featured` checkbox highlighted
- `docs/editor-guide/screenshots/testimonials-on-service-page.png` — a Featured testimonial rendering on a live Service page

---

## Case Studies

**Admin:** `/admin/collections/case-studies` · list · `/admin/collections/case-studies/create` · new
**Public URL:** `/case-studies/` (hub) and `/case-studies/{slug}/` (detail)

**Where it appears:**
- The Case Studies hub at `/case-studies/`, listing all published case studies
- Its own detail page at `/case-studies/{slug}/`
- **On the relevant Service page** (`/services/{slug}/`), under "Related case studies" — **only** if the `servicesUsed` field is set (see below)
- On any Page that includes a Case Studies block — auto-Featured or hand-picked, same pattern as Testimonials

**Required fields:** `title`, `slug`, `clientName`, `challenge`, `solution`, `seoTitle` (≤60 chars), `seoDescription` (≤155 chars).
**Optional fields:** `industry`, `servicesUsed`, `results` (array of metric/value pairs, e.g. "Online orders" / "+40%" — keep to 3–4), `testimonial` (link one existing Testimonial), `featuredImage`/`gallery` (image URLs, same no-upload caveat as Testimonials' logo), `featured` checkbox.

**Publishing alone enough?** **No** — same Draft/Publish workflow as Pages/Testimonials. A saved-but-unpublished case study is invisible everywhere, including the hub and any Service page it's linked to.

**Relationships to configure manually — two separate ones:**
- `servicesUsed` (relationship to Services, multi-select) — **this is the one that makes it show up on a Service page.** Without it, the case study still appears on the `/case-studies/` hub once published, but not cross-linked from any Service.
- `testimonial` (relationship to Testimonials, single) — optional; links one existing testimonial to display alongside the case study's results.

**Reserved slug note:** `case-studies` itself is reserved and can't be reused as an individual case study's slug (it would collide with the hub) — you'll get a validation error if you try.

**Example workflow — publishing a case study and linking it to a service:**
1. Go to `/admin/collections/case-studies/create`.
2. Fill `title`, `slug`, `clientName`, `challenge`, `solution`, `seoTitle`, `seoDescription`.
3. Add 2–4 `results` rows (metric + value).
4. Under `servicesUsed`, pick the Service(s) this case study demonstrates — this is what makes it show up on that service's page.
5. Optionally pick a `testimonial` to display alongside it.
6. Check `featured` if you want it eligible for auto-fill in empty Case Studies blocks.
7. Click **Publish**.
8. Live immediately at `/case-studies/{slug}/`, listed on `/case-studies/`, and now showing under "Related case studies" on every linked Service's page.

**Screenshots:**
- `docs/editor-guide/screenshots/case-studies-services-used-field.png` — the `servicesUsed` relationship picker
- `docs/editor-guide/screenshots/case-studies-on-service-page.png` — the "Related case studies" section on a linked Service page
- `docs/editor-guide/screenshots/case-studies-detail-page.png` — the full `/case-studies/{slug}/` page

---

## Site Settings

**Admin:** `/admin/globals/site-settings` (a **global** — one single record, no list view, no "create")
**Public URL:** none of its own — appears sitewide (footer, meta fallbacks, the services pricing table shared by `/pricing/` and `/services/`).

**Where it appears:** Footer (company info, slogan, copyright, social links), newsletter block copy, and the `servicesPricingTable` (shown on both `/pricing/` and the `/services/` hub).

**Fields, by tab:**
- **Company** — `siteName`, `slogan`, `serviceStatement`, `contactEmail` (all required), plus `whatsappNumber`, `phoneDisplay`, `address`, Instagram/LinkedIn URLs (optional). Note: the WhatsApp click-to-chat button elsewhere on the site is actually driven by an environment variable, not this field — this field is for display text only.
- **Footer** — `footerSlogan`, `footerServicesLine`, `footerCopyright` (all optional, have sensible defaults).
- **Newsletter** — `newsletterHeading`, `newsletterSub`, `newsletterConsent` (all optional, have defaults).
- **Services Hub Page** — `servicesHubH1`, `servicesHubIntro`, `servicesHubConnectH2`, `servicesHubConnectBody`, and `servicesPricingTable` (an array of name/covers/range rows).

**Publishing alone enough?** Yes — this is a global singleton with no draft state; any Save takes effect immediately sitewide.

**Who can edit:** **Admin only** — Editors cannot change Site Settings at all (`update: adminOnly`), unlike most other collections which Editors can also touch.

**Relationships to configure manually:** None — every field here is plain text/array, no relationships.

**Example workflow — updating the footer copyright year:**
1. Go to `/admin/globals/site-settings` (must be Admin).
2. Open the **Footer** tab.
3. Update `footerCopyright`.
4. Save — every page's footer updates immediately, sitewide.

**Screenshots:**
- `docs/editor-guide/screenshots/site-settings-tabs.png` — the tabbed global-settings form showing all 4 tabs
- `docs/editor-guide/screenshots/site-settings-pricing-table.png` — the `servicesPricingTable` array editor

---

## The two rules that catch people out

1. **Draft vs. plain published checkbox — these are not the same thing.** Services, Articles, FAQs, and Navigation use a simple `isPublished`/on-by-default checkbox — save it, it's live. Pages, Testimonials, and Case Studies use a real Draft/Publish workflow — saving is **not** enough, you must click **Publish**.
2. **Nothing links to new content automatically except the hub/detail pages it's naturally part of.** A new Service, Article, or Page is instantly reachable by its own URL and shows in its own hub/sitemap — but it will never appear in the header, footer, or any "related" section until you explicitly configure that: add a Navigation item, pick `relatedServices`/`servicesUsed`/`testimonial`, or add it to a Page's block picker.
