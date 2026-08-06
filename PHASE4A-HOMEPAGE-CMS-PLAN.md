# Phase 4A — Homepage CMS: Implementation Plan (pre-approval)

Status: **Planning only — no code written.** Everything below comes from reading the actual current implementation (`app/(app)/page.tsx`, `content/home.ts`, and every component it renders), not from assumptions about what a homepage "usually" looks like.

## 0. What the current homepage actually is (read in full before planning)

`app/(app)/page.tsx` renders 15 sections. `content/home.ts` is the single hardcoded source of truth for 12 of them. Two matter for accuracy up front:

- **`TransformationStrip` is a Client Component** (`"use client"`, holds `useState` for a mobile "show all" toggle). It cannot fetch its own data — content must be fetched server-side in `page.tsx` and passed down as props.
- **`InsightsRow` is already a hybrid**: its heading copy comes from `content/home.ts`, but its article cards already pull live from `getRecentArticles(3)` — this is the existing precedent for "auto-populate from a collection," reused below for Featured Services/Testimonials/Case Studies.

### Sections in the brief vs. sections that actually exist

The brief lists 9 content sections + SEO. The homepage currently has 15. Five are **not** in the brief's list and are **out of scope for 4A** unless you say otherwise: `PositioningBar`, `AssessmentBlock`, `FoundingClients`, `SectorGrid`, `InsightsRow`'s heading copy. These stay hardcoded in `content/home.ts`, untouched. (Good Phase 4B candidate.)

### Five places where the brief's field names don't match what's actually there

I'm flagging these now rather than silently guessing, since guessing wrong here means rebuilding a Global schema later.

