import { z } from "zod";

export const sectorOptions = [
  { value: "food_mouneh", label: "Food brands & mouneh" },
  { value: "fashion", label: "Fashion & accessories" },
  { value: "beauty", label: "Beauty & wellness" },
  { value: "restaurants", label: "Restaurants & hospitality" },
  { value: "tourism", label: "Tourism" },
  { value: "retail", label: "Retail" },
  { value: "professional_services", label: "Professional services" },
  { value: "real_estate", label: "Real estate" },
  { value: "exporter", label: "Exporter" },
  { value: "startup", label: "Growing startup" },
  { value: "other", label: "Other" },
] as const;

export const budgetOptions = [
  { value: "under_500", label: "Under $500" },
  { value: "500_1500", label: "$500 – $1,500" },
  { value: "1500_4000", label: "$1,500 – $4,000" },
  { value: "4000_plus", label: "$4,000+" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const contactPrefOptions = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
] as const;

export const serviceInterestOptions = [
  { value: "websites", label: "Website" },
  { value: "shopify-ecommerce", label: "E-commerce & Shopify" },
  { value: "social-media", label: "Social media" },
  { value: "ai-automation", label: "AI & automation" },
  { value: "consulting", label: "Consulting" },
  { value: "unsure", label: "Not sure yet" },
] as const;

// Exported so lib/db/schema.ts can build matching Postgres enums from the
// same source of truth instead of duplicating these lists.
export const sectorValues = sectorOptions.map((o) => o.value) as [string, ...string[]];
export const budgetValues = budgetOptions.map((o) => o.value) as [string, ...string[]];
export const contactPrefValues = contactPrefOptions.map((o) => o.value) as [
  string,
  ...string[],
];
export const serviceValues = serviceInterestOptions.map((o) => o.value) as [
  string,
  ...string[],
];

/** Step 1 — low-friction identifying information. */
export const assessmentStep1Schema = z.object({
  fullName: z.string().trim().min(2, "Add your full name."),
  businessName: z.string().trim().min(2, "Add your business name."),
  sector: z.enum(sectorValues, { message: "Choose the closest sector." }),
  websiteUrl: z.string().trim().optional().default(""),
  instagramHandle: z.string().trim().optional().default(""),
});

/** Step 2 — qualifying detail, including budget. */
export const assessmentStep2Schema = z.object({
  teamSize: z.string().trim().optional().default(""),
  biggestBlocker: z
    .string()
    .trim()
    .min(10, "Tell us a little more — a sentence is enough."),
  ninetyDayGoal: z.string().trim().optional().default(""),
  budget: z.enum(budgetValues, { message: "Choose a budget range." }),
  contactPreference: z.enum(contactPrefValues, {
    message: "Choose how we should reach you.",
  }),
  consentContact: z.literal(true, {
    message: "We need your permission to get in touch about this application.",
  }),
});

export const assessmentSchema = assessmentStep1Schema.extend(
  assessmentStep2Schema.shape,
);
export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Add your full name."),
  businessName: z.string().trim().optional().default(""),
  email: z.string().trim().email("That email address doesn't look right."),
  whatsapp: z.string().trim().optional().default(""),
  interest: z.enum(serviceValues, { message: "Choose what you're interested in." }),
  message: z.string().trim().min(10, "Tell us a little about your business."),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const newsletterSchema = z.object({
  email: z.string().trim().email("That email address doesn't look right."),
});
export type NewsletterInput = z.infer<typeof newsletterSchema>;
