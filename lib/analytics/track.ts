"use client";

import { getStoredConsent } from "@/lib/consent";

/**
 * Typed analytics helper — Appendix D. Fires to GA4 when configured; always
 * safe to call even before consent/config is present.
 *
 * Phase 8 — pushes directly onto window.dataLayer using gtag's own queuing
 * convention, rather than requiring window.gtag to already exist. GA4Script
 * mounts the real gtag.js tag asynchronously behind a consent-check effect,
 * so on a fresh full page load with consent already granted from a prior
 * session, a mount-time caller (e.g. ViewTracker) can run before that
 * effect completes; gating on window.gtag directly silently dropped those
 * events. Checking consent here instead removes the race — this is exactly
 * how GA4's own snippet is meant to be used (calls made before the library
 * finishes loading queue in dataLayer and are processed once it does).
 */
type EventPayloads = {
  assessment_form_start: { path: string };
  assessment_form_step2: { path: string };
  assessment_submit: { path: string };
  contact_submit: { path: string };
  quote_submit: { path: string };
  whatsapp_click: { path: string; position: string };
  pricing_view: { path: string };
  service_page_view: { service: string };
  package_cta_click: { service: string; package: string };
  cta_click: { cta_id: string; cta_location: string };
  newsletter_subscribe: { path: string };
  faq_open: { page: string; question: string };
  scroll_75: { path: string };
};

export function track<K extends keyof EventPayloads>(
  event: K,
  payload: EventPayloads[K],
) {
  if (typeof window === "undefined") return;
  if (getStoredConsent() !== "granted") return;
  const w = window as typeof window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(["event", event, payload]);
}
