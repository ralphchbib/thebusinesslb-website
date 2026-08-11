"use client";

import * as React from "react";
import { track } from "@/lib/analytics/track";

type ViewEvent = "pricing_view" | "service_page_view";

/**
 * Phase 8 — generic fire-once-on-mount page-view tracker for event types
 * that don't have a natural client component of their own to live in
 * (pricing_view, service_page_view — both mounted from server components).
 */
export function ViewTracker<K extends ViewEvent>({
  event,
  payload,
}: {
  event: K;
  payload: K extends "pricing_view" ? { path: string } : { service: string };
}) {
  React.useEffect(() => {
    track(event, payload as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
