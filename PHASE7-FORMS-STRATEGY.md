# Phase 7 — Forms Strategy

Field structures, validation, storage model, access control, editor workflows, and reporting for all four form types, building on the storage decision in `PHASE7-CRM-ARCHITECTURE.md` (migrate to Payload `Leads`/`NewsletterSubscribers` collections) and the gaps found in `PHASE7-ARCHITECTURE-REVIEW.md`.

## 1. Storage model

All four forms funnel through the same shape of pipeline, already proven by the three existing forms: **client component (React + `useActionState`) → Next.js Server Action → Zod validation → spam checks → Payload Local API `create()` → fail-soft email notification → redirect to a thank-you page.** Only the storage call changes from today's Drizzle `db.insert()`; every other stage of the existing, working pattern is reused unchanged, per the Architecture Review's finding that this pattern already works correctly in production.

Contact, Assessment, and Quote write to the unified `Leads` collection (`leadType` discriminator, per `PHASE7-CRM-ARCHITECTURE.md` §5.1). Newsletter writes to the separate `NewsletterSubscribers` collection (§5.2).

## 2. Field structures

### 2.1 Contact (existing — no field changes, storage target changes)

`fullName` (required), `businessName` (optional), `email` (required, validated), `whatsapp` (optional), `interest` (required, enum: websites/shopify-ecommerce/social-media/ai-automation/consulting/unsure), `message` (required, min 10 chars). Exactly the current `contactSchema` in `lib/validation/schemas.ts` — no changes needed, it's already well-designed for its purpose.

### 2.2 Digital Assessment (existing — no field changes, storage target changes)

The existing 2-step schema (`assessmentStep1Schema` + `assessmentStep2Schema`, composed into `assessmentSchema`) stays exactly as-is: identifying info (name, business, sector, website, Instagram) in step 1; qualifying detail (team size, biggest blocker, 90-day goal, budget, contact preference, consent) in step 2. This is already a well-built qualification form — Phase 7 should not redesign it.

### 2.3 Quote Request (new)

Modeled directly on the Contact form's proven shape, since a quote request is conceptually "contact, but with project-scoping detail" — reusing field patterns already validated in production rather than inventing new UX:

- `fullName` (required)
- `businessName` (optional)
- `email` (required, validated)
- `whatsapp` (optional)
- `serviceInterest` (required, reuse the existing `serviceInterestOptions` enum from `lib/validation/schemas.ts` — no new taxonomy needed)
- `projectDescription` (required, min 20 chars — slightly higher bar than Contact's `message` min-10, since a quote needs enough detail to actually be quotable)
- `budgetRange` (required, reuse the existing `budgetOptions` enum — same ranges already used by Assessment, no need for a second budget taxonomy)
- `timeline` (optional, free text or a small enum: `asap` / `1-3-months` / `3-6-months` / `just-exploring`)

Deliberately **not** copying Assessment's full 2-step qualification depth — a Quote Request is a warmer, more specific ask ("I know roughly what I want, price it") than Assessment's broader "help me figure out what I need," and over-qualifying a warm quote lead with a long form risks losing it. Single-step, ~7 fields.

### 2.4 Newsletter (existing — no field changes, storage target changes)

`email` only. Stays minimal by design — the existing `newsletterSchema` is already correctly scoped for a low-friction footer signup.

## 3. Validation

Continue using Zod, extending `lib/validation/schemas.ts` with a new `quoteRequestSchema` following the exact structure of the existing three — same library, same file, same pattern, zero new validation infrastructure. Server-side validation (via `safeParse` in the server action) remains the source of truth, exactly as today; client-side validation is the existing `useActionState`-driven inline field-error display, reused unchanged for the new Quote form.

## 4. Access control

Per `PHASE7-CRM-ARCHITECTURE.md` §5.3: `Leads` and `NewsletterSubscribers` are both `create`-able only via the server actions' Local API calls (not publicly writable through Payload's REST/GraphQL API), `read`/`update` via `adminOrEditor`, `delete` via `adminOnly` — identical shape to every existing collection's access control, no new pattern.

## 5. Editor/staff workflows

1. **New lead arrives** → Payload `afterChange` hook fires an admin notification email (same content/recipient as today's `notifyAssessmentApplication`/`notifyContactSubmission`, just triggered from the hook instead of directly from the server action) → lead appears in `/admin/collections/leads/` with `status: submitted`.
2. **Staff reviews the lead** in the Payload admin list view — sortable/filterable by `leadType`, `status`, `createdAt`, exactly like every other Payload collection's list view (`defaultColumns` configured to surface `fullName`, `leadType`, `status`, `createdAt` at a glance).
3. **Staff works the lead** — opens the record, adds `internalNotes`, updates `status` as it moves through the pipeline (Qualified → Discovery Call → Proposal → Won/Lost) via the same dropdown-select interaction pattern already used for `pageType`, `Testimonials.industry`, etc.
4. **Reporting** (see §6) happens by filtering/sorting this same list view — no separate reporting tool needed for MVP.

## 6. Reporting

MVP reporting is **Payload's own admin list view with filters** — filter by `status = won` to see closed-won deals, filter by `leadType = quote` to see quote volume, sort by `createdAt` for a chronological view. This is genuinely sufficient for the business's current scale (per every prior phase's confirmed low content/traffic volume) and costs zero new engineering — it's the same list-view capability every other collection already has.

A dedicated analytics view (conversion-rate-by-source, funnel visualization, time-in-stage) is explicitly **not** MVP — see `PHASE7-LEAD-GENERATION-PLAN.md`'s Analytics section and the Effort Estimate. Once the attribution-capture gap (`PHASE7-ARCHITECTURE-REVIEW.md` §1.3) is fixed, the *data* needed for that reporting exists from day one — the reporting *UI* is a deliberate, disclosed fast-follow, not an oversight.

## 7. What's explicitly reused, unchanged

To be explicit about how much of this phase is genuinely new vs. reused, since the Architecture Review's central finding is that most of the hard work already exists:

- Zod validation library and pattern — reused
- Honeypot + time-on-form spam checks — reused (extended to Quote and, per the Risk Assessment, added to Newsletter)
- Fail-soft email notification pattern (`lib/email/send.ts`) — reused unchanged
- `useActionState`-driven form components — reused pattern, new component for Quote
- Thank-you page pattern (`/thank-you/{type}/`) — reused, extended with a `quote` type
- Attribution field names (`utmSource`/`utmMedium`/`utmCampaign`/`referrerUrl`/`landingPath`) — reused unchanged, only the population mechanism is fixed (Architecture Review §1.3)

What's genuinely new: the `Leads`/`NewsletterSubscribers` Payload collections, the Quote Request form/schema/component, the `afterChange`-hook-driven notification wiring, and the attribution-capture fix.
