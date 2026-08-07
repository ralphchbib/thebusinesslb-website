import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCms } from "@/lib/cms/client";
import { getPageBySlug } from "@/lib/cms/pages";
import { getCaseStudyBySlug } from "@/lib/cms/case-studies";

/**
 * Phase 5A — enables Next.js Draft Mode for a single Page or Case Study.
 * See PHASE5-LIVE-PREVIEW-PLAN.md §2 for the full security rationale;
 * summary of what this route deliberately does, in order:
 *
 * 1. Reject unless `secret` matches PREVIEW_SECRET. Payload's Local API
 *    (used by every lib/cms/*.ts function, including the two called
 *    below) bypasses collection-level access control by default — so
 *    this secret, not Payload's `read` access function, is the real gate
 *    keeping draft content from being previewable by an arbitrary
 *    visitor. Never logged, never echoed back in any response.
 * 2. ALSO require an authenticated Payload session (admin or editor) —
 *    defense in depth beyond the secret alone, so a leaked/bookmarked
 *    preview link can't be replayed by someone who was never logged in.
 * 3. Whitelist `collection` to exactly "pages" | "case-studies" — never
 *    pass the query param through to Payload's `collection` option
 *    unchecked.
 * 4. Look the document up via the same draft-aware fetch the public page
 *    will use, and derive the redirect path FROM that confirmed
 *    document's own slug/collection — never redirect to a raw,
 *    attacker-suppliable path. Closes the open-redirect class of bug a
 *    naive `?path=` param would invite.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const collection = searchParams.get("collection");
  const slug = searchParams.get("slug");

  const previewSecret = process.env.PREVIEW_SECRET;
  if (!previewSecret || !secret || secret !== previewSecret) {
    return new NextResponse("Invalid or missing preview secret", { status: 401 });
  }

  const payload = await getCms();
  const { user } = await payload.auth({ headers: request.headers });
  if (!user || (user.role !== "admin" && user.role !== "editor")) {
    return new NextResponse("Not authenticated as an admin or editor", { status: 401 });
  }

  if (!slug) {
    return new NextResponse("Missing slug", { status: 400 });
  }

  let redirectPath: string;
  if (collection === "pages") {
    const page = await getPageBySlug(slug, true);
    if (!page) return new NextResponse("Page not found", { status: 404 });
    redirectPath = `/${page.slug}/`;
  } else if (collection === "case-studies") {
    const caseStudy = await getCaseStudyBySlug(slug, true);
    if (!caseStudy) return new NextResponse("Case study not found", { status: 404 });
    redirectPath = `/case-studies/${caseStudy.slug}/`;
  } else {
    return new NextResponse('Invalid collection — must be "pages" or "case-studies"', { status: 400 });
  }

  (await draftMode()).enable();

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
