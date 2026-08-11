# Phase 9B — Business & Professional Profiles: Technical Design

Scope: exactly what was authorized — Business Profiles, Professional Profiles, Public Profile Architecture, Profile Editing, Services, Portfolio Foundation. Directory, search, reviews, verification, opportunities, AI, CRM, and marketplace features are explicitly excluded — Phase 9C/9D/Release-2+ territory, untouched here. Consumer/Institution/Diaspora accounts do not get a profile-building capability in this phase (only `business` and `professional` account types); extending profiles to the other three account types is a future increment, not scope creep to backfill now.

**Pre-implementation validation performed for this document**: re-read Blueprint v3 §6–§9 (profile field sets) and `PHASE9-IDENTITY-DISCOVERY-PLANNING-PACKAGE.md`'s Phase 9B section directly. The planning package's Phase 9B deliverables list is broader than this turn's explicit authorization in two ways — full Blueprint field sets (business story, milestones, awards, certifications, team, business objectives, Institution onboarding, multi-step wizards) versus the specific, narrower field list actually authorized this time (company name/logo/description/industry/location/services/contact/social for Business; name/title/bio/skills/experience/services/contact for Professional). This document follows the narrower, explicitly authorized list as the real scope boundary, not the full Blueprint field set — the fuller set remains available for a later increment without any schema rework, since both collections are additive and can grow new optional fields later.

## A. Scope Decisions

