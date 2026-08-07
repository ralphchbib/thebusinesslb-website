import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Phase 5A — disables Draft Mode and returns to normal (published-only)
 * browsing. No secret required to exit — only to enter — matching every
 * other "exit preview" implementation convention (leaving preview mode
 * is never the sensitive operation).
 *
 * Accepts an optional same-origin `path` to return to (e.g. the exact
 * preview page the banner's "Exit Preview" link was clicked from).
 * Deliberately validates it rather than passing it straight to
 * NextResponse.redirect: must start with a single "/" and not "//" (which
 * a browser would treat as a protocol-relative URL to a different host)
 * — the same open-redirect concern noted in app/api/draft/route.ts,
 * applied here since `path` (unlike that route's `slug`) isn't resolved
 * against a database record first.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestedPath = searchParams.get("path");
  const path = requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";

  (await draftMode()).disable();

  return NextResponse.redirect(new URL(path, request.url));
}
