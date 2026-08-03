"use client";

/**
 * Typed analytics helper — Appendix D. Fires to GA4 when configured; always
 * safe to call even before consent/config is present.
 */
type EventPayloads = {
  assessment_form_start: { path: string };
  assessment_form_step2: { path: string };
  assessment_submit: { sector: string; budget: string };
  contact_submit: { interest: string; path: string };
  whatsapp_click: { path: string; position: string };
  pricing_view: { path: string };
  service_page_view: { service: string };
  package_cta_click: { service: string; package: string };
  newsletter_subscribe: { path: string };
  faq_open: { page: string; question: string };
  scroll_75: { path: string };
};

export function track<K extends keyof EventPayloads>(
  event: K,
  payload: EventPayloads[K],
) {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", event, payload);
  }
}
