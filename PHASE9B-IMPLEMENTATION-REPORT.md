# Phase 9B — Business & Professional Profiles: Implementation Report

Branch: `feat/phase9b-business-professional-profiles` (off `main` @ `428a724`, includes Phase 9A). Scope: exactly what was authorized — Business Profiles, Professional Profiles, Public Profile Architecture, Profile Editing, Services, Portfolio Foundation, for the `business` and `professional` account types only. Directory, search, reviews, verification, opportunities, AI, CRM, and marketplace features are explicitly out of scope and untouched. See `PHASE9B-TECHNICAL-DESIGN.md` for the full design and the scope-narrowing decisions made before writing any code.

## 1. What shipped

### 1.1 Three new collections (`payload/collections/{BusinessProfiles,ProfessionalProfiles,PortfolioProjects}.ts`)

`business-profiles` and `professional-profiles` each carry an `owner` relationship to `network-accounts`, their respective field sets from the technical design's §B table, and `versions: { drafts: true }` — the exact draft/publish mechanism already proven on `Pages`/`CaseStudies`, reused unmodified. `portfolio-projects` carries both a polymorphic `profile` relationship (`relationTo: ['business-profiles', 'professional-profiles']`, verified against Payload's own type definitions before use) and a flat `owner` relationship — the polymorphic field records which profile type an item conceptually belongs to; every actual read/write/access-control operation uses the flat `owner` field instead, since that's the same simple, already-proven pattern every other ownership check in this codebase uses, rather than a relational query into a polymorphic field with no existing precedent here.

### 1.2 Ownership access control (`payload/access-profiles.ts`)

Mirrors `payload/access-network.ts`'s shape (reusing its exported `isStaff`/`isNetworkAccount` helpers): published is public, a draft is visible only to its owner or staff, create requires any authenticated network account (ownership set server-side, never trusted from the client), update/delete requires ownership or staff. `portfolio-projects` denies anonymous direct-API read outright — see §2 for why, and how public visibility is still achieved correctly.

### 1.3 Profile editing (`lib/network/profile-actions.ts`, `components/network/{business,professional}-profile-form.tsx`, `app/(network)/dashboard/profile/`)

One Server Action per profile type (create-or-update in one call, matching the "one profile per account" rule), plus a shared `publishProfileAction`. Services/social-links/skills/experience are edited as one line per entry (`"Name: Description"`, `"Role at Company — description"`, comma-separated skills) rather than a dynamic add/remove field editor — a deliberate scope decision for this foundation pass, disclosed in the technical design §A, not an oversight. Logo/photo uploads go through Payload's Local API `create` on the `media` collection with a `Buffer` built from the submitted `File`, then reference the resulting id.

### 1.4 Portfolio Foundation (`app/(network)/dashboard/profile/portfolio/`, `components/network/portfolio-form.tsx`)

Add/list/delete for the logged-in account's own portfolio items, each optionally carrying one image.

### 1.5 Public Profile Architecture (`app/(app)/network/{businesses,professionals}/[slug]/page.tsx`)

Placed under the `(app)` route group — sharing the main marketing site's header/footer/branding — rather than `(network)`'s bare utility-shell layout, since these are genuinely public-facing content pages, not auth/dashboard utility screens. This is a refinement over the technical design doc's implicit route grouping, made during implementation and disclosed here. A draft profile shows an "unpublished — only you can see this preview" banner to its owner and 404s for anyone else, checked explicitly in the page component (not just left to `overrideAccess`, since the page always needs the document to tell a draft from a true 404). Portfolio items for the page's owner are read via the Local API with `overrideAccess: true` — deliberately, and only reachable after the page has already confirmed the profile itself is visible, which is what keeps a draft profile's portfolio items from leaking through the collection's own (intentionally anonymous-read-denied) access control.

## 2. A design refinement made during implementation, disclosed

The technical design's original sketch for `portfolio-projects` considered deriving ownership by following the polymorphic `profile` relationship rather than storing a separate `owner` field, to avoid the redundancy. Implementing it exposed the real question: doing that correctly would mean either (a) a nested-field access-control query into a polymorphic relationship's target document — a mechanism with no precedent anywhere in this codebase, i.e. exactly the kind of thing this project's "verify, don't trust" discipline says not to assume works — or (b) an async `findByID` lookup inside every access check, adding real latency and complexity to a foundation-scope feature. The flat `owner` field is what actually shipped: one extra field, zero new risk, and it also solved a second problem cleanly — anonymous read of `portfolio-projects` is denied outright at the collection level (so a portfolio item can never leak ahead of its owning profile's publish state via a direct API call), with the public profile pages being the sole, already-gated path that surfaces items to a visitor.

