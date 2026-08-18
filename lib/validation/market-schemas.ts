import { z } from "zod";
import { connectionTypes } from "./messaging-schemas";

/** Blueprint §18 "Offer and Need Exchange." */
export const postingTypes = ["offer", "need"] as const;

export const marketPostingSchema = z.object({
  postingType: z.enum(postingTypes, { message: "Choose Offer or Need." }),
  title: z.string().trim().min(5, "Say a bit more — at least 5 characters.").max(150, "Keep it under 150 characters."),
  description: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(1000, "Keep it under 1000 characters."),
  category: z.string().trim().max(100, "Keep it under 100 characters.").optional().or(z.literal("")),
  location: z.string().trim().max(100, "Keep it under 100 characters.").optional().or(z.literal("")),
  budgetRange: z.string().trim().max(100, "Keep it under 100 characters.").optional().or(z.literal("")),
});
export type MarketPostingInput = z.infer<typeof marketPostingSchema>;

/**
 * Responding to a posting reuses the exact same structured-introduction
 * shape `connectionRequestSchema` (messaging-schemas.ts) already
 * establishes for a direct profile Connect — §58 "Introduction Economy"
 * applies identically whether the connection originated from a posting or
 * not (PHASE13-TECHNICAL-DESIGN.md §H).
 */
export const postingResponseSchema = z.object({
  connectionType: z.enum(connectionTypes, { message: "Choose a connection type." }),
  reason: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
  valueOffered: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
  expectedOutcome: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
});
export type PostingResponseInput = z.infer<typeof postingResponseSchema>;
