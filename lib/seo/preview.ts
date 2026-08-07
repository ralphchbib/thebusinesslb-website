import { draftMode } from "next/headers";

/**
 * Phase 5A — single source of truth for "is this request currently in
 * Next.js Draft Mode." Wraps the awaited draftMode() call so every caller
 * doesn't repeat the same two-line pattern. See PHASE5-LIVE-PREVIEW-PLAN.md
 * §1.4 for why this is tab-based Draft Mode, not an iframe Live Preview.
 */
export async function isPreviewMode(): Promise<boolean> {
  return (await draftMode()).isEnabled;
}

/**
 * A page rendered under Draft Mode must never be indexable, regardless of
 * its own noindex field — draft/unpublished content being crawled would be
 * a real leak, not just a cosmetic issue. Stricter than Pages.noindex's
 * `{ index: false, follow: true }` (Phase 4C.5): preview pages also block
 * `follow`, since there's no reason for a crawler to walk links reached
 * only through an unpublished page.
 */
export const PREVIEW_ROBOTS = { index: false, follow: false } as const;
