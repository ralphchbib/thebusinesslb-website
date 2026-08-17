import { z } from "zod";

/** Blueprint §34 Circle Types. */
export const connectionTypes = [
  "supplier",
  "service-provider",
  "business-partner",
  "customer",
  "project-team",
  "mentor",
  "preferred",
  "alumni",
  "local-community",
] as const;

/**
 * §58 "Introduction Economy" — reason/valueOffered/expectedOutcome are
 * all required, not optional. This is the structural gate against
 * unsolicited contact (PHASE12-MESSAGING-NETWORKING-TECHNICAL-DESIGN.md
 * §I): there is no lower-friction path that skips these fields.
 */
export const connectionRequestSchema = z.object({
  connectionType: z.enum(connectionTypes, { message: "Choose a connection type." }),
  reason: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
  valueOffered: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
  expectedOutcome: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
});
export type ConnectionRequestInput = z.infer<typeof connectionRequestSchema>;

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write a message.").max(4000, "Keep it under 4000 characters."),
});
export type MessageInput = z.infer<typeof messageSchema>;
