# Editor Onboarding Guide

Welcome. This is your first-day walkthrough of the THE BUSINESS lb admin panel — a sequential path through the 8 things you'll do most often, not a full field-by-field reference (that's `EDITOR-GUIDE.md` — keep it open in another tab once you're past this walkthrough).

**Admin URL**: `https://www.thebusinesslb.com/admin` — bookmark this.

**Screenshots**: every step below references a placeholder image path under `docs/editor-guide/screenshots/` — these need to be captured by someone with real admin access and dropped into that folder; the filenames below are exactly what each step expects.

---

## Before you start

1. Get your login from whoever manages the CMS (see `CMS-TEAM-ROLES.md` for who that is and what your role can and can't do).
2. Log in at `/admin`.
   `![Admin login screen](docs/editor-guide/screenshots/onboarding-login.png)`
3. You'll land on the dashboard — a list of collections down the left side (Users, Services, Articles, FAQs, Navigation, Pages, Testimonials, Case Studies) and Site Settings / Homepage under a separate "Globals" heading.
   `![Admin dashboard sidebar](docs/editor-guide/screenshots/onboarding-dashboard.png)`

---

## 1. Create a service

Services rarely change — you'll do this occasionally, not routinely.

1. Sidebar → **Services** → **Create New**.
   `![Services create button](docs/editor-guide/screenshots/onboarding-services-create.png)`
2. Fill in `slug` (the URL — e.g. `email-marketing` becomes `/services/email-marketing/`), `h1`, `priceAnchor`, `timelineSummary`, `intro`.
3. Scroll to `packages` — add at least one, with a name, price, summary, and at least one inclusion line.
4. Add at least one line under `exclusions`.
5. Fill `metaTitle` and `metaDescription` at the bottom (these drive what shows up in Google).
6. Leave `isPublished` checked, click **Save**.
   `![Services save confirmation](docs/editor-guide/screenshots/onboarding-services-save.png)`
7. It's live immediately — no extra publish step for Services.

---

## 2. Create an article

1. Sidebar → **Articles** → **Create New**.
2. Fill `slug`, `title`, `excerpt`, pick a `topic` from the dropdown, set `publishedAt`.
3. Under `body`, click **Add Block** and choose Paragraph, Heading, or Bulleted List — build the article one block at a time, in reading order.
   `![Article body block picker](docs/editor-guide/screenshots/onboarding-articles-body.png)`
4. Fill `metaTitle`/`metaDescription`.
5. Save with `isPublished` checked — live immediately at `/insights/{slug}/`.

---

## 3. Create a page

Pages are for one-off landing pages (a seasonal promotion, a campaign) — not for anything that should live in the main navigation permanently (that's usually a new Service or Article instead).

1. Sidebar → **Pages** → **Create New**.
2. Fill `title`, `slug`, pick a `pageType` (Landing/Campaign/Seasonal), fill `seoTitle`/`seoDescription`.
3. Under `blocks`, click **Add Block** and choose from Hero, Text, Cta, Testimonials, or Case Studies. Reorder by dragging; each block has a checkbox to hide it without deleting it.
   `![Pages block picker](docs/editor-guide/screenshots/onboarding-pages-blocks.png)`
4. **Important — this collection has a real Draft/Publish step, unlike Services and Articles above**: clicking **Save** keeps it private. You must click **Publish** specifically for it to go live.
   `![Pages Save Draft vs Publish buttons](docs/editor-guide/screenshots/onboarding-pages-publish.png)`
5. Once published, it's live at `/{slug}/` — but nothing links to it automatically. If people should be able to find it (not just reach it by direct link), add a Navigation entry too (step 7 below).

---

## 4. Create a testimonial

This is one of the two highest-impact things a new editor can do — see `CONTENT-ACTIVATION-PLAN.md` for why. Use `TESTIMONIAL-TEMPLATES.md` as a starting structure.

1. Sidebar → **Testimonials** → **Create New**.
2. Fill `clientName`, `quote`, set `rating` (1–5).
3. Optionally add `companyName`, `position`, `industry` (pick from the dropdown), `logo` (must be an image URL — there's no upload here yet), `website`.
4. **Check `featured` if you want this testimonial to show automatically on the homepage and every Service page** — this is the single field that activates it sitewide.
   `![Testimonials featured checkbox](docs/editor-guide/screenshots/onboarding-testimonials-featured.png)`
5. **This collection also has Draft/Publish** — click **Publish**, not just Save.
6. Live immediately, everywhere Featured testimonials appear.

---

## 5. Create a case study

The other highest-impact task. Use `CASE-STUDY-TEMPLATES.md` as a starting framework.

1. Sidebar → **Case Studies** → **Create New**.
2. Fill `title`, `slug`, `clientName`, `challenge`, `solution`, `seoTitle`, `seoDescription`.
3. Add 2–4 rows under `results` (a metric and a value, e.g. "Online orders" / "+40%").
4. **Under `servicesUsed`, pick which Service(s) this case study is about** — this is what makes it appear on that Service's page, not just the Case Studies hub.
   `![Case Studies servicesUsed picker](docs/editor-guide/screenshots/onboarding-casestudies-servicesused.png)`
5. Optionally link an existing `testimonial` from the same client.
6. Check `featured` if you want it to show automatically on the homepage.
7. **Click Publish**, not just Save.
8. Live immediately at `/case-studies/{slug}/`, listed on `/case-studies/`, and cross-linked from every Service page you picked in step 4.

---

## 6. Edit homepage content

1. Sidebar → under **Globals** → **Homepage**.
   `![Homepage global tabs](docs/editor-guide/screenshots/onboarding-homepage-tabs.png)`
2. Click through the 10 tabs across the top: Hero, Problem, Transformation, Process, Founder, Featured Services, Featured Testimonials, Featured Case Studies, Final CTA, SEO.
3. Edit whichever text fields you need to change.
4. Click **Save**.
5. **There is no Publish step here and no draft state — Save means it's live immediately, sitewide, the moment you click it.** Double-check your edit before saving; there's no "preview before it's public" step on this page specifically.
   `![Homepage save — instant-live warning](docs/editor-guide/screenshots/onboarding-homepage-save.png)`

**Featured Testimonials / Featured Case Studies tabs**: leave the picker empty to automatically show whichever documents you've marked `featured` in those collections (steps 4/5 above) — you don't need to manually pick anything here unless you want a specific, curated set instead of the automatic one.

---

## 7. Edit navigation

**This requires an Admin account — Editor accounts cannot make this change.** See `CMS-TEAM-ROLES.md` if you're not sure which you have.

1. Sidebar → **Navigation** → **Create New** (or open an existing item to edit it).
2. Set `menu` to the exact spot: header primary nav, header mega-menu column 1 or 2, or one of the three footer columns.
   `![Navigation menu dropdown](docs/editor-guide/screenshots/onboarding-navigation-menu.png)`
3. Set `label` (the visible text) and `href` (type the URL directly, e.g. `/services/email-marketing/`).
4. Set `order` to control where it falls among other links in that same menu.
5. Save — live in the header/footer sitewide immediately.

**Nothing does this automatically.** Publishing a new Service, Article, or Page never adds a menu link on its own — if you want something in the navigation, this is always a separate, manual step.

---

## 8. Publish content

The word "publish" means something different depending on what you're editing — this trips up almost every new editor at least once, so read this section even if you skip the rest:

| Collection | What "Save" does | What actually makes it live |
|---|---|---|
| Services, Articles, FAQs | Live immediately | Nothing extra — just keep `isPublished` checked |
| Navigation | Live immediately | Nothing extra (Admin-only) |
| **Pages, Testimonials, Case Studies** | **Saves privately as a draft** | **You must click the separate Publish button** |
| Site Settings, Homepage | Live immediately, no draft state at all | Nothing extra — but there's also no undo-before-public |

`![Side-by-side: Save vs Publish buttons across collection types](docs/editor-guide/screenshots/onboarding-publish-comparison.png)`

If you've saved something in Pages, Testimonials, or Case Studies and it's not showing up on the live site — this is almost always why. Go back to the document and check whether it's still sitting in Draft.

---

## You're done with onboarding

You now know the 8 things you'll do most often. For exact field-by-field details on any collection (what's required, what relationships need setting, where each thing appears on the site), switch to `EDITOR-GUIDE.md` — it's the full reference this walkthrough was deliberately kept shorter than.
