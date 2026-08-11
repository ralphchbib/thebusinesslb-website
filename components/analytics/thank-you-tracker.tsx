"use client";

import * as React from "react";
import { track } from "@/lib/analytics/track";

const TRACKED_EVENTS = {
  assessment: "assessment_submit",
  contact: "contact_submit",
  quote: "quote_submit",
} as const;

/**
 * Phase 8 — Assessment/Contact/Quote's server actions redirect() on success
 * rather than returning inline state, so their submit events fire here
 * instead of at the form itself, once per mount.
 */
export function ThankYouTracker({ type, path }: { type: string; path: string }) {
  React.useEffect(() => {
    const event = TRACKED_EVENTS[type as keyof typeof TRACKED_EVENTS];
    if (event) track(event, { path });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
