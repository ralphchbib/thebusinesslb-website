import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import {
  sectorValues,
  budgetValues,
  contactPrefValues,
  serviceValues,
} from "@/lib/validation/schemas";

// Enums mirror the option lists in lib/validation/schemas.ts exactly, so a
// value that passes Zod validation can never be rejected by the database.
export const sectorEnum = pgEnum("sector", sectorValues);
export const budgetBracketEnum = pgEnum("budget_bracket", budgetValues);
export const contactPrefEnum = pgEnum("contact_pref", contactPrefValues);
export const serviceInterestEnum = pgEnum("service_interest", serviceValues);
export const submissionStatusEnum = pgEnum("submission_status", [
  "new",
  "reviewing",
  "contacted",
  "closed",
]);

/** Shared attribution columns — where a submission actually came from. */
const attributionColumns = {
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referrerUrl: text("referrer_url"),
  landingPath: text("landing_path"),
};

export const assessmentApplications = pgTable("assessment_applications", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Step 1
  fullName: text("full_name").notNull(),
  businessName: text("business_name").notNull(),
  sector: sectorEnum("sector").notNull(),
  websiteUrl: text("website_url"),
  instagramHandle: text("instagram_handle"),

  // Step 2
  teamSize: text("team_size"),
  biggestBlocker: text("biggest_blocker").notNull(),
  ninetyDayGoal: text("ninety_day_goal"),
  budget: budgetBracketEnum("budget").notNull(),
  contactPreference: contactPrefEnum("contact_preference").notNull(),
  consentContact: boolean("consent_contact").notNull().default(false),

  status: submissionStatusEnum("status").notNull().default("new"),
  ...attributionColumns,

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),

  fullName: text("full_name").notNull(),
  businessName: text("business_name"),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  interest: serviceInterestEnum("interest").notNull(),
  message: text("message").notNull(),

  status: submissionStatusEnum("status").notNull().default("new"),
  ...attributionColumns,

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: text("email").notNull().unique(),
  confirmed: boolean("confirmed").notNull().default(false),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  ...attributionColumns,

  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AssessmentApplicationRow = typeof assessmentApplications.$inferSelect;
export type ContactSubmissionRow = typeof contactSubmissions.$inferSelect;
export type NewsletterSubscriberRow = typeof newsletterSubscribers.$inferSelect;
