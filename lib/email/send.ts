import { Resend } from "resend";
import { siteConfig } from "@/lib/config";

let _resend: Resend | undefined;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

/**
 * Thin transactional-email wrapper. If RESEND_API_KEY isn't configured, or
 * the send fails for any reason (bad key, unverified domain, Resend outage),
 * this logs clearly and resolves instead of throwing — per §11.5 of the
 * build spec, a lead must never be lost because a mail provider is down.
 * The caller (lib/actions.ts) already has the submission safely in the
 * database by the time this runs; email is a notification on top, not the
 * record of truth.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ delivered: boolean }> {
  const resend = getResend();
  if (!resend) {
    console.log(`[email:noop] RESEND_API_KEY not set — to=${params.to} subject="${params.subject}"`);
    return { delivered: false };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `THE BUSINESS lb <${process.env.RESEND_FROM_EMAIL || siteConfig.email}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error(
        `[email:failed] to=${params.to} subject="${params.subject}" reason=${error.name}: ${error.message}`,
      );
      return { delivered: false };
    }

    console.log(`[email:sent] id=${data?.id} to=${params.to} subject="${params.subject}"`);
    return { delivered: true };
  } catch (err) {
    // Network-level failures (DNS, timeout) throw rather than returning
    // `error`, unlike Resend's own API errors above — catch those too.
    console.error(`[email:error] to=${params.to} subject="${params.subject}"`, err);
    return { delivered: false };
  }
}