## 3. Standard checks (run from a clean state)

- `tsc --noEmit` — **0 errors**
- `next lint` — **0 errors**
- `node --test lib/**/*.test.ts` — **4/4 passing** (unaffected by this phase — no changes to `lib/cms/reserved-slugs.ts`; confirmed no new top-level reserved slug is needed, since `/network/businesses/[slug]` and `/network/professionals/[slug]` are nested under `/network`, already reserved in Phase 9A, and can't collide with `Pages`' single-segment `[slug]` catch-all)
- `next build` — **succeeds**, 45/45 static/dynamic pages generated (43 existing + `/dashboard/profile`, `/dashboard/profile/portfolio`, `/network/businesses/[slug]`, `/network/professionals/[slug]`) — two attempts needed due to the project's known transient Supabase pooler flake mid-build, unrelated to this PR; the retry succeeded cleanly.

## 4. Browser validation (real accounts, real browser, production build, all test data deleted and confirmed at 0 remaining after)

1. **Business profile end-to-end**: registered a business account, saved a profile (company name, slug, description, industry, services), confirmed it saved as `draft`.
2. **Draft visibility — owner**: viewed the profile's public URL while logged in as its owner — showed the "unpublished, only you can see this" banner and the correct content.
3. **Draft visibility — anonymous**: the same URL, no session, direct `curl` — **`404`**, confirmed via the acceptance criterion's own wording ("direct test, not inferred").
4. **Publish**: clicked Publish, status flipped to `published`; the same URL then returned the profile's real content to an anonymous request with no unpublished banner.
5. **Portfolio (business)**: added a project, confirmed it rendered on the public page; deleted it, confirmed the delete worked.
6. **Professional profile end-to-end**: repeated steps 1–5 for a professional account (name/title/bio/skills/services), including its own portfolio item — confirmed it attached to and rendered under the professional profile specifically, not the business one.
7. **Access control, direct API**: unauthenticated `POST /api/business-profiles` → `403`; unauthenticated `PATCH /api/professional-profiles/:id` for another account's profile → `403`; unauthenticated list read returned only published documents (`0` results, since none were published at that point in the test sequence — confirmed the filter itself, not just an empty database).
8. **Existing site regression**: homepage and other existing routes (`/services`, `/case-studies`) confirmed rendering correctly, unaffected.

## 5. Files changed

| File | Change |
|---|---|
| `payload/collections/BusinessProfiles.ts`, `ProfessionalProfiles.ts`, `PortfolioProjects.ts` | New — the three collections |
| `payload/access-profiles.ts` | New — ownership-based access helpers |
| `payload/access-network.ts` | `isStaff`/`isNetworkAccount` exported for reuse (no behavior change) |
| `payload.config.ts` | `+BusinessProfiles, +ProfessionalProfiles, +PortfolioProjects` registration (additive only) |
| `lib/network/profile-actions.ts` | New — profile/portfolio Server Actions |
| `lib/validation/profile-schemas.ts` | New — zod schemas |
| `app/(network)/dashboard/profile/`, `.../portfolio/` | New pages |
| `app/(network)/dashboard/layout.tsx` | `+"My Profile"` nav link for business/professional accounts |
| `app/(network)/dashboard/page.tsx` | Welcome copy updated — no longer claims profile features are "coming in a later release," since this phase ships them |
| `app/(app)/network/businesses/[slug]/`, `.../professionals/[slug]/` | New public profile pages |
| `components/network/business-profile-form.tsx`, `professional-profile-form.tsx`, `portfolio-form.tsx` | New form components |

No existing route, collection, or access-control function was modified beyond the two additive changes noted above.

## 6. What was deliberately NOT done

- Directory, search, reviews, verification, opportunities, AI, CRM, marketplace — all out of scope per this turn's explicit authorization.
- Consumer/Institution/Diaspora profile support — only `business`/`professional` account types get a profile in this phase.
- A dynamic add/remove field editor for services/skills/experience/social-links — line-based text parsing instead, disclosed in §1.3.
- A multi-step onboarding wizard — a single edit form instead, per the technical design's §A scope decision.
- No merge, no deploy — PR opened for review, not merged, per instruction.
