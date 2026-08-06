/**
 * Phase 4B one-off migration — see MEDIA-ARCHITECTURE.md §F and
 * PHASE4B-MEDIA-LIBRARY-PLAN.md §F. Two things happen here:
 *
 * 1. Uploads the one real image this project had before Phase 4B
 *    (public/ralph-chbib-source.png, used for both Hero and Founder) into
 *    the new Media collection once, via Payload's Local API — not raw
 *    SQL, so file storage (local-disk fallback or real Vercel Blob,
 *    whichever the environment resolves to) and sharp-based imageSize
 *    generation both happen exactly as they would for a real editor
 *    upload.
 * 2. Recreates the Homepage global's full content (the same values
 *    scripts/seed-homepage.ts originally seeded) via Payload's Local API
 *    — not raw SQL this time — so the afterChange revalidation hook fires
 *    correctly, now pointing heroImage/founderImage at the uploaded Media
 *    document instead of a text path.
 *
 * The Homepage row needed to be fully deleted during this phase's schema
 * migration (see PHASE4B-IMPLEMENTATION-REPORT.md for why — the dev-mode
 * interactive schema push is unavailable in this environment, and
 * removing the single existing row was the safe way to let the new
 * required Media relationship columns be added without ambiguity). This
 * script restores it completely, word-for-word identical to the original
 * seed, with the two image fields now pointing at a real Media document.
 *
 * Idempotent: refuses to run if cms.homepage already has a row, exactly
 * like scripts/seed-homepage.ts.
 *
 * Run with: node -r @swc-node/register scripts/migrate-homepage-media.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import path from "path";

async function main() {
  const { getPayload } = await import("payload");
  const { default: config } = await import("../payload.config");
  const payload = await getPayload({ config });

  const existing = await payload.findGlobal({ slug: "homepage", depth: 0 });
  if (existing?.heroImage) {
    console.log("cms.homepage already has heroImage set — refusing to re-migrate.");
    process.exit(0);
  }

  const filePath = path.resolve(process.cwd(), "public/ralph-chbib-source.png");
  const media = await payload.create({
    collection: "media",
    data: { alt: "Ralph Chbib, founder of THE BUSINESS lb" },
    filePath,
  });
  console.log(`Uploaded public/ralph-chbib-source.png as Media id=${media.id}`);

  await payload.updateGlobal({
    slug: "homepage",
    data: {
      heroEyebrow: "Websites. E-commerce. Social Media. AI. Consulting.",
      heroHeadline: "Good businesses shouldn't be invisible.",
      heroSubheadline:
        "We help Lebanese companies build a professional digital presence, reach more customers, and grow — with the systems to keep it running after launch.",
      heroCtaPrimaryLabel: "Get your assessment",
      heroCtaPrimaryHref: "/digital-assessment/",
      heroCtaSecondaryLabel: "See what we do",
      heroCtaSecondaryHref: "/services/",
      heroReassurance: "Free for the first five businesses. No obligation, no pitch deck.",
      heroImage: media.id,

      problemEyebrow: "The problem",
      problemTitle: "The product is rarely the problem.",
      problemBody1:
        "Lebanon is full of capable companies — family businesses with decades of trade, food producers with real recipes, designers with real craft, service firms with real expertise. Very few of them are held back by what they sell.",
      problemBody2:
        "They're held back by everything around it. Customers can't find them. The website was built years ago and generates nothing. Products exist but there's no way to buy them online. The Instagram account posts, but nobody enquires. Every enquiry is handled by hand, on one phone, by one person.",
      problemQuote:
        "Many good businesses remain invisible to the customers who need them most. That's what we exist to change.",
      problemSymptoms: [
        { text: "A website that looks fine and produces no enquiries" },
        { text: "Strong physical products with no way to buy them online" },
        { text: "Posting consistently on Instagram with nothing to show for it" },
        { text: "Enquiries arriving on WhatsApp and getting lost" },
        { text: "No idea which marketing spend is working" },
        { text: "Growth that depends entirely on the owner being available" },
      ],

      transformationEyebrow: "How the pieces fit",
      transformationTitle: "We don't sell five services. We deliver one transformation.",
      transformationIntro:
        "Each service solves a different stage of the same journey. Most clients start at one stage and move forward as the previous one starts paying for itself.",
      transformationStages: [
        { stage: "Assess", where: "You know something needs to change, not what", what: "Digital assessment and a 90-day roadmap" },
        { stage: "Build the foundation", where: "No real online presence", what: "Branding, professional email, Google profile, website" },
        { stage: "Enable commerce", where: "Products, but no way to sell online", what: "Shopify store, payments, delivery, training" },
        { stage: "Attract customers", where: "A presence, but no traffic", what: "Social strategy, content, advertising" },
        { stage: "Grow", where: "Working, but not fast enough", what: "Consulting, research, growth strategy" },
        { stage: "Automate", where: "Growth outrunning your team", what: "AI tools, CRM, automation" },
        { stage: "Scale", where: "Ready for the next level", what: "Monthly partnership, reporting, expansion" },
      ],
      transformationClosingLine:
        "We assess the business, build its digital foundation, and stay on as its growth partner. That's the whole model.",

      processEyebrow: "How we work",
      processTitle: "No surprises, at any stage.",
      processSteps: [
        { number: "01", name: "Assess", body: "We understand the business before recommending anything." },
        { number: "02", name: "Plan", body: "You get a written scope: deliverables, what's excluded, timeline, price." },
        { number: "03", name: "Build", body: "Work is delivered by vetted specialists, coordinated by us. You have one point of contact." },
        { number: "04", name: "Launch", body: "Nothing goes live untested. You're trained on how to run it." },
        { number: "05", name: "Grow", body: "Monthly reporting, improvements, and a strategy review each quarter." },
      ],
      processTrustPoints: [
        { name: "Written agreements.", body: "Scope, revisions, ownership and timelines in writing before work starts." },
        { name: "Milestone payments.", body: "50% to begin, 30% at design approval, 20% before launch. You're never far ahead of the work." },
        { name: "You own everything.", body: "Accounts, files and access are yours, in your name, from day one." },
        { name: "One point of contact.", body: "You deal with us, not with five freelancers." },
      ],

      founderEyebrow: "The founder",
      founderTitle: "Ralph Chbib",
      founderQuote:
        "I'm Ralph Chbib, founder of THE BUSINESS. Through my experience with Lebanese institutions, communities, and business environments, I saw many capable companies with valuable products and services being held back by weak digital visibility, fragmented systems, and limited access to modern business tools. I founded THE BUSINESS to help these companies build a professional digital presence, reach customers, modernize their operations, and grow.",
      founderBody: "Ralph founded THE BUSINESS lb in 2026 and works directly on every project the company takes on.",
      founderImage: media.id,
      founderCtaLabel: "Read Ralph's full story →",
      founderCtaHref: "/about/ralph-chbib/",

      servicesEyebrow: "What we do",
      servicesTitle: "Five services. One outcome.",
      servicesIntro:
        "Most businesses don't need all five. Almost none need them in the same order. That's what the assessment is for.",
      servicesCards: [
        {
          service: await requireServiceId(payload, "shopify-ecommerce"),
          featured: true,
          overrideBody:
            "We build online stores that turn traditional businesses into digital ones — set up properly for how Lebanese customers actually pay and receive orders.",
          overrideBullets: [
            { text: "Store build and customisation" },
            { text: "Payments, delivery and cash-on-delivery" },
            { text: "Owner training and post-launch support" },
          ],
        },
        {
          service: await requireServiceId(payload, "social-media"),
          featured: true,
          overrideBody: "We don't sell posting. We build a system that turns attention into enquiries, and enquiries into customers.",
          overrideBullets: [
            { text: "Strategy and content calendar" },
            { text: "Reels, posts and stories" },
            { text: "Monthly reporting on what worked" },
          ],
        },
        {
          service: await requireServiceId(payload, "websites"),
          featured: false,
          overrideBody:
            "A professional website built around one commercial job — generating enquiries, taking bookings, or opening export markets.",
          overrideBullets: [],
        },
        {
          service: await requireServiceId(payload, "ai-automation"),
          featured: false,
          overrideBody: "Practical tools that answer customers faster, follow up automatically, and take repetitive work off your team.",
          overrideBullets: [],
        },
        {
          service: await requireServiceId(payload, "consulting"),
          featured: false,
          overrideBody: "Strategy, market research, business plans and go-to-market planning for companies making a real decision.",
          overrideBullets: [],
        },
      ],

      finalCtaHeadline: "Start with a clear picture.",
      finalCtaSubheadline:
        "One conversation, a written plan, and no obligation to buy anything. If we're not the right fit, we'll tell you — and you'll still have the roadmap.",

      metaTitle: "THE BUSINESS lb — Digital Growth for Lebanese Businesses",
      metaDescription:
        "We build Lebanese businesses for the digital world — websites, Shopify stores, social media, AI and consulting. Start with a free digital assessment.",
    },
  });

  console.log("Homepage global restored, with heroImage/founderImage pointing at the migrated Media document.");
  process.exit(0);
}

async function requireServiceId(payload: Awaited<ReturnType<typeof import("payload").getPayload>>, slug: string): Promise<number> {
  const result = await payload.find({ collection: "services", where: { slug: { equals: slug } }, limit: 1 });
  const doc = result.docs[0] as { id: number } | undefined;
  if (!doc) throw new Error(`Service with slug "${slug}" not found.`);
  return doc.id;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
