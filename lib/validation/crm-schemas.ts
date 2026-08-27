import { z } from "zod";

/** Blueprint §39 CRM Lite — manual contact entry (PHASE16-TECHNICAL-DESIGN.md §H). */
export const crmContactSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(150, "Keep it under 150 characters."),
  email: z.string().trim().max(200).email("Enter a valid email.").optional().or(z.literal("")),
  phone: z.string().trim().max(50, "Keep it under 50 characters.").optional().or(z.literal("")),
  companyName: z.string().trim().max(150, "Keep it under 150 characters.").optional().or(z.literal("")),
});
export type CrmContactInput = z.infer<typeof crmContactSchema>;

/** New lead against an existing contact. */
export const crmLeadSchema = z.object({
  title: z.string().trim().min(3, "Say a bit more — at least 3 characters.").max(150, "Keep it under 150 characters."),
  estimatedValue: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Enter a valid amount."),
});
export type CrmLeadInput = z.infer<typeof crmLeadSchema>;

export const crmLeadStages = ["new", "qualified", "contacted", "proposal-sent", "negotiating", "won", "lost"] as const;

/** A note logged against a contact or a specific lead within it. */
export const crmNoteSchema = z.object({
  body: z.string().trim().min(1, "Write a note first.").max(1000, "Keep it under 1000 characters."),
});
export type CrmNoteInput = z.infer<typeof crmNoteSchema>;

/** Follow-up task / reminder. */
export const crmTaskSchema = z.object({
  title: z.string().trim().min(3, "Say a bit more — at least 3 characters.").max(150, "Keep it under 150 characters."),
  dueAt: z.string().trim().min(1, "Choose a due date."),
});
export type CrmTaskInput = z.infer<typeof crmTaskSchema>;