1. **"Profile Editing" is a single well-organized form per profile type, not a multi-step onboarding wizard.** The planning package's original Phase 9B sketch called for a multi-step wizard; this turn's authorization says "Profile Editing," not "onboarding wizard," and doesn't include Institution (one of the three wizard flows originally sketched). A single form matches what was actually asked, avoids UI complexity not requested, and is easy to convert into a wizard later if a future phase asks for it.
2. **Draft/publish reuses the exact `versions: { drafts: true }` pattern already proven on `Pages`/`CaseStudies`** (planning package's explicit instruction). This gives each profile a `_status` field (`draft`/`published`) and Payload's built-in versioning for free, with no new mechanism to design.
3. **Services live as an array field on each profile**, not a separate top-level collection. Blueprint §7/§8 list "services" as part of both Business and Professional profile content, not as an independent, cross-profile catalogue — a separate collection would start to resemble a marketplace/catalogue feature, which is explicitly excluded this phase.
4. **Portfolio uses a polymorphic `relationTo` field** (`portfolio-projects.profile` can point at either `business-profiles` or `professional-profiles`) — this is standard, documented Payload relationship syntax (an array of collection slugs on `relationTo`), not a novel mechanism; verified against the installed Payload types before use (§B).
5. **No new top-level reserved slugs needed.** Public profile pages live at `/network/businesses/[slug]` and `/network/professionals/[slug]` — nested under `/network`, which Phase 9A already reserved. Payload's `Pages` collection's single-segment `[slug]` catch-all cannot collide with a two-segment nested path, so `RESERVED_SLUGS` (which guards exactly that single-segment collision) does not need new entries. Slug uniqueness *within* each profile collection is enforced by Payload's own `unique: true` on the slug field, independently namespaced by collection.

## B. Collections Required

### `business-profiles` (`payload/collections/BusinessProfiles.ts`)

| Field | Type | Notes |
|---|---|---|
| `owner` | relationship → `network-accounts`, required | Set once at creation from the logged-in account; never client-editable after |
| `companyName` | text, required | |
| `slug` | text, required, unique | Reserved-slug-checked is unnecessary (see §A.5), but still validated for URL-safety (lowercase, alphanumeric + hyphens) |
| `logo` | upload → `media`, optional | |
| `description` | textarea, required | |
| `industry` | text, optional | Free text for this phase — no fixed taxonomy yet (that's a Phase 9C/directory-filter concern) |
| `location` | text, optional | |
| `services` | array of `{ name: text required, description: textarea }` | |
| `contactEmail`, `contactPhone` | text, optional | |
| `socialLinks` | array of `{ label: text, url: text }` | |
| `_status` (auto) | via `versions.drafts` | `draft` \| `published` |

### `professional-profiles` (`payload/collections/ProfessionalProfiles.ts`)

| Field | Type | Notes |
|---|---|---|
| `owner` | relationship → `network-accounts`, required | |
| `name` | text, required | |
| `slug` | text, required, unique | |
| `photo` | upload → `media`, optional | |
| `title` | text, required | Professional title |
| `bio` | textarea, required | |
| `skills` | array of `{ skill: text required }` | |
| `experience` | array of `{ role: text, company: text, description: textarea }` | |
| `services` | array of `{ name: text required, description: textarea }` | |
| `contactEmail`, `contactPhone` | text, optional | |
| `_status` (auto) | via `versions.drafts` | |

### `portfolio-projects` (`payload/collections/PortfolioProjects.ts`)

| Field | Type | Notes |
|---|---|---|
| `profile` | relationship → `['business-profiles', 'professional-profiles']`, required | Polymorphic — the owning profile, of either type |
| `title` | text, required | |
| `description` | textarea, optional | |
| `images` | array of `{ image: upload → media }` | |
| `projectLink` | text, optional | |

**Access control** (`payload/access-profiles.ts`, new file, mirroring `access-network.ts`'s shape):

```
read:   published → anyone; draft → owner or staff
create: any authenticated network account (owner set to self by the Server Action)
update: owner or staff
delete: owner or staff
```

Ownership for `portfolio-projects` is derived through its `profile` relationship (an item's owner is whoever owns the profile it's attached to) — checked via a `beforeChange`/access-function DB lookup, not a duplicated `owner` field, so there is exactly one place the item's ownership is recorded.

## C. Route Map

| Route | Type | Purpose |
|---|---|---|
| `/network/businesses/[slug]` | Server Component | Public business profile page — 404s for a draft profile unless the viewer owns it or is staff |
| `/network/professionals/[slug]` | Server Component | Public professional profile page — same draft-visibility rule |
| `/dashboard/profile` | Server Component + client form, auth-gated | Create/edit the logged-in account's own profile (Business or Professional form, chosen by `accountType`); includes Publish/Unpublish |
| `/dashboard/profile/portfolio` | Server Component + client form, auth-gated | Add/edit/delete the logged-in account's own portfolio items |

**Server Actions** (`lib/network/profile-actions.ts`): `saveBusinessProfileAction`, `saveProfessionalProfileAction`, `publishProfileAction`, `savePortfolioItemAction`, `deletePortfolioItemAction` — all read the current `getNetworkUser()` session, reject if absent, and use the Local API (`overrideAccess: true` default) scoped to the current user's own `owner` id, mirroring Phase 9A's Server Action pattern exactly.

## D. Security Architecture

- Ownership is enforced the same way as Phase 9A's `ownAccountOrStaff`: an access function checked on every `read`/`update`/`delete`, not just assumed from the Server Action's own logic — a direct REST/Local API call from anywhere else in the app is equally protected.
- A network account can create at most one profile of its own account type — enforced in the Server Action (check-then-create under the account's own `owner` id) plus a collection-level uniqueness constraint would be ideal but Payload doesn't support a compound-unique/one-per-relationship constraint natively; the Server Action explicitly checks for an existing profile owned by the current account before allowing create, and this is disclosed here as an application-level (not database-level) guarantee.
- Draft profiles/portfolio items are invisible to `find`/`findByID` for anyone but the owner or staff — verified live, not just asserted, per this project's standing discipline.
- No REST-endpoint-collision class of risk here — these are plain content collections (`auth` is not set), so none of Phase 9A's auth-endpoint concerns apply.

## E. Database Changes

Additive only, same `cms` Postgres schema: three new tables (`business_profiles`, `professional_profiles`, `portfolio_projects`) plus their `_versions` tables from `versions.drafts`. No changes to any existing table.

## F. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Polymorphic `relationTo` on `portfolio-projects.profile` is new to this codebase | Medium | Verified against Payload's own type definitions before use; confirmed working end-to-end (create + read-back) as the first implementation step, before building the rest of the feature on top of it |
| One-profile-per-account is only application-enforced, not DB-enforced | Low | Disclosed above; acceptable for this phase's scope, revisit if it ever becomes a real product requirement to allow multiple profiles per account |
| Draft-visibility access function is the single most security-relevant piece of this phase | Medium | Directly tested (not assumed): a draft profile confirmed inaccessible via its public URL and via direct API to a non-owner, before considering the phase complete |

## G. Acceptance Criteria

1. A real Business account and a real Professional account can each create/edit a profile end-to-end in a real browser and see it rendered at their public slug once published.
2. Draft (unpublished) profiles are confirmed inaccessible to anyone but the owner and staff — direct test, not inferred.
3. A portfolio item correctly attaches to and renders under the right profile, for both profile types.
4. Zero regression in Phase 9A functionality or the existing marketing site.

## H. Rollback Plan

Same low-blast-radius shape as Phase 9A: three wholly new, additive tables; every new route is net-new; reverting the PR removes them cleanly with no impact on any existing table, route, or collection.
