import { z } from "zod";

/**
 * Phase 18A — the "invite by email" / "request to join by email" form
 * shared by both directions of an institution membership request (see
 * `lib/network/institution-actions.ts`). Email is the lookup key rather
 * than a search/autocomplete UI — the same convention this codebase
 * already uses for account lookup at login/registration, and it avoids
 * needing a new public institution directory just to complete this
 * phase's request/approval loop (PHASE18-TECHNICAL-DESIGN.md §F/§K
 * disclose that a browsable institution directory is a real, separate
 * follow-up, not silently assumed away).
 */
export const institutionMembershipRequestSchema = z.object({
  targetEmail: z.string().trim().email("Enter a valid email address."),
  role: z.string().trim().max(100, "Keep it under 100 characters.").optional(),
});
export type InstitutionMembershipRequestInput = z.infer<typeof institutionMembershipRequestSchema>;
