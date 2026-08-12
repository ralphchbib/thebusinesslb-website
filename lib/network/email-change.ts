import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Phase 9D — Payload does not re-verify an account when its email field is
 * changed via a plain update() (confirmed by reading
 * collections/operations/update.js directly: no verify-related logic at
 * all). Changing email with zero confirmation would let a hijacked/left-open
 * dashboard session silently repoint the account's login identity to an
 * address the account holder doesn't control. This module signs a short-
 * lived, single-purpose token proving "the holder of this session requested
 * a change to this specific new email" — sent to the *new* address, so
 * completing the change also proves the requester controls it.
 *
 * Deliberately HMAC-SHA256 via node:crypto rather than a JWT library
 * (`jose` is only a transitive dependency of Payload here, not a direct
 * one — pulling it into real app code for one narrow, non-authentication
 * token would be an undeclared-dependency risk for no real benefit over a
 * few lines of built-in crypto).
 */

interface EmailChangeTokenPayload {
  accountId: string;
  newEmail: string;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour, matching Payload's own default password-reset expiry order of magnitude

function getSecret(): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET is not set.");
  return secret;
}

export function signEmailChangeToken(accountId: string, newEmail: string): string {
  const payload: EmailChangeTokenPayload = {
    accountId,
    newEmail,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyEmailChangeToken(token: string): EmailChangeTokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as EmailChangeTokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.accountId !== "string" || typeof payload.newEmail !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