1. **Hero "Highlighted text"** — does not exist today. `hero.h1` is one plain string, rendered as one text node, no styled sub-span anywhere in `hero.tsx`. This would be a **new field with new (small) rendering logic** in `hero.tsx` — not an extraction of existing markup. Plan: add the field as optional; if empty, output is pixel-identical to today (no highlight span rendered at all).
2. **Problem "Cards"** — the current `problem.symptoms` is a plain checklist (`<ul>`/`<li>` + a checkmark icon), not visually distinct cards. Plan: model the field as what it actually is — a string array — and keep calling it "symptoms" internally rather than introducing a card sub-schema that doesn't match the current design.
3. **Process "Icons"** — no icons exist anywhere in `ProcessBlock`. Each step has `n` (a text badge, "01".."05"), `name`, `body`. Plan: treat "Icons" as **not applicable to the current design** — no icon field added, since adding one with nothing to render it would be dead schema, and rendering one would change the visual design (against the "keep exact design" requirement). Flagging for your decision below.
4. **Process also renders a second, un-briefed array**: `process.trust` (4 items: "Written agreements," "Milestone payments," etc.), directly below the 5 numbered steps, in the same section. The brief's field list ("Title, Steps, Icons") doesn't mention it. Recommendation: include it in the Global anyway (`trustPoints`), since leaving it out means it stays hardcoded while everything around it becomes editable — an inconsistent half-migration of one visual section. Flagging for your decision.
5. **Final CTA is not a headline+buttons banner.** The brief asks for "Headline, Subheadline, Button labels, Button links." The actual component is a two-column section: heading + body text on the left, a **fully embedded `<ContactForm />`** on the right — there is no button anywhere in it. (`finalCta.submit`, "Send my message," is dead content — grepped, it's referenced nowhere.) Implementing "Button labels/Button links" as literally requested would not match what's on the page and can't be done without a real design change. **This needs your decision before I build the schema** — see Decisions Needed below.
6. **Featured Services is currently NOT the Services collection at all.** `ServiceGrid` reads `content/home.ts`'s own `services.cards` array — hand-written, homepage-specific copy (short `body`, a `bullets` list) that is shorter and differently-worded than each Service's own `intro`/`packages` copy in the real Services collection. Wiring the grid directly to `Service.h1`/`Service.intro` would technically satisfy "select from Services collection" but would **visibly change the homepage copy** (violates "keep exact design"). See Decisions Needed.

## Decisions needed before I build the schema (blocking)

| # | Question | Recommendation |
|---|---|---|
| 1 | Final CTA: keep it as a contact-form embed (editable heading/body only, no buttons — matches reality), or actually redesign it into a headline+buttons banner? | Keep as-is; make heading/body editable; drop "Button labels/URLs" from scope since nothing renders them today |
| 2 | Featured Services: should the homepage show the *real* Service fields (`h1`/`intro`), changing today's copy, or should the Global store its own short override text per picked service (preserving today's copy exactly)? | Store per-card overrides in the Global (service picker + optional short body/bullets override, falling back to the Service's own `h1`/`eyebrow` if left blank) — matches "keep exact design" literally |
| 3 | Process "Icons" — add an icon-picker field with no current visual, or drop from scope? | Drop from scope; revisit if/when the design actually gets icons |
| 4 | Include `process.trust` (the 4-item trust grid) in the Global even though the brief didn't list it? | Yes — leaving it hardcoded next to an otherwise-fully-editable section is an inconsistent half-migration |
| 5 | Hero "Highlighted text" — add the field now with no visual effect until a highlight span is styled in, or implement a real highlighted-word treatment in `hero.tsx` now? | Add the field + minimal span-wrapping support now (safe, additive, no visual change if left blank) |

I've made a recommendation for each so you can approve/override in one pass rather than five separate round-trips.

---

## A. Homepage field structure

Grouped exactly as the sections currently exist in code (not the brief's idealized list), with the above decisions applied per my recommendations — flag any you want changed.

**Hero**
`eyebrow` (text), `headline` (text, = current `h1`), `highlightedText` (text, optional — a word/phrase from within the headline to render styled, new field), `subheadline` (textarea, = current `sub`), `ctaPrimaryLabel` (text), `ctaPrimaryHref` (text — currently hardcoded `/digital-assessment/`), `ctaSecondaryLabel` (text), `ctaSecondaryHref` (text — currently hardcoded `/services/`), `reassurance` (text), `heroImage` (text/URL, same "no media library, paste a URL" convention as Testimonials/Case Studies), `heroImageAlt` (text, currently hardcoded "Ralph Chbib, founder of THE BUSINESS lb")

**Problem**
`eyebrow`, `title` (=`h2`), `body1` (textarea), `body2` (textarea), `quote` (textarea), `symptoms` (array of `{ text }`, matches current checklist — *not* a card schema, see finding #2)

**Transformation**
`eyebrow`, `title` (=`h2`), `intro` (textarea), `stages` (array of `{ stage, where, what }`, currently 7 rows), `closingLine` (=`close`)

**Process**
`eyebrow`, `title` (=`h2`), `steps` (array of `{ number, name, body }` — `number` is text like "01", not auto-generated, matches current), `trustPoints` (array of `{ name, body }`, pending decision #4)

**Founder**
`eyebrow`, `title` (=`h2`, currently "Ralph Chbib"), `quote` (textarea, the large pull-quote), `body` (textarea), `founderImage` (text/URL), `founderImageAlt`, `ctaLabel` (=`cta`), `ctaHref` (text — currently hardcoded `/about/ralph-chbib/`)

**Featured Services**
`eyebrow`, `title` (=`h2`), `intro`, `cards` (array, up to 5, each: `service` relationship→Services *required*, `overrideBody` textarea *optional* — falls back to the Service's own `intro` if blank, `overrideBullets` array of `{text}` *optional*, `featured` checkbox — controls the "2 big + 3 small" layout split that exists today, matching `services.cards`' implicit first-two-vs-rest split)

**Featured Testimonials**
`eyebrow`, `title`, `ids` (relationship→Testimonials, `hasMany`, optional — empty means auto-fallback to `featured: true` testimonials, identical pattern to the existing `TestimonialsRow` component from Phase 3)

**Featured Case Studies**
`eyebrow`, `title`, `ids` (relationship→CaseStudies, `hasMany`, optional — same Featured-fallback pattern as `CaseStudiesRow`)

**Final CTA** *(pending decision #1 — shown here per my recommendation: keep as contact-form embed)*
`headline` (=`h2`), `subheadline` (=`body`)

**SEO**
`metaTitle` (text, ≤60, matches every other collection's convention), `metaDescription` (textarea, ≤155), `ogImage` (text/URL, optional — falls back to `${siteConfig.url}/og/default.png`, the same default `buildMetadata()` already uses)

---

## B. Payload Global schema design

One new file: `payload/globals/Homepage.ts`, slug `"homepage"`.

```
export const Homepage: GlobalConfig = {
  slug: "homepage",
  access: { read: anyone, update: adminOrEditor },   // see note below on access level
  hooks: { afterChange: [revalidateGlobalAfterChange] },   // reused verbatim, zero new hook code
  fields: [
    { type: "tabs", tabs: [
        { label: "Hero", fields: [...] },
        { label: "Problem", fields: [...] },
        { label: "Transformation", fields: [...] },
        { label: "Process", fields: [...] },
        { label: "Founder", fields: [...] },
        { label: "Featured Services", fields: [...] },
        { label: "Featured Testimonials", fields: [...] },
        { label: "Featured Case Studies", fields: [...] },
        { label: "Final CTA", fields: [...] },
        { label: "SEO", fields: [...] },
    ]},
  ],
}
```

Same `tabs` structure `SiteSettings.ts` already uses — proven pattern, not a new one.

**Access level decision:** `SiteSettings` is `update: adminOnly`; every content collection (Services, Articles, Pages, Testimonials, Case Studies) is `update: adminOrEditor`. The homepage is customer-facing marketing copy, closer in kind to Pages than to site-wide structural settings — recommend `adminOrEditor`, so the Marketing Manager/VA persona from Phase 3's brief can actually use it. Flag if you want it Admin-only instead.

**No draft/publish workflow** (no `versions: { drafts: true }`) — matching `SiteSettings`, not Pages/Testimonials/Case Studies. The homepage is a singleton that's always "the current homepage"; a draft state would mean the *entire homepage* silently doesn't update on save, which is a materially different (and riskier) UX than a normal collection's draft/publish. Flag if you actually want draft support here — it's a bigger addition (custom `read` access function, like Pages needed) than the rest of this plan assumes.

---

## C. Database impact

Purely additive. New tables only, created via the established `next dev` + hit `/admin/` dev-mode schema-push workaround (Payload's CLI remains broken under Node 24 on this machine — same constraint documented in every prior phase).

Expected new tables (naming follows the existing `site_settings`/`site_settings_services_pricing_table` convention exactly):
`homepage`, `homepage_problem_symptoms`, `homepage_transformation_stages`, `homepage_process_steps`, `homepage_process_trust_points`, `homepage_featured_services_cards`, `homepage_featured_services_cards_override_bullets`, `homepage_rels` (for the Testimonials/Case Studies `hasMany` relationships).

No existing table is altered. No existing row is touched. `cms` schema isolation from `public` (the lead-capture tables) is unaffected, same as every prior phase.

---

## D. Files that will be modified

| File | Change |
|---|---|
| `payload.config.ts` | Add `Homepage` to `globals: [...]` — one import, one array entry, additive |
| `app/(app)/page.tsx` | Replace static `metadata` export with `generateMetadata()` reading the Global; fetch the Global once, pass its per-section slices down as props to each component |
| `components/blocks/hero.tsx` | Accept props instead of importing `hero` from `content/home`; add optional highlighted-text span rendering |
| `components/blocks/problem-block.tsx` | Accept props instead of importing `problem` |
| `components/blocks/transformation-strip.tsx` | Accept props instead of importing `transformation` — **stays a Client Component**, data passed in from the Server Component parent |
| `components/blocks/process-block.tsx` | Accept props instead of importing `process` |
| `components/blocks/founder-block.tsx` | Accept props instead of importing `founder` |
| `components/blocks/service-grid.tsx` | Accept resolved card data as props (service lookups resolved server-side before render); no direct CMS calls inside this component, matching how `related-services.tsx` already takes `slugs: string[]` rather than fetching itself |
| `components/blocks/final-cta.tsx` | Accept `headline`/`subheadline` as props instead of importing `finalCta` |
| `content/home.ts` | Remove the 7 in-scope exports (`hero`, `problem`, `transformation`, `process`, `services`, `founder`, `finalCta`); keep the other 5 untouched (`positioning`, `assessmentBlock`, `foundingClients`, `sectors`, `insights`, `faq`) |

## E. New files that will be created

| File | Purpose |
|---|---|
| `payload/globals/Homepage.ts` | The Global config itself |
| `lib/cms/homepage.ts` | `getHomepage()`, `cache()`-wrapped, matching every other `lib/cms/*.ts` file's convention; includes the server-side resolution of the Featured Services `service` relationships and Testimonials/Case Studies Featured-fallback (reusing `getTestimonialsByIds`/`getFeaturedTestimonials`/`getCaseStudiesByIds`/`getFeaturedCaseStudies` from Phase 3 — zero new fallback logic needed, same functions) |
| `lib/cms/types.ts` (addition, not a new file) | `PayloadHomepageDoc` interface and its sub-shapes |
| `scripts/seed-homepage.ts` | One-off seed script — reads `content/home.ts`'s current exported values and writes them into the `homepage` global via direct SQL insert (matching the established seeding technique used throughout this project, since valid admin credentials for a real Payload-mediated write aren't available in this environment) |
| `components/blocks/testimonials-row.tsx`, `components/blocks/case-studies-row.tsx` | **Not new** — already exist from Phase 3, reused as-is for the two new homepage sections with no changes |

---

## F. Rollback plan

1. **Code rollback**: this is one feature branch (e.g. `feat/phase4a-homepage-cms`), never merged to `main` until approved — reverting is `git checkout main`, zero production impact, exactly the same posture as Phases 2 and 3.
2. **If merged and a problem surfaces in production**: the Global read returns `null`/empty on any failure path (network, missing row) — every component will be written to fall back to rendering nothing gracefully in that case, **not** to silently re-import `content/home.ts` as a hidden fallback (an implicit fallback would mask a real data problem). If a full rollback is needed post-merge, the fix is a `git revert` of the merge commit + redeploy, restoring the hardcoded `content/home.ts` version — same recovery path already proven twice (Phase 2, Phase 3).
3. **Database rollback**: the new tables are purely additive with no foreign keys pointing *into* them from existing tables (only `homepage_rels` points *out* to `testimonials`/`case_studies`/`services`, standard relationship direction) — `DROP TABLE` on the new tables alone, with no cascade risk to existing data, is sufficient if a schema-level rollback is ever needed.
4. **Seed script is idempotent-safe to re-run**: it will check for an existing `homepage` row and refuse to overwrite one that already has content, rather than blindly re-inserting — preventing an accidental double-seed from silently reverting real edits an editor already made.

---

## G. Risks

1. **The 5 open decisions above are the primary risk** — building the schema against a wrong guess (especially Final CTA and Featured Services) means reworking it after the fact. This is why this plan stops here for approval rather than proceeding.
2. **`TransformationStrip`'s Client Component boundary** — passing 7 rows of stage data down as props is straightforward, but it's worth stating explicitly: this component cannot call `getHomepage()` itself; `page.tsx` must fetch once and prop-drill. Low risk, just a real constraint, not a hidden one.
3. **Featured Services' per-card override design (recommendation #2) adds real schema complexity** — an array of {relationship + 2 optional override fields} is more moving parts than a plain relationship picker. This is the direct cost of "keep exact current design"; a simpler pure-relationship picker is available if you'd rather accept a copy change on that section.
4. **Homepage image fields have no media library**, same as every other image field added since Phase 3 (Testimonials' `logo`, Case Studies' `featuredImage`) — plain URL text fields, not uploads. Not a new risk, just carried forward from an existing, already-accepted limitation.
5. **No draft/publish on the Global (per the B. recommendation) means every Save goes live immediately, sitewide, with no preview step.** This is the single biggest behavioral risk of this phase — a typo or bad edit is instantly public on the homepage. Mitigated by: Payload's own version history is still available for any field (Payload tracks field-level history regardless of the `versions.drafts` setting, so "what did it say before" is always recoverable) — but there's no "stage it, then publish" workflow unless decision B is revisited.
6. **Seed script correctness** — since `content/home.ts`'s current arrays (especially `services.cards`, `transformation.stages`, `process.steps`/`trust`) need to map field-for-field into the new Global's array shapes, a seeding mistake could put live copy on the homepage that's subtly wrong (a swapped field, a dropped bullet). Mitigated by: a verification pass comparing the live homepage's rendered text before/after seeding, same methodology used for every prior phase's test-data verification.

---

## H. Estimated implementation effort

| Work item | Estimate |
|---|---|
| `Homepage.ts` Global (10 tabs, ~45 fields total across all sections) | 1.5–2 hours |
| `lib/cms/homepage.ts` data layer + type additions | 45 min |
| Component prop-drilling refactor (7 components + `page.tsx`) | 2–2.5 hours |
| Hero highlighted-text rendering support | 30 min |
| Featured Services relationship + override resolution | 1 hour |
| Wire in Testimonials/Case Studies rows (reused components) | 20 min |
| `generateMetadata()` conversion | 20 min |
| Seed script | 1 hour |
| Schema push + live verification (draft privacy N/A here, but full content-parity check pre/post seed, all 15 sections) | 1.5 hours |
| Full validation pass (`test`/`lint`/`tsc`/`build`) + regression sweep | 45 min |
| Implementation report (matching Phase 2/3 rigor) | 45 min |
| **Total** | **~10–11 hours** of focused work, assuming the 5 decisions above are resolved before starting (each reopened decision adds rework, not just discussion time) |

---

## Summary — what I need from you before writing any code

Answer the 5 questions in "Decisions needed" above (my recommendations are usable defaults — you can just say "go with your recommendations" if that's easier), and confirm the overall approach (Global, not collection; no draft/publish; `adminOrEditor` access). Once approved, I'll implement on a new branch, exactly as Phases 2 and 3 were run: no merge, no deploy, until you review the finished implementation and report.
