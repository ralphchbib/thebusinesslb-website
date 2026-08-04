# CMS Architecture Decision — THE BUSINESS lb

**Role:** Technical architecture recommendation, following `CMS-SPECIFICATION.md`.
**Constraint honored:** No code below. Decisions and reasoning only.

---

## 1–2. Custom Admin vs. Headless CMS — evaluated against this specific codebase

The deciding factors aren't generic CMS pros/cons — they're this project's
actual, already-committed constraints: Next.js 15 on Vercel, Supabase
Postgres already live and holding real lead data via Drizzle, a solo
founder with no engineering team, and a strict performance budget (<2.5s
LCP on throttled 4G — this is a Lebanon-first site, not a hypothetical).

| Option | Fits this stack? | Deployment | Verdict |
|---|---|---|---|
| **Payload CMS** | Yes — TypeScript-native, runs *embedded inside* the existing Next.js app (Payload 3 was built specifically for this pattern), has a first-class Postgres adapter | Same Vercel project, same `git push` pipeline, **no new hosting** | **Recommended** |
| **Sanity** | Partial — excellent product, but content lives in Sanity's own cloud dataset, not Postgres | Vercel for the site, Sanity's hosted infra for content — two systems | Strong runner-up, not first choice |
| **Strapi** | Poor fit — wants a persistent Node server, not serverless | Requires separate hosting (Railway/Render/VPS) outside Vercel | Not recommended |
| **Directus** | Poor fit for the same reason as Strapi, despite the appeal of wrapping the existing DB directly | Requires separate hosting | Not recommended |
| **Custom Next.js Admin** | Fits trivially (it's just more of the same app) | No new infra | Not recommended *for v1* — highest build and maintenance cost of all five options |

### Final recommendation: **Payload CMS**

**Why it wins for this project specifically, not in general:**

- **One database, one connection string family.** Payload's Postgres
  adapter can point at the *same* Supabase project already in production —
  as a separate schema, alongside (not replacing) the existing
  `assessment_applications` / `contact_submissions` / `newsletter_subscribers`
  tables. No second database to provision, pay for, back up, or monitor.
- **One deployment pipeline.** It ships as part of the same Next.js
  application, deployed by the same `git push` → Vercel flow already
  built and proven working across this entire engagement. No second CI
  pipeline, no second set of environment variables to keep in sync, no
  second uptime dependency.
- **Better performance story than a hosted headless CMS.** Because it's
  embedded, content reads happen via Payload's local API — a function
  call inside the same process, not a network round-trip to a third-party
  API. That's a direct win against the site's own stated LCP budget,
  which every external headless CMS option makes strictly harder to hit.
- **Admin UI is generated from schema, not built by hand.** The entire
  `page_blocks` / `services` / `articles` / `faqs` / `media` schema
  already designed in `CMS-SPECIFICATION.md` §2 maps close to 1:1 onto
  Payload "Collections" — most of that spec becomes configuration, not
  custom-built screens.
- **Open source, self-hosted, no new recurring SaaS line item** at this
  traffic scale — consistent with the business's own stated principle
  (already in the original strategy doc): *"Build things the client
  owns... accounts, files and access are yours, in your name, from day
  one."* A proprietary hosted content store is a mild contradiction of
  that principle; Payload isn't.
- **Access control maps directly onto §4 of the CMS spec** — Payload's
  field- and collection-level access functions are TypeScript, not a
  separate DSL to learn.

**Where Sanity would have won instead:** if the top priority were
best-in-class non-technical editor experience and zero-effort image
handling (responsive variants, hotspot cropping — solves CMS spec §6
almost entirely for free), Sanity is genuinely better at that one thing.
It loses here only because it splits the data layer in two and adds an
external dependency to the render path. If a future non-technical hire
ever finds Payload's admin meaningfully harder to use day-to-day, that's
the actual trigger to revisit Sanity — not a reason to default to it now.

---

## 3. Recommended launch architecture

- **Next.js 15 + Vercel:** unchanged. This is already built, tested, and
  proven — the CMS decision does not touch it.
- **Supabase:** unchanged as the single Postgres instance. Payload's
  tables live in a separate schema from the lead-capture tables (logical
  separation, physical co-location) — one instance, one bill, one backup
  policy, two clearly-bounded concerns.
- **GitHub:** unchanged single repo. Payload's config and collections are
  source files in the same repository, reviewed and deployed the same way
  as everything else already pushed.
- **SEO:** `app/sitemap.ts` keeps its current job — deriving the sitemap
  from published records — it just reads from Payload's local API instead
  of the hardcoded `content/*.ts` registries. Per-record `meta_title` /
  `meta_description` / `og_image` fields (already specified in
  `CMS-SPECIFICATION.md` §2.1–2.3) become real Payload fields instead of
  TypeScript object properties. No architectural change to how SEO
  metadata reaches the page — only where it's sourced from.
- **Performance:** marketing pages stay statically generated at build
  time or via Incremental Static Regeneration, matching the existing hard
  rule that indexable content is never client-fetched. Payload publishing
  an update triggers a targeted revalidation instead of a full redeploy —
  faster iteration than the current "edit `.ts`, redeploy" loop, without
  giving up the static-generation performance profile.
- **Ease of content management:** this is the entire point of the
  project — Ralph (or a future hire) edits a service package or an FAQ
  in a generated admin UI and it's live in seconds, with zero `git push`,
  zero Vercel build, zero developer involvement for routine content
  changes.

---

## 4. Simplest role structure for launch

The 5-role model in `CMS-SPECIFICATION.md` §4 (Super Admin / Admin /
Editor / Author / Viewer) was explicitly designed for a future team. It
should not launch that way — there is one person using this system today.

**Launch with two roles only:**

| Role | Who | Access |
|---|---|---|
| **Admin** | Ralph | Everything — content, settings, legal pages, media, and (once it exists) user management |
| **Editor** | Reserved for the first hire (VA/copywriter), not created until that person exists | Content and media, not settings/legal/pricing/users |

Skip Super Admin, Author, and Viewer entirely for now. Field-level
permission splits (e.g., pricing requiring a different permission than
general content) are real ideas worth keeping in the spec, but they solve
a problem — one editor's mistake affecting another's area — that doesn't
exist yet with one person in the system. Add roles when a second and
third distinct working pattern actually shows up, not before.

---

## 5. CMS modules to postpone (not build at launch)

Postponing these isn't a quality compromise — every one of them is either
speculative, already deferred by the original strategy document, or free
if bundled with the Phase-1 build and therefore not worth a separate
implementation phase either way.

| Module | Why it waits |
|---|---|
| **Advertisement management** (spec §2.9 / §7) | Zero ad inventory exists anywhere in the current site. Speculative by the spec's own admission — build only when there's a real placement to sell. |
| **Full drag-and-drop page builder** for Home/About/Contact | These pages change rarely. Phase 1 only needs simple field-based editing for them (see Phase 2 below) — a flexible block-based builder is real engineering effort that today's content-change frequency doesn't justify. |
| **Case studies / testimonials collections** | The original strategy doc already gates these on "build only when a real case study exists" (Wave 2). The CMS should honor that same trigger, not build empty tables for content that doesn't exist yet. |
| **Industries pages, directory, resources, workshops** | Explicitly Phase 2/3 in the original business plan. Building CMS support for them now is solving a problem the business hasn't reached. |
| **Redirects management UI** | Needed only once URLs actually change. Cheap to add later; not needed day one. |
| **Author/Viewer roles, field-level permissions** | See §4 — no second/third user yet. |
| **Auto-generated per-page OG images** | Known, already-documented gap, but cosmetic relative to launch-blocking work. One shared OG image is a fine Phase 1 state. |
| **Revision history UI** | Not truly "extra work" if Payload is chosen — versioning is close to built-in — but exposing/training on it is a Phase 2 polish item, not a Phase 1 requirement with one editor who is also the business owner. |

---

## 6. Phased implementation plan

Phases are scoped by **business trigger**, not by calendar time — advance
to the next phase when the trigger condition is true, the same discipline
the original strategy document already applies to its own Phase 2/3 gates.

### Phase 1 — Escape the hardcoded files
**Trigger to start:** now. **Trigger to exit:** the 5 highest-change
content types are fully CMS-managed and the old `.ts` modules for them are
deleted, not just superseded.

- Stand up Payload inside the existing Next.js app, Postgres adapter
  pointed at the existing Supabase instance, separate schema from the
  lead tables.
- Two roles only (§4).
- Model only: **Services** (incl. packages/inclusions/exclusions/FAQ),
  **Articles/Insights**, **FAQs**, **Navigation**, **Site Settings**
  (singleton) — these are the records that actually change often.
- One-time migration of existing `content/services/*.ts` and
  `content/insights/*.ts` data into the new tables.
- Home, About, Pricing, Contact, How We Work, legal pages **stay
  code-driven** in this phase — deliberately out of scope.

### Phase 2 — Editorial completeness
**Trigger to start:** Phase 1 is in daily use without friction.

- Bring the remaining pages (Home, About, Pricing, Contact, How We Work)
  into the CMS as **field-based page records** — not a freeform builder,
  just editable fields matching their current fixed structure.
- Media Library with the dimension/alt-text/focal-point rules already
  specified (spec §6).
- People/Founder management — this is also the natural moment to finally
  close the founder-narrative and founder-photo gaps identified earlier
  in this engagement, since the content becomes editable without a
  redeploy.
- Per-record SEO fields wired live; legal pages become Admin-editable in
  the CMS instead of hardcoded JSX.
- Turn on revision history in the UI.

### Phase 3 — Growth features
**Trigger to start:** the business has actual case studies, a second
content contributor, or a concrete need for page layouts the fixed
field-based templates can't express.

- Real drag-and-drop / flexible block page builder — only if Phase 1–2
  usage actually demonstrates the fixed-template model is limiting.
  Otherwise, skip this permanently; it's the single most expensive item
  in the whole spec relative to its proven value at this business's size.
- Auto-generated per-page OG images.
- Case Studies / Testimonials collections, gated on real client
  permissioned results existing (matches the original spec's own rule).
- Redirects management.
- Introduce the Author role once a second regular content contributor
  exists.

### Phase 4 — Platform scale
**Trigger to start:** the original strategy document's own Phase 2/3
business triggers are met (stable recurring revenue, 5+ case studies,
delivery not solely dependent on Ralph — these are already defined in
`website-specification.md` §12.2, not new criteria invented here).

- Industries pages, company directory, resources, workshops — the
  original business plan's own next stage, now with a CMS foundation
  that already supports structured, permissioned content.
- Advertisement/partner module (spec §7) — only if the partner-network
  business model in the original roadmap actually launches.
- Field-level granular permissions and multi-editor approval workflows,
  once team size actually justifies them.

---

## Summary

**Payload CMS, embedded in the existing Next.js app, on the existing
Supabase Postgres instance, deployed through the existing Vercel/GitHub
pipeline.** Two roles at launch. Five content types in Phase 1. Everything
else — the page builder, ads, case studies, industries, directory — is
real, already-specified work that is correctly *not* Phase 1 work, because
none of it is what's actually slowing content changes down today.
