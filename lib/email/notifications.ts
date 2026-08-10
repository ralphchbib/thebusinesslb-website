import { sendEmail } from "./send";
import { siteConfig } from "@/lib/config";

const notifyAddress = process.env.NOTIFICATION_EMAIL || siteConfig.email;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined) {
  return value ? `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>` : "";
}

/**
 * Phase 7 — replaces the three separate notifyX functions that used to be
 * called directly from lib/actions.ts with one function driven by the
 * Leads collection's `leadType` field, called from the afterChange hook
 * (payload/hooks/notify-leads.ts) instead — see PHASE7-CRM-ARCHITECTURE.md
 * §7/§8 for why the hook is the right place for this now. Takes a loosely-
 * typed doc (every field optional/nullable, matching what a Payload hook
 * actually receives) rather than the old Zod-inferred AssessmentInput/
 * ContactInput types, since a hook doesn't have those narrow types
 * available — validation already happened upstream in the server action.
 */
export interface LeadNotificationDoc {
  leadType: "assessment" | "contact" | "quote";
  fullName: string;
  businessName?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  sector?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  teamSize?: string | null;
  biggestBlocker?: string | null;
  ninetyDayGoal?: string | null;
  budget?: string | null;
  contactPreference?: string | null;
  interest?: string | null;
  message?: string | null;
  projectDescription?: string | null;
  timeline?: string | null;
}

export async function notifyLeadCreated(doc: LeadNotificationDoc) {
  const subjectByType: Record<LeadNotificationDoc["leadType"], string> = {
    assessment: `New assessment application — ${doc.businessName || doc.fullName}`,
    contact: `New message — ${doc.fullName}`,
    quote: `New quote request — ${doc.businessName || doc.fullName}`,
  };

  const bodyByType: Record<LeadNotificationDoc["leadType"], string> = {
    assessment: `
      <ul>
        ${row("Sector", doc.sector)}
        ${row("Website", doc.websiteUrl || "none given")}
        ${row("Instagram", doc.instagramHandle || "none given")}
        ${row("Team size", doc.teamSize || "not given")}
        ${row("Budget", doc.budget)}
        ${row("Prefers contact via", doc.contactPreference)}
      </ul>
      ${doc.biggestBlocker ? `<p><strong>Biggest blocker:</strong><br/>${escapeHtml(doc.biggestBlocker)}</p>` : ""}
      ${doc.ninetyDayGoal ? `<p><strong>90-day goal:</strong><br/>${escapeHtml(doc.ninetyDayGoal)}</p>` : ""}
    `,
    contact: `
      <ul>
        ${row("Email", doc.email)}
        ${row("WhatsApp", doc.whatsapp || "not given")}
        ${row("Interested in", doc.interest)}
      </ul>
      ${doc.message ? `<p><strong>Message:</strong><br/>${escapeHtml(doc.message)}</p>` : ""}
    `,
    quote: `
      <ul>
        ${row("Email", doc.email)}
        ${row("WhatsApp", doc.whatsapp || "not given")}
        ${row("Interested in", doc.interest)}
        ${row("Budget", doc.budget)}
        ${row("Timeline", doc.timeline)}
      </ul>
      ${doc.projectDescription ? `<p><strong>Project description:</strong><br/>${escapeHtml(doc.projectDescription)}</p>` : ""}
    `,
  };

  return sendEmail({
    to: notifyAddress,
    subject: subjectByType[doc.leadType],
    html: `<h2>New ${doc.leadType} lead</h2><p><strong>${escapeHtml(doc.fullName)}</strong>${doc.businessName ? ` — ${escapeHtml(doc.businessName)}` : ""}</p>${bodyByType[doc.leadType]}`,
  });
}

export async function notifyNewsletterSubscriber(email: string) {
  return sendEmail({
    to: notifyAddress,
    subject: `New newsletter subscriber`,
    html: `<p>New subscriber: <strong>${escapeHtml(email)}</strong></p>`,
  });
}
