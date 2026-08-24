import { z } from "zod";

export const verificationRequestSchema = z.object({
  statement: z.string().trim().min(20, "Explain what you're claiming — at least 20 characters."),
});
export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5, "Choose a rating."),
  body: z.string().trim().min(10, "Say a bit more — at least 10 characters."),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const recommendationSchema = z.object({
  body: z.string().trim().min(10, "Say a bit more — at least 10 characters."),
});
export type RecommendationInput = z.infer<typeof recommendationSchema>;

export const businessReplySchema = z.object({
  reply: z.string().trim().min(1, "Enter a reply.").max(2000, "Keep it under 2000 characters."),
});
export type BusinessReplyInput = z.infer<typeof businessReplySchema>;

export const contentReportReasons = ["spam", "fake", "harassment", "off-topic", "other"] as const;
export const contentReportSchema = z.object({
  reason: z.enum(contentReportReasons, { message: "Choose a reason." }),
  note: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
});
export type ContentReportInput = z.infer<typeof contentReportSchema>;

/** Phase 14 — Blueprint §56 #10: "Complaints and appeals require fair, documented procedures." */
export const appealSchema = z.object({
  statement: z.string().trim().min(20, "Explain why you're appealing — at least 20 characters.").max(2000, "Keep it under 2000 characters."),
});
export type AppealInput = z.infer<typeof appealSchema>;
