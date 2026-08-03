import { eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  assessmentApplications,
  contactSubmissions,
  newsletterSubscribers,
} from "./schema";
import type { AssessmentInput, ContactInput } from "@/lib/validation/schemas";

export interface AttributionSnapshot {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerUrl?: string;
  landingPath?: string;
}

/**
 * Each function here does exactly one insert and lets a failed write throw —
 * the server actions in lib/actions.ts are responsible for catching it,
 * logging it, and returning a graceful error to the visitor. That keeps the
 * "what happens if the database is down" decision in one place.
 */

export async function saveAssessmentApplication(
  data: AssessmentInput,
  attribution: AttributionSnapshot,
) {
  const db = getDb();
  const [row] = await db
    .insert(assessmentApplications)
    .values({
      fullName: data.fullName,
      businessName: data.businessName,
      sector: data.sector as (typeof assessmentApplications.$inferInsert)["sector"],
      websiteUrl: data.websiteUrl || null,
      instagramHandle: data.instagramHandle || null,
      teamSize: data.teamSize || null,
      biggestBlocker: data.biggestBlocker,
      ninetyDayGoal: data.ninetyDayGoal || null,
      budget: data.budget as (typeof assessmentApplications.$inferInsert)["budget"],
      contactPreference:
        data.contactPreference as (typeof assessmentApplications.$inferInsert)["contactPreference"],
      consentContact: data.consentContact,
      ...attribution,
    })
    .returning();
  return row;
}

export async function saveContactSubmission(
  data: ContactInput,
  attribution: AttributionSnapshot,
) {
  const db = getDb();
  const [row] = await db
    .insert(contactSubmissions)
    .values({
      fullName: data.fullName,
      businessName: data.businessName || null,
      email: data.email,
      whatsapp: data.whatsapp || null,
      interest: data.interest as (typeof contactSubmissions.$inferInsert)["interest"],
      message: data.message,
      ...attribution,
    })
    .returning();
  return row;
}

export async function saveNewsletterSubscriber(
  email: string,
  attribution: AttributionSnapshot,
) {
  const db = getDb();
  // Re-subscribing (or re-submitting the footer form) should feel like
  // success, not a duplicate-key error — upsert and clear any prior
  // unsubscribe instead of failing.
  const [row] = await db
    .insert(newsletterSubscribers)
    .values({ email, ...attribution })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: { ...attribution, unsubscribedAt: null },
    })
    .returning();
  return row;
}

export async function unsubscribeNewsletter(email: string) {
  const db = getDb();
  await db
    .update(newsletterSubscribers)
    .set({ unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.email, email));
}
