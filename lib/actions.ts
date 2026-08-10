"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  assessmentSchema,
  contactSchema,
  newsletterSchema,
  quoteSchema,
} from "@/lib/validation/schemas";
import { saveAssessmentLead, saveContactLead, saveQuoteLead } from "@/lib/cms/leads";
import { saveNewsletterSubscriber, unsubscribeNewsletter } from "@/lib/cms/newsletter";
import { checkAndRecordThrottle } from "@/lib/cms/rate-limit";

async function checkThrottle(kind: string) {
  const salt = process.env.IP_HASH_SALT || "dev-salt";
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown";
  const hash = createHash("sha256").update(salt + ip).digest("hex");
  return checkAndRecordThrottle(kind, hash);
}

function readAttribution(formData: FormData) {
  return {
    utmSource: String(formData.get("utm_source") ?? "") || undefined,
    utmMedium: String(formData.get("utm_medium") ?? "") || undefined,
    utmCampaign: String(formData.get("utm_campaign") ?? "") || undefined,
    referrerUrl: String(formData.get("referrer_url") ?? "") || undefined,
    landingPath: String(formData.get("landing_path") ?? "") || undefined,
  };
}

export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const ASSESSMENT_DB_ERROR_MESSAGE =
  "Something went wrong saving your application. Please try again, or message us on WhatsApp so you don't lose your spot.";
const CONTACT_DB_ERROR_MESSAGE =
  "Something went wrong sending your message. Please try again, or message us on WhatsApp instead.";
const QUOTE_DB_ERROR_MESSAGE =
  "Something went wrong sending your request. Please try again, or message us on WhatsApp instead.";

export async function submitAssessmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Honeypot + time-on-form guard against basic bots.
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { status: "success" }; // silently drop, pretend success
  }
  const startedAt = Number(formData.get("form_started_at") ?? 0);
  if (startedAt && Date.now() - startedAt < 3000) {
    return { status: "success" };
  }

  const allowed = await checkThrottle("assessment");
  if (!allowed) {
    return {
      status: "error",
      message: "Too many applications from this connection. Try again in an hour, or message us on WhatsApp.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = assessmentSchema.safeParse({
    fullName: raw.fullName,
    businessName: raw.businessName,
    sector: raw.sector,
    websiteUrl: raw.websiteUrl,
    instagramHandle: raw.instagramHandle,
    teamSize: raw.teamSize,
    biggestBlocker: raw.biggestBlocker,
    ninetyDayGoal: raw.ninetyDayGoal,
    budget: raw.budget,
    contactPreference: raw.contactPreference,
    consentContact: raw.consentContact === "on" || raw.consentContact === "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  try {
    await saveAssessmentLead(parsed.data, readAttribution(formData));
  } catch (err) {
    console.error("[db:error] saveAssessmentLead failed", err);
    return { status: "error", message: ASSESSMENT_DB_ERROR_MESSAGE };
  }

  // Notification now fires from the Leads collection's afterChange hook
  // (payload/hooks/notify-leads.ts), not from here — see
  // PHASE7-CRM-ARCHITECTURE.md §8.
  redirect(`/thank-you/assessment/?name=${encodeURIComponent(parsed.data.fullName.split(" ")[0])}`);
}

export async function submitContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { status: "success" };
  }

  const allowed = await checkThrottle("contact");
  if (!allowed) {
    return {
      status: "error",
      message: "Too many messages from this connection. Try again in an hour, or message us on WhatsApp.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSchema.safeParse({
    fullName: raw.fullName,
    businessName: raw.businessName,
    email: raw.email,
    whatsapp: raw.whatsapp,
    interest: raw.interest,
    message: raw.message,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  try {
    await saveContactLead(parsed.data, readAttribution(formData));
  } catch (err) {
    console.error("[db:error] saveContactLead failed", err);
    return { status: "error", message: CONTACT_DB_ERROR_MESSAGE };
  }

  redirect("/thank-you/contact/");
}

export async function submitQuoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { status: "success" };
  }
  const startedAt = Number(formData.get("form_started_at") ?? 0);
  if (startedAt && Date.now() - startedAt < 3000) {
    return { status: "success" };
  }

  const allowed = await checkThrottle("quote");
  if (!allowed) {
    return {
      status: "error",
      message: "Too many requests from this connection. Try again in an hour, or message us on WhatsApp.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = quoteSchema.safeParse({
    fullName: raw.fullName,
    businessName: raw.businessName,
    email: raw.email,
    whatsapp: raw.whatsapp,
    interest: raw.interest,
    projectDescription: raw.projectDescription,
    budget: raw.budget,
    timeline: raw.timeline,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  try {
    await saveQuoteLead(parsed.data, readAttribution(formData));
  } catch (err) {
    console.error("[db:error] saveQuoteLead failed", err);
    return { status: "error", message: QUOTE_DB_ERROR_MESSAGE };
  }

  redirect("/thank-you/quote/");
}

export async function subscribeNewsletterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Phase 7 — honeypot added; this form previously had none (see
  // PHASE7-ARCHITECTURE-REVIEW.md §1.4).
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { status: "success" };
  }

  const allowed = await checkThrottle("newsletter");
  if (!allowed) {
    return { status: "error", message: "Too many attempts. Try again shortly." };
  }

  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "That email doesn't look right.",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "" },
    };
  }

  try {
    await saveNewsletterSubscriber(parsed.data.email, readAttribution(formData));
  } catch (err) {
    console.error("[db:error] saveNewsletterSubscriber failed", err);
    return {
      status: "error",
      message: "Something went wrong subscribing you. Please try again shortly.",
    };
  }

  return { status: "success", message: "You're subscribed. First email arrives within two weeks." };
}

export async function unsubscribeNewsletterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "That email doesn't look right.",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "" },
    };
  }

  try {
    await unsubscribeNewsletter(parsed.data.email);
  } catch (err) {
    console.error("[db:error] unsubscribeNewsletter failed", err);
    return { status: "error", message: "Something went wrong. Please try again shortly." };
  }

  return { status: "success", message: "You're unsubscribed — you won't receive any more newsletter emails." };
}
