import "server-only";
import { cookies } from "next/headers";
import { getCms } from "@/lib/cms/client";

/**
 * Phase 9A session layer — see PHASE9A-TECHNICAL-DESIGN.md §A.1 for the
 * full reasoning. Payload's auto-generated REST auth endpoints all share
 * one global `cookiePrefix`-derived cookie name across every auth
 * collection in the instance (verified against the installed package
 * source, not assumed) — registering `network-accounts` as a second
 * `auth: true` collection and using its REST login as-is would silently
 * overwrite the existing admin `users` session cookie in the same browser.
 *
 * The fix: never use the auto-generated REST login/logout for
 * network-accounts. Call Payload's Local API directly (loginLocal has no
 * cookie side effect at all — confirmed by reading auth/operations/login.js)
 * and manage one distinctly-named cookie ourselves. To validate it later,
 * this module reads that cookie and hands the token to Payload's Local API
 * `auth()` operation via an `Authorization: Bearer` header — Payload's JWT
 * extraction supports Bearer-header extraction by default
 * (jwtOrder: ['JWT', 'Bearer', 'cookie'], confirmed in config/defaults.js),
 * independent of any cookie name.
 */
export const NETWORK_COOKIE_NAME = "network-token";

const isProduction = process.env.VERCEL_ENV === "production";

export async function setNetworkSessionCookie(token: string, exp?: number) {
  const store = await cookies();
  const maxAge = exp ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : undefined;
  store.set(NETWORK_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearNetworkSessionCookie() {
  const store = await cookies();
  store.delete(NETWORK_COOKIE_NAME);
}

export type NetworkUser = {
  id: string;
  collection: string;
  email: string;
  name: string;
  accountType: "business" | "professional" | "consumer" | "institution" | "diaspora";
  diasporaCountry?: string | null;
  status: "active" | "suspended";
};

/**
 * Reads the network-accounts session cookie (if any) and validates it
 * through Payload's Local API. Returns null for no cookie, an expired/
 * invalid token, or a token that belongs to a different auth collection
 * (e.g. an admin `users` token is never treated as a network session,
 * even though both collections' underlying JWTs are structurally similar).
 */
export async function getNetworkUser(): Promise<NetworkUser | null> {
  const store = await cookies();
  const token = store.get(NETWORK_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await getCms();
  const headers = new Headers({ Authorization: `Bearer ${token}` });

  try {
    const { user } = await payload.auth({ headers });
    if (!user) return null;
    const withCollection = user as typeof user & { collection?: string };
    if (withCollection.collection !== "network-accounts") return null;
    return user as unknown as NetworkUser;
  } catch {
    return null;
  }
}
