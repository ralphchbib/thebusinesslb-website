/**
 * Blueprint §33 — display labels for `DeclarationValue`s. Deliberately a
 * plain, non-"use client" module: it's imported by both server components
 * (the Directory/detail pages) and client components (`declaration-form.tsx`,
 * `respond-to-declaration-button.tsx`'s sibling filter form), so it can't
 * live inside a "use client" file itself.
 */
export const DECLARATION_LABELS: Record<string, string> = {
  "seeking-buyers": "Seeking buyers",
  "seeking-distributors": "Seeking distributors",
  "export-ready": "Export ready",
  "seeking-mentors": "Seeking mentors",
  "open-to-partnerships": "Open to partnerships",
  "available-remote": "Available for remote services",
  "can-mentor": "Can mentor",
  "can-distribute": "Can distribute",
  "can-introduce-buyers": "Can introduce buyers",
  "looking-for-suppliers": "Looking for suppliers",
  "want-hire-lebanese-talent": "Want to hire Lebanese talent",
  "want-discover-products": "Want to discover Lebanese products",
};
