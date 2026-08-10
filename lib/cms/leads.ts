import { getCms } from "./client";
import type { AssessmentInput, ContactInput, QuoteInput } from "@/lib/validation/schemas";

export interface AttributionSnapshot {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerUrl?: string;
  landingPath?: string;
}

/**
 * Phase 7 — replaces lib/db/queries.ts's Drizzle-backed save* functions.
 * Each function here does exactly one Payload create() and lets a failed
 * write throw, exactly like the functions it replaces — the server actions
 * in lib/actions.ts remain responsible for catching it, logging it, and
 * returning a graceful error to the visitor. Notification is no longer
 * called from here (or from the server action) — it happens in the Leads
 * collection's afterChange hook (payload/hooks/notify-leads.ts), so a
 * caller of these functions doesn't need to know notification exists.
 */

export async function saveAssessmentLead(data: AssessmentInput, attribution: AttributionSnapshot) {
  const payload = await getCms();
  return payload.create({
    collection: "leads",
    data: {
      leadType: "assessment",
      status: "submitted",
      fullName: data.fullName,
      businessName: data.businessName,
      sector: data.sector,
      websiteUrl: data.websiteUrl || undefined,
      instagramHandle: data.instagramHandle || undefined,
      teamSize: data.teamSize || undefined,
      biggestBlocker: data.biggestBlocker,
      ninetyDayGoal: data.ninetyDayGoal || undefined,
      budget: data.budget,
      contactPreference: data.contactPreference,
      consentContact: data.consentContact,
      ...attribution,
    },
  });
}

export async function saveContactLead(data: ContactInput, attribution: AttributionSnapshot) {
  const payload = await getCms();
  return payload.create({
    collection: "leads",
    data: {
      leadType: "contact",
      status: "submitted",
      fullName: data.fullName,
      businessName: data.businessName || undefined,
      email: data.email,
      whatsapp: data.whatsapp || undefined,
      interest: data.interest,
      message: data.message,
      ...attribution,
    },
  });
}

export async function saveQuoteLead(data: QuoteInput, attribution: AttributionSnapshot) {
  const payload = await getCms();
  return payload.create({
    collection: "leads",
    data: {
      leadType: "quote",
      status: "submitted",
      fullName: data.fullName,
      businessName: data.businessName || undefined,
      email: data.email,
      whatsapp: data.whatsapp || undefined,
      interest: data.interest,
      projectDescription: data.projectDescription,
      budget: data.budget,
      timeline: data.timeline,
      ...attribution,
    },
  });
}
