import { z } from "zod";
import { LANGUAGE_VALUES } from "@/payload/language-options";

const languagesSchema = z.array(z.enum(LANGUAGE_VALUES as [string, ...string[]])).default([]);

const slugSchema = z
  .string()
  .trim()
  .min(2, "Enter a slug.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Enter a service name."),
  description: z.string().trim().optional(),
});

const socialLinkSchema = z.object({
  label: z.string().trim().min(1, "Enter a label."),
  url: z.string().trim().min(1, "Enter a URL."),
});

export const businessProfileSchema = z.object({
  companyName: z.string().trim().min(2, "Enter a company name."),
  slug: slugSchema,
  description: z.string().trim().min(10, "Enter at least a short description."),
  industry: z.string().trim().optional(),
  category: z.string().trim().optional(),
  location: z.string().trim().optional(),
  languages: languagesSchema,
  contactEmail: z.string().trim().email("That email address doesn't look right.").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  services: z.array(serviceSchema).default([]),
  socialLinks: z.array(socialLinkSchema).default([]),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

const experienceSchema = z.object({
  role: z.string().trim().min(1, "Enter a role."),
  company: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const skillSchema = z.object({
  skill: z.string().trim().min(1, "Enter a skill."),
});

export const professionalProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter a name."),
  slug: slugSchema,
  title: z.string().trim().min(2, "Enter a professional title."),
  category: z.string().trim().optional(),
  location: z.string().trim().optional(),
  languages: languagesSchema,
  bio: z.string().trim().min(10, "Enter at least a short bio."),
  contactEmail: z.string().trim().email("That email address doesn't look right.").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  skills: z.array(skillSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  services: z.array(serviceSchema).default([]),
});
export type ProfessionalProfileInput = z.infer<typeof professionalProfileSchema>;

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(2, "Enter a title."),
  description: z.string().trim().optional(),
  projectLink: z.string().trim().optional(),
});
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
