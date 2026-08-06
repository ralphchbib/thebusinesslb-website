# Content Activation Plan — Testimonials & Case Studies

Companion to `POST-PHASE4A-PRODUCTION-ACCEPTANCE-REVIEW.md`'s top finding: both collections currently have **0 published rows** in production, which means the homepage's Featured Testimonials and Featured Case Studies sections, and every Service page's testimonial/related-case-study sections, are all fully built and currently empty. This plan is what closes that gap.

---

## 1. Testimonials

### Recommended quantity
- **Minimum to activate**: 1 (marked Featured) — immediately lights up every Featured-fallback surface sitewide.
- **Realistic first batch**: 5–8, covering at least 3 of the 5 live services (`shopify-ecommerce`, `social-media`, `websites`, `ai-automation`, `consulting`) and at least 3 different industries.
- **Steady-state target**: 1–2 new testimonials per completed project, reviewed quarterly to rotate which ones are `featured` (Featured testimonials should stay fresh — don't let the same 2 run for a year).
- Cap the number simultaneously marked `featured` at **3–4** — the homepage and Service pages render *all* featured testimonials with no limit/pagination in the current build; too many at once makes those sections unwieldy rather than more convincing.

### Recommended structure
One testimonial = one client, one quote, one outcome. Don't combine multiple client quotes into a single record. Vary structure across the batch:
- 2–3 short, punchy quotes (1–2 sentences) — these read best in the compact card layout used sitewide.
- 2–3 with a specific number in them ("+40% orders," "3x enquiries") — numbers are what make a testimonial read as evidence rather than praise.
- 1–2 that reference the *relationship*, not just the result ("Ralph replied personally within a day") — matches the founder-led positioning already established on the homepage and About page.

### Required fields (from `payload/collections/Testimonials.ts` — nothing here is guessed)
| Field | Required? | Notes |
|---|---|---|
| `clientName` | **Required** | |
| `quote` | **Required**, ≤500 chars | |
| `rating` | **Required**, 1–5, defaults to 5 | Don't use anything below 4 — a 3-star "testimonial" reads as a complaint, not social proof. |
| `companyName` | Optional | Include whenever possible — a named business is far more credible than an anonymous individual. |
| `position` | Optional | e.g. "Owner," "Marketing Manager." |
| `industry` | Optional | One of the existing 11-value list (matches Services/Case Studies' shared taxonomy) — always set this, since it's what lets a future landing page filter by industry. |
| `logo` | Optional | **No media library yet** — must be a hosted image URL. Leave blank rather than link a broken image. |
| `website` | Optional | |
| `displayOrder` | Optional, default 0 | Lower shows first — use this to keep your strongest 1–2 testimonials at the front. |
| `featured` | Optional, default false | **This is the field that actually activates the homepage sections** — nothing shows anywhere sitewide-by-default until this is checked. |

### Suggested writing format
Keep it to what a real client would actually say out loud, not marketing copy in quotation marks. A reliable structure:
> "[What life was like before] + [what changed] + [the concrete result or feeling now]."

Example shape (not a real quote): *"We had no way to sell outside Beirut before. [Company] built us a store that now handles orders from three countries — and I didn't have to learn anything technical to run it."*

Avoid: generic praise with no specifics ("Great service, highly recommend!") — it doesn't differentiate from a placeholder and won't be trusted by a skeptical reader.

### SEO recommendations
- Testimonials don't have their own URL or meta fields (by design — they're embedded content, not standalone pages), so there's no on-page SEO to configure per testimonial.
- The SEO value here is indirect: testimonial text embedded on Service pages adds unique, keyword-relevant content to those pages (a client describing "our Shopify store" in their own words is naturally-occurring keyword variation a marketing team wouldn't think to write). This is a real, if secondary, reason to prioritize testimonials on the Services with the least existing page content.
- If a testimonial references a specific, searchable outcome (a number, a location, an industry term), that's a bonus for topical relevance — but don't force it at the cost of sounding authentic.

### Approval workflow
Testimonials have a real Draft/Publish workflow in Payload (`versions: { drafts: true }`) — use it:
1. Whoever collects the quote from the client (VA or Marketing Manager) enters it and **Saves as Draft** — not published yet.
2. A second person (Marketing Manager or Founder) reviews for accuracy and tone, then clicks **Publish**.
3. Never publish a testimonial the named client hasn't actually approved seeing in writing — this is real attributed speech, not house copy.

---

## 2. Case Studies

### Recommended quantity
- **Minimum to activate**: 1 (marked Featured) — same immediate effect as testimonials.
- **Realistic first batch**: 3–5, prioritizing whichever completed projects have the clearest before/after numbers, one per service where possible (aim to cover `shopify-ecommerce` and `social-media` first — the two "featured" services on the homepage's own Featured Services section, per `payload/globals/Homepage.ts`'s seeded data).
- **Steady-state target**: 1 new case study per quarter is a defensible minimum for a business this size; more if project volume supports it. Case studies are more effort per item than testimonials — depth over frequency.

### Recommended structure
One case study = one client, one project, one clear before/after. Resist the urge to cover multiple services in one case study even if the real project did — it's more useful (and easier to place correctly via `servicesUsed`) to write a focused case study per service engagement.

### Required fields (from `payload/collections/CaseStudies.ts`)
| Field | Required? | Notes |
|---|---|---|
| `title` | **Required** | |
| `slug` | **Required**, unique | Cannot reuse a reserved site path (`case-studies` itself is blocked — validated automatically). |
| `clientName` | **Required** | |
| `challenge` | **Required** | |
| `solution` | **Required** | |
| `seoTitle` | **Required**, ≤60 chars | |
| `seoDescription` | **Required**, ≤155 chars | |
| `industry` | Optional | Same shared taxonomy as Testimonials. |
| `servicesUsed` | Optional, but **functionally required** | This is what makes the case study appear on the relevant Service page's "Related case studies" section — without it, the case study only ever appears on the `/case-studies/` hub. |
| `results` | Optional, but strongly recommended | Array of `{metric, value}` — the stat-grid readers actually scan first. Aim for 2–4 rows; more than 4 dilutes impact. |
| `testimonial` | Optional | Link an existing Testimonial if the same client also gave a quote — pairs well. |
| `featuredImage` | Optional | Same no-media-library URL constraint as Testimonials' `logo`. |
| `gallery` | Optional | |
| `featured` | Optional, default false | Same activation role as Testimonials' `featured`. |

### Suggested writing format
- **Challenge**: 1–2 sentences, the client's situation *before*, in plain terms a prospective client with the same problem would recognize themselves in.
- **Solution**: 1–2 sentences, what was actually built/done — specific enough to be credible, not a service-page pitch repeated.
- **Results**: numbers first. "+40% online orders" beats "significantly increased online orders." If a real number isn't available, use a real qualitative outcome rather than a vague one ("launched within the promised 6-week timeline" is concrete even without a percentage).

### SEO recommendations
- Each case study gets its own URL, its own meta title/description, its own JSON-LD (`Article` + `BreadcrumbList`, per `lib/seo/schema-org.ts`'s `caseStudySchema()`) — treat `seoTitle`/`seoDescription` with the same care as a real landing page, not an afterthought.
- **`seoTitle` pattern that works for this content type**: `"[Client/Industry] + [Result] | THE BUSINESS lb"` — e.g. (placeholder pattern) `"[Industry] Business Doubles Online Orders | THE BUSINESS lb"`. Leads with the outcome, which is what differentiates a case study from a generic page in search results.
- **`seoDescription` pattern**: state the challenge and the headline result in one sentence each — this becomes the search-result snippet, so it should work as a two-sentence pitch on its own.
- `featuredImage` currently doubles as the case study's OG image (`app/(app)/case-studies/[slug]/page.tsx` passes `ogImage: caseStudy.featuredImage`) — set it whenever possible; a case study without one falls back to the generic site default OG image, which is a weaker social-share result for content specifically meant to be shared as proof.
- **Gap worth knowing**: Service and Article pages do *not* currently do this — they always use the default OG image regardless of content (confirmed via code review for this plan). Case Studies are actually ahead of the rest of the site here; no action needed for Case Studies specifically, but flagged as a related item in `CONTENT-GAPS-ANALYSIS.md`.

### Approval workflow
Same Draft/Publish mechanism as Testimonials, with one addition given the higher stakes of a full case study:
1. First draft written by whoever has the project details (Marketing Manager, or Founder directly for early case studies).
2. **Client sign-off obtained in writing before publishing** — a case study makes more specific, checkable claims than a testimonial (real numbers, a named project), so this matters more here, not less.
3. Publish only after both content review and client approval are complete — there's no harm in leaving it in Draft for weeks while approval is pending; it's fully invisible until Published.
