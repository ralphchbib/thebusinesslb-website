/**
 * Single source of truth for path segments that collide with an existing
 * literal route under app/(app)/* (or the (payload) route group).
 *
 * This module is imported from two independent places — the Payload
 * collection's save-time validate function (payload/collections/Pages.ts)
 * and every read path that can feed app/(app)/[slug]/page.tsx's
 * generateStaticParams (lib/cms/pages.ts, app/(app)/sitemap.ts) — on
 * purpose. A branch review reproduced a real bug where a published Page
 * slugged "about" caused Next.js's static build to register /about's
 * prerender-manifest entry to the [slug] catch-all instead of the real
 * app/(app)/about/page.tsx, confirmed via .next/prerender-manifest.json
 * (srcRoute: "/[slug]" instead of "/about"). The same collision
 * reproduced for "pricing"; "services" happened not to, in a way that
 * wasn't reliably explainable — meaning the save-time validate function
 * was the ONLY thing preventing this, with no structural backstop. See
 * PHASE2-COLLISION-FIX-REPORT.md for the full writeup.
 *
 * Keeping this list in sync with app/(app)/* is a manual step — there is
 * no automated check that walks the actual route tree. If a new literal
 * route is added under app/(app)/*, it must be added here too.
 */
export const RESERVED_SLUGS = new Set([
  "services",
  "insights",
  "pricing",
  "about",
  "contact",
  "digital-assessment",
  "privacy-policy",
  "terms",
  "thank-you",
  "admin",
  "api",
  // Added for Phase 3 (app/(app)/case-studies/page.tsx, the hub route).
  // The individual /case-studies/[slug]/ detail pages don't need their own
  // entry — nested dynamic segments can't collide with the top-level
  // [slug] catch-all, same as /services/[slug]/ and /insights/[slug]/.
  "case-studies",
  // Added for Phase 7 (app/(app)/quote/page.tsx — the new Quote Request
  // form route) and app/(app)/unsubscribe/page.tsx.
  "quote",
  "unsubscribe",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
