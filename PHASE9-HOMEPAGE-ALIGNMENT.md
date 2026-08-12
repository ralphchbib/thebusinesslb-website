# Phase 9 — Homepage Alignment Plan

## Why not the full Blueprint v3 §48 homepage yet

Blueprint v3 §48's homepage structure includes sections like *Verified this week*, *Businesses near you*, *Professionals available now*, *New market opportunities*, *Open collaboration requests*, *Upcoming events*, and *Business success stories*. Every one of these requires real, live data the platform doesn't have yet: Phase 9C (directories/search) doesn't exist, there are zero published Business or Professional profiles in production as of this writing, and verification, opportunities, events, and reviews are all later-phase/Release-2+ scope per the planning package. Building those sections now would mean either leaving them empty (confusing) or filling them with fabricated businesses, professionals, or activity — which this project's standing discipline (real evidence, not assumed or invented) rules out categorically, and which the explicit instruction for this task also rules out directly. The full §48 structure is deferred until Phase 9C ships and the platform has genuine directory content to show.

## What this phase does instead

Adds one new, honest, static section to the existing homepage introducing THE BUSINESS Network and pointing visitors at the two real, live capabilities Phase 9A/9B actually shipped: creating an account and building a profile. Nothing on it depends on any data existing yet — it's marketing copy and CTAs, not a data-driven directory preview.

**Included** (matches the explicit list):
1. **Join the Network CTA** → links to `/register` (real, live route)
2. **Login CTA** → links to `/login` (real, live route)
3. **Network Introduction** — a short paragraph explaining what the Network is and why it exists, aligned to Blueprint §1–§4's positioning (one Network, real profiles, real presence — not a directory pitch, since there's nothing to browse yet)
4. **Business Profile promotion** — what a Business Profile provides, based only on what Phase 9B actually built (company page, services, portfolio, public URL) — not the full Blueprint §7 field set, which doesn't exist yet
5. **Professional Profile promotion** — same, based on what Phase 9B actually built (public page, skills, experience, services, portfolio)
6. **Profile creation CTA blocks** — a CTA on each of the two promotion cards above, both pointing at `/register`

**Explicitly not shown**, per instruction, because no real data exists yet: Featured Businesses, Featured Professionals, directory statistics, opportunity counts, reviews, verification counts, marketplace activity. None of these appear anywhere in the new section or copy.

## Why no fake data was used

Every claim in the new copy is checkable against what's actually live: "create your business profile" links to a route that genuinely does that; "professionals showcase their work" describes the Portfolio Foundation that genuinely shipped in Phase 9B. No numbers, counts, names, or testimonials are invented — the copy deliberately stays at the level of "what you can do here" rather than "what's already happening here," since the latter would require real activity this platform doesn't have yet.

## Implementation

- `content/home.ts`: new `networkIntro` export (eyebrow/heading/body copy + two profile-type cards), following the same plain-object pattern every other homepage section already uses in this file.
- `components/blocks/network-intro.tsx`: new self-contained block component (no CMS/props dependency, matching the pattern of `FoundingClients`/`SectorGrid`), rendering the introduction and the two Business/Professional promotion cards, each with its own "Create your [type] profile" CTA to `/register`.
- `app/(app)/page.tsx`: renders `<NetworkIntro />` once, placed after `FoundingClients` and before `SectorGrid` — after the site has established credibility (founding-client pitch) and before the existing services/sector content, giving the Network its own clear moment without disrupting the established page flow.
- The existing `Hero`'s primary/secondary CTAs are untouched (they're CMS-managed via the Homepage global and are about the core THE BUSINESS lb service offering, not the Network specifically) — the new section is additive, not a replacement for any existing content.

## Acceptance

- `/register` and `/login` CTAs both resolve to real, working pages (already true since Phase 9A).
- No fabricated business, professional, testimonial, or activity data appears anywhere in the new section.
- No directory/search/opportunity/review/verification UI appears.
- Existing homepage sections, order, and content are otherwise unchanged.
