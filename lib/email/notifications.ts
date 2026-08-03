import { sendEmail } from "./send";
import { siteConfig } from "@/lib/config";
import type { AssessmentInput, ContactInput } from "@/lib/validation/schemas";

const notifyAddress = process.env.NOTIFICATION_EMAIL || siteConfig.email;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyAssessmentApplication(data: AssessmentInput) {
  return sendEmail({
    to: notifyAddress,
    subject: `New assessment application — ${data.businessName}`,
    html: `
      <h2>New Digital Business Assessment application</h2>
      <p><strong>${escapeHtml(data.fullName)}</strong> — ${escapeHtml(data.businessName)}</p>
      <ul>
        <li>Sector: ${escapeHtml(data.sector)}</li>
        <li>Website: ${escapeHtml(data.websiteUrl || "none given")}</li>
        <li>Instagram: ${escapeHtml(data.instagramHandle || "none given")}</li>
        <li>Team size: ${escapeHtml(data.teamSize || "not given")}</li>
        <li>Budget: ${escapeHtml(data.budget)}</li>
        <li>Prefers contact via: ${escapeHtml(data.contactPreference)}</li>
      </ul>
      <p><strong>Biggest blocker:</strong><br/>${escapeHtml(data.biggestBlocker)}</p>
      ${data.ninetyDayGoal ? `<p><strong>90-day goal:</strong><br/>${escapeHtml(data.ninetyDayGoal)}</p>` : ""}
    `,
  });
}

export async function notifyContactSubmission(data: ContactInput) {
  return sendEmail({
    to: notifyAddress,
    subject: `New message — ${data.fullName}`,
    html: `
      <h2>New contact form message</h2>
      <p><strong>${escapeHtml(data.fullName)}</strong> (${escapeHtml(data.businessName || "no business name given")})</p>
      <ul>
        <li>Email: ${escapeHtml(data.email)}</li>
        <li>WhatsApp: ${escapeHtml(data.whatsapp || "not given")}</li>
        <li>Interested in: ${escapeHtml(data.interest)}</li>
      </ul>
      <p><strong>Message:</strong><br/>${escapeHtml(data.message)}</p>
    `,
  });
}

export async function notifyNewsletterSubscriber(email: string) {
  return sendEmail({
    to: notifyAddress,
    subject: `New newsletter subscriber`,
    html: `<p>New subscriber: <strong>${escapeHtml(email)}</strong></p>`,
  });
}
