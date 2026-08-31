import { z } from "zod";
import { connectionTypes } from "./messaging-schemas";

/** Blueprint §33 — kept as two separate lists (not one flat enum) so the UI can group them by side; the collection's own server-side eligibility check (payload/diaspora-eligibility.ts) is the actual enforcement, this is just the client-visible shape. */
export const supplySideDeclarations = [
  "seeking-buyers",
  "seeking-distributors",
  "export-ready",
  "seeking-mentors",
  "open-to-partnerships",
  "available-remote",
] as const;

export const diasporaSideDeclarations = [
  "can-mentor",
  "can-distribute",
  "can-introduce-buyers",
  "looking-for-suppliers",
  "want-hire-lebanese-talent",
  "want-discover-products",
] as const;

export const allDeclarations = [...supplySideDeclarations, ...diasporaSideDeclarations] as const;

export const declarationSchema = z.object({
  declarations: z
    .array(z.enum(allDeclarations))
    .min(1, "Choose at least one declaration.")
    .max(allDeclarations.length),
  note: z.string().trim().max(500, "Keep it under 500 characters.").optional().or(z.literal("")),
});
export type DeclarationInput = z.infer<typeof declarationSchema>;

/**
 * Responding to a declaration reuses the same structured-introduction shape
 * every other Connections-creating form uses (§58 "Introduction Economy"),
 * plus the Bridge-specific `assistanceRequested` opt-in
 * (PHASE18B-TECHNICAL-DESIGN.md §E).
 */
export const declarationResponseSchema = z.object({
  connectionType: z.enum(connectionTypes, { message: "Choose a connection type." }),
  reason: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
  valueOffered: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
  expectedOutcome: z.string().trim().min(10, "Say a bit more — at least 10 characters.").max(500, "Keep it under 500 characters."),
});
export type DeclarationResponseInput = z.infer<typeof declarationResponseSchema>;
