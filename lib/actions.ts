"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  assessmentSchema,
  contactSchema,
  newsletterSchema,
} from "@/lib/validation/schemas";
import {
  saveAssessmentApplication,
  saveContactSubmission,
  saveNewsletterSubscriber,
} from "@/lib/db/queries";
import {
  notifyAssessmentApplication,
  notifyContactSubmission,
  notifyNewsletterSubscriber,
} from "@/lib/email/notifications";

const THROTTLE_WINDOW_MS = 60 * 60 * 1000;
const THROTTLE_MAX = 3;
const throttleLog = new Map<string, number[]>();

async function checkThrottle(kind: string) {
  const salt = process.env.IP_HASH_SALT || "dev-salt";
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown";
  const hash = createHash("sha256").update(salt + ip).digest("hex");
  const key = `${kind}:${hash}`;
  const now = Date.now();
  const hits = (throttleLog.get(key) ?? []).filter(
    (t) => now - t < THROTTLE_WINDOW_MS,
  );
  if (hits.length >= THROTTLE_MAX) {
    return false;
  }
  hits.push(now);
  throttleLog.set(key, hits);
  return true;
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
    await saveAssessmentApplication(parsed.data, readAttribution(formData));
  } catch (err) {
    console.error("[db:error] saveAssessmentApplication failed", err);
    return { status: "error", message: ASSESSMENT_DB_ERROR_MESSAGE };
  }

  // Email is a notification on top of the saved record, not the record
  // itself — a failed send here must never block the visitor's confirmation.
  await notifyAssessmentApplication(parsed.data);

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
    await saveContactSubmission(parsed.data, readAttribution(formData));
  } catch (err) {
    console.error("[db:error] saveContactSubmission failed", err);
    return { status: "error", message: CONTACT_DB_ERROR_MESSAGE };
  }

  await notifyContactSubmission(parsed.data);

  redirect("/thank-you/contact/");
}

export async function subscribeNewsletterAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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

  await notifyNewsletterSubscriber(parsed.data.email);

  return { status: "success", message: "You're subscribed. First email arrives within two weeks." };
}
