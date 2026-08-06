# Phase 4A — Homepage CMS: Final Review (pre-PR)

Prepared per explicit instruction, before opening the pull request. See `PHASE4A-HOMEPAGE-CMS-PLAN.md` for the approved plan and `PHASE4A-IMPLEMENTATION-REPORT.md` for the full build/validation narrative — this document is the tighter pre-PR checklist: files, rollback, testing, limitations.

## Files modified (13)

| File | Nature of change |
|---|---|
| `payload.config.ts` | +1 import, +1 entry in `globals: [...]` |
| `app/(app)/page.tsx` | Static `metadata` → `generateMetadata()`; fetches `getHomepage()`; prop-drills 7 components; adds 2 new sections (Testimonials, Case Studies rows) |
| `components/blocks/hero.tsx` | Props instead of `content/home` import; adds optional highlighted-text rendering |
| `components/blocks/problem-block.tsx` | Props instead of `content/home` import |
| `components/blocks/transformation-strip.tsx` | Props instead of `content/home` import — stays a Client Component |
| `components/blocks/process-block.tsx` | Props instead of `content/home` import |
| `components/blocks/founder-block.tsx` | Props instead of `content/home` import |
| `components/blocks/service-grid.tsx` | Props instead of `content/home` import; now renders resolved `Service` relationships + optional per-card overrides instead of a flat hardcoded array |
| `components/blocks/final-cta.tsx` | Props instead of `content/home` import |
| `content/home.ts` | 7 exports removed (`hero`, `problem`, `transformation`, `services`, `founder`, `finalCta`, plus `founder` found genuinely unused and dropped); `process` kept unchanged (still used by `/about/how-we-work/`, out of scope); `positioning`/`assessmentBlock`/`foundingClients`/`sectors`/`insights`/`faq` untouched |
| `content/services/types.ts` | `ServiceContent` gains one new **optional** field, `id?: number` — verified non-breaking for the 5 legacy `content/services/*.ts` files that predate the CMS migration |
| `lib/cms/services.ts` | `toServiceContent()` now also sets `id`; one new exported function, `getServicesByIds()` |
| `lib/cms/types.ts` | New `PayloadHomepageDoc` + `PayloadHomepageServicesCardDoc` interfaces appended |

## Files created (5)

| File | Purpose |
|---|---|
| `payload/globals/Homepage.ts` | The new Global — 10 tabs, no draft/publish, `update: adminOrEditor` |
| `lib/cms/homepage.ts` | `getHomepage()` data layer, `cache()`-wrapped, resolves Featured Services relationships |
| `scripts/seed-homepage.ts` | Idempotent one-off seed, imports the original hardcoded content verbatim |
| `PHASE4A-HOMEPAGE-CMS-PLAN.md` | Pre-approval plan (already reviewed and approved) |
| `PHASE4A-IMPLEMENTATION-REPORT.md` | Full build/validation report |

(`EDITOR-GUIDE.md` was created in an earlier, unrelated session and is not part of this phase's diff — noted here only because it shows as untracked alongside these changes.)

## Database impact

8 new tables, purely additive, confirmed via `information_schema` before and after: `homepage`, `homepage_problem_symptoms`, `homepage_transformation_stages`, `homepage_process_steps`, `homepage_process_trust_points`, `homepage_services_cards`, `homepage_services_cards_override_bullets`, `homepage_rels`. Zero existing tables altered. Zero existing rows touched — every other collection's row count confirmed identical before and after (Services 5, Articles 3, FAQs 49, Navigation 22, Pages 0, Testimonials 0, Case Studies 0, Users 1).

## Rollback plan

1. **Code**: this is one feature branch, not merged until reviewed — `git checkout main` fully reverts with zero production impact, same posture as Phases 2 and 3.
2. **If merged and a problem surfaces**: `git revert` of the merge commit + redeploy restores the pre-4A hardcoded homepage exactly, since `content/home.ts`'s removed exports are recovered by the revert itself.
3. **Database**: the 8 new tables have no foreign keys pointing *into* them from any existing table (only `homepage_rels`/`homepage_services_cards.service_id` point *out* to `testimonials`/`case_studies`/`services`, the standard direction) — `DROP TABLE` on the 8 new tables alone, if ever needed, carries no cascade risk to existing data.
4. **Seed script is safe to leave in place** — its idempotency guard means it can never accidentally re-run over real content; no cleanup action required even post-merge.

## Testing performed

- `npm run test` — 4/4 passing
- `npm run lint` — clean
- `npx tsc --noEmit` — clean
- `npm run build` — 31 routes, clean, unchanged route count from pre-4A
- Full content-parity check: every rendered homepage section's text compared word-for-word against the original hardcoded values — exact match, including all array-based content (6 problem symptoms, 7 transformation stages, 5 process steps, 4 trust points, 5 service cards with bespoke override copy)
- Live edit-and-render round-trip: updated hero headline + highlighted-text via SQL, rebuilt, confirmed the highlight span rendered correctly, reverted, rebuilt again, re-confirmed clean state
- Seed idempotency: ran twice, second run correctly refused with no duplicate row created
- SEO: title/description/canonical/OG image all confirmed matching pre-4A values, now CMS-sourced
- Structured data: confirmed exactly one JSON-LD script tag on the homepage, content unchanged (lives in the root layout, untouched by this phase)
- Sitemap: confirmed homepage's `/` entry unaffected
- Performance/caching: confirmed homepage still prerendered static (`x-nextjs-prerender: 1`, same `Cache-Control`) under a real production build (`next build` + `next start`, not dev mode)
- Payload admin editing: verified best-effort via GraphQL and REST (both correctly return and resolve the new Global, proving correct registration in Payload's runtime config) — no valid admin credentials exist in this environment to click through the actual UI, same constraint documented in every prior phase
- Full regression sweep: every existing route re-checked (`200` on all), including `/about/how-we-work/` specifically re-verified given the `process` cross-page dependency finding
- Row-count regression: every existing collection's count confirmed unchanged before/after

## Known limitations

1. **No draft/publish on the Homepage Global.** Every Save is instantly live, sitewide — an approved design decision (matches `SiteSettings`), not an oversight, but worth restating clearly: there is no staging step here the way there is for Pages, Testimonials, or Case Studies.
2. **Hero and Founder images require a developer step.** Both fields must point to a file already placed in `/public` — an external URL will fail at runtime, because this project has no `remotePatterns` configured and the hero image specifically needs to keep `next/image`'s optimization (it's the page's LCP element). This is stated directly in each field's admin description.
3. **Payload admin UI was not clicked through with real credentials** — verified via GraphQL/REST/direct-DB-edit round-trip instead, the same constraint and mitigation used in every phase since Phase 1.
4. **Featured Services requires 2 cards marked "featured" for the current large/small layout split to render as originally designed** — if an editor marks 0, 1, 3+ cards as featured, the layout will still render correctly (the split is purely `.filter(c => c.featured)`), but will look different from today's specific 2-large/3-small arrangement. Not a bug, just worth an editor knowing the current design assumes exactly 2.
5. **`content/home.ts`'s `process` export is now duplicated** (once for `/about/how-we-work/`, once independently inside the Homepage Global, both seeded from the same original values). Editing one does not update the other — an intentional tradeoff to avoid coupling two unrelated pages, documented in both the report and inline code comments, but a future editor could reasonably expect them to stay in sync and be surprised that they don't.

## Status

All 12 numbered requirements from the original brief verified live. Ready for PR.
