import { NextResponse } from "next/server";

/**
 * Security headers for every document response — public site, Payload
 * admin, and Payload's API routes all share this one Next.js app, so one
 * middleware covers all of them.
 *
 * script-src intentionally includes 'unsafe-inline' rather than a
 * per-request nonce. A nonce-based CSP was tried first (the pattern Next's
 * own docs describe: generate a nonce in middleware, thread it through via
 * request headers using Next's internal x-middleware-request-* protocol,
 * let Next apply it to its own RSC/hydration inline scripts). Verified
 * live in the browser that it does not: zero <script> tags in the
 * rendered HTML received a nonce attribute despite following the
 * documented API exactly, and every one of Next's inline hydration
 * scripts was blocked, breaking the page. Since that couldn't be made to
 * work and verified correct without risking the live site, 'unsafe-inline'
 * is used here instead — still a real improvement over no CSP at all,
 * since script-src 'self' + 'unsafe-inline' (no external hosts allowed)
 * blocks attacker-hosted <script src> injection, and every other
 * directive below (frame-ancestors, object-src, base-uri, form-action,
 * connect-src) is fully strict. Revisit if a working nonce approach is
 * found for this Next.js version.
 */
export function middleware() {
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    // Covers React/Framer Motion inline style attributes (style="..."),
    // not <style> tag injection from an external source.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    // next/font/google self-hosts fonts at build time — no runtime
    // request to fonts.gstatic.com, so 'self' is sufficient.
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    // Belt-and-suspenders with the X-Frame-Options header below —
    // frame-ancestors is the modern CSP equivalent, kept for browsers
    // that respect it in preference to X-Frame-Options.
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // No camera/mic/geolocation/payment use anywhere on this site — deny by
  // default rather than leaving them at the (permissive) browser default.
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
