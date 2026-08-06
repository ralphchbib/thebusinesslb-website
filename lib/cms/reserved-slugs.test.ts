import { test } from "node:test";
import assert from "node:assert/strict";
import { isReservedSlug, RESERVED_SLUGS } from "./reserved-slugs";

/**
 * Proves the data/logic both protection layers share (Pages.slug's
 * validate function and getPublishedPageSlugs()'s filter/hard-fail) is
 * correct for the exact slugs a branch review flagged: the two that
 * reproduced the route-collision bug (about, pricing), the one that
 * didn't in one test but can't be relied on (services), and two more
 * real routes (contact, digital-assessment).
 *
 * This does not exercise the full Payload + Next.js build pipeline —
 * Payload's Local API is documented elsewhere in this project as broken
 * outside Next's own server process on this machine, which makes a true
 * end-to-end automated test impractical here. What this proves is that
 * the single source of truth every layer reads from correctly
 * identifies every real route as reserved; the full pipeline is
 * re-verified live for each PR (see PHASE2-COLLISION-FIX-REPORT.md).
 */

test("reserved slugs can never be treated as available Page slugs", () => {
  for (const slug of ["about", "pricing", "services", "contact", "digital-assessment", "case-studies"]) {
    assert.equal(isReservedSlug(slug), true, `expected "${slug}" to be reserved`);
  }
});

test("is case-insensitive", () => {
  assert.equal(isReservedSlug("About"), true);
  assert.equal(isReservedSlug("PRICING"), true);
  assert.equal(isReservedSlug("Services"), true);
});

test("every route under app/(app)/* (or the (payload) group) that a [slug] catch-all could otherwise claim is covered", () => {
  const expected = [
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
    "case-studies",
  ];
  for (const slug of expected) {
    assert.ok(RESERVED_SLUGS.has(slug), `RESERVED_SLUGS is missing "${slug}"`);
  }
  assert.equal(RESERVED_SLUGS.size, expected.length, "RESERVED_SLUGS has an unexpected extra/missing entry");
});

test("does not reserve a real landing-page slug", () => {
  assert.equal(isReservedSlug("black-friday-sale"), false);
  assert.equal(isReservedSlug("summer-campaign-2026"), false);
});
