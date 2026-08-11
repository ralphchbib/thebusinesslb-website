"use client";

/**
 * Phase 8 — the one required prerequisite before any tracking script loads.
 * See PHASE8-RISK-ASSESSMENT.md's privacy-compliance section: this site
 * sets zero tracking cookies today, and that's the reason no consent UI has
 * ever been needed until now. GA4 and Clarity change that, so both must be
 * gated behind a real accept/decline choice — not loaded unconditionally
 * with consent bolted on as an afterthought.
 *
 * Deliberately simple: a single localStorage flag, no cookie (consent state
 * itself doesn't need to be sent to the server, and avoiding a cookie for
 * it sidesteps the "is the consent cookie itself a tracking cookie"
 * question entirely). Vercel Analytics/Speed Insights are NOT gated by
 * this — they're already cookieless, so gating them would be an incorrect,
 * unnecessary restriction, not a safety improvement.
 */
export type ConsentState = "granted" | "denied" | "unset";

const STORAGE_KEY = "tb-analytics-consent";

export function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "granted" || value === "denied") return value;
    return "unset";
  } catch {
    // Private-browsing modes / storage-disabled environments — fail safe
    // to "unset" (banner shows, nothing loads until an explicit choice).
    return "unset";
  }
}

export function setStoredConsent(value: "granted" | "denied") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore — consent choice just won't persist across visits */
  }
  window.dispatchEvent(new CustomEvent("tb-consent-change", { detail: value }));
}

export const CONSENT_CHANGE_EVENT = "tb-consent-change";
