import { getPayload } from "payload";
import postgres from "postgres";
import config from "../payload.config";

/**
 * Phase 7 data migration: copies every row from the old Drizzle
 * (`public` schema) assessment_applications/contact_submissions/
 * newsletter_subscribers tables into the new Payload Leads/
 * NewsletterSubscribers collections (`cms` schema). Read-only against the
 * source tables — nothing here deletes or modifies them.
 *
 * Idempotent by design, not just "meant to be run once": matches on
 * leadType + fullName (assessment has no email field, so email can't be
 * the dedupe key for every type) + the exact preserved `createdAt`
 * timestamp before creating, and skips a row already present. This
 * matters because the old forms remain live (writing to Drizzle) right up
 * until this PR deploys — anything submitted between this script's first
 * run and go-live needs a second, safe run to catch it. See
 * PHASE7-IMPLEMENTATION-REPORT.md for why this is kept as a real,
 * reusable script rather than a one-shot throwaway.
 */
async function main() {
  const payload = await getPayload({ config });
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });

  const assessments = await sql`select * from assessment_applications order by created_at`;
  const contacts = await sql`select * from contact_submissions order by created_at`;
  const subscribers = await sql`select * from newsletter_subscribers order by subscribed_at`;

  console.log(
    `Source rows — assessments: ${assessments.length}, contacts: ${contacts.length}, subscribers: ${subscribers.length}`,
  );

  const created: { leadType: string; sourceId: string; newId: number | string }[] = [];
  const skipped: { leadType: string; sourceId: string }[] = [];

  async function leadAlreadyMigrated(fullName: string, createdAt: Date) {
    const existing = await payload.find({
      collection: "leads",
      where: { fullName: { equals: fullName }, createdAt: { equals: createdAt.toISOString() } },
      limit: 1,
      depth: 0,
    });
    return existing.totalDocs > 0;
  }

  for (const row of assessments) {
    if (await leadAlreadyMigrated(row.full_name, row.created_at)) {
      skipped.push({ leadType: "assessment", sourceId: row.id });
      continue;
    }
    const doc = await payload.create({
      collection: "leads",
      data: {
        leadType: "assessment",
        status: "submitted",
        fullName: row.full_name,
        businessName: row.business_name,
        sector: row.sector,
        websiteUrl: row.website_url || undefined,
        instagramHandle: row.instagram_handle || undefined,
        teamSize: row.team_size || undefined,
        biggestBlocker: row.biggest_blocker,
        ninetyDayGoal: row.ninety_day_goal || undefined,
        budget: row.budget,
        contactPreference: row.contact_preference,
        consentContact: row.consent_contact,
        utmSource: row.utm_source || undefined,
        utmMedium: row.utm_medium || undefined,
        utmCampaign: row.utm_campaign || undefined,
        referrerUrl: row.referrer_url || undefined,
        landingPath: row.landing_path || undefined,
      },
    });
    await sql`update cms.leads set created_at = ${row.created_at}, updated_at = ${row.created_at} where id = ${doc.id}`;
    created.push({ leadType: "assessment", sourceId: row.id, newId: doc.id as number });
  }

  for (const row of contacts) {
    if (await leadAlreadyMigrated(row.full_name, row.created_at)) {
      skipped.push({ leadType: "contact", sourceId: row.id });
      continue;
    }
    const doc = await payload.create({
      collection: "leads",
      data: {
        leadType: "contact",
        status: "submitted",
        fullName: row.full_name,
        businessName: row.business_name || undefined,
        email: row.email,
        whatsapp: row.whatsapp || undefined,
        interest: row.interest,
        message: row.message,
        utmSource: row.utm_source || undefined,
        utmMedium: row.utm_medium || undefined,
        utmCampaign: row.utm_campaign || undefined,
        referrerUrl: row.referrer_url || undefined,
        landingPath: row.landing_path || undefined,
      },
    });
    await sql`update cms.leads set created_at = ${row.created_at}, updated_at = ${row.created_at} where id = ${doc.id}`;
    created.push({ leadType: "contact", sourceId: row.id, newId: doc.id as number });
  }

  for (const row of subscribers) {
    const existing = await payload.find({
      collection: "newsletter-subscribers",
      where: { email: { equals: row.email } },
      limit: 1,
      depth: 0,
    });
    if (existing.totalDocs > 0) {
      skipped.push({ leadType: "newsletter", sourceId: row.id });
      continue;
    }
    const doc = await payload.create({
      collection: "newsletter-subscribers",
      data: {
        email: row.email,
        confirmed: row.confirmed,
        unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at).toISOString() : undefined,
        utmSource: row.utm_source || undefined,
        utmMedium: row.utm_medium || undefined,
        utmCampaign: row.utm_campaign || undefined,
        referrerUrl: row.referrer_url || undefined,
        landingPath: row.landing_path || undefined,
      },
    });
    await sql`update cms.newsletter_subscribers set created_at = ${row.subscribed_at}, updated_at = ${row.subscribed_at} where id = ${doc.id}`;
    created.push({ leadType: "newsletter", sourceId: row.id, newId: doc.id as number });
  }

  console.log("Created:", JSON.stringify(created, null, 2));
  console.log("Skipped (already migrated):", JSON.stringify(skipped, null, 2));
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
