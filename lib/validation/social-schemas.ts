import { z } from "zod";

/**
 * Phase 11 — the allowlist of directory filter keys a saved search may
 * store, matching BusinessProfileFilters/ProfessionalProfileFilters
 * (lib/cms/business-profiles.ts / professional-profiles.ts) minus `page`
 * — a saved search always replays from page 1.
 */
export const SAVED_SEARCH_FILTER_KEYS = ["q", "industry", "category", "location", "service", "skill", "language"] as const;

export const saveSearchSchema = z.object({
  profileType: z.enum(["business", "professional"], { message: "Something went wrong. Please try again." }),
  label: z.string().trim().min(1, "Name this search.").max(80, "Keep it under 80 characters."),
});
export type SaveSearchInput = z.infer<typeof saveSearchSchema>;
