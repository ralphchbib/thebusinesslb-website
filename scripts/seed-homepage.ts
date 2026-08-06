/**
 * One-off seed for the Phase 4A "homepage" Global — imports the content
 * that used to be hardcoded in content/home.ts (hero, problem,
 * transformation, process, founder, services, finalCta) plus the CTA
 * hrefs/image paths that were inline in JSX, not in content/home.ts at
 * all, so the live homepage is pixel-and-word identical immediately after
 * seeding.
 *
 * Idempotent: refuses to run if cms.homepage already has a row, so a
 * second accidental run can never silently overwrite real edits an editor
 * already made in the admin panel.
 *
 * Run with: node -r @swc-node/register scripts/seed-homepage.ts
 * (same mechanism package.json's "test" script already uses to run .ts
 * files directly — no new dependency needed.)
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  const sql = postgres(databaseUrl, { prepare: false, ssl: "require" });

  try {
    const existing = await sql`select id from cms.homepage limit 1`;
    if (existing.length > 0) {
      console.log(
        `cms.homepage already has a row (id=${existing[0].id}) — refusing to seed. ` +
          "Delete it first if you really want to re-seed from scratch.",
      );
      return;
    }

    const serviceSlugs = ["shopify-ecommerce", "social-media", "websites", "ai-automation", "consulting"];
    const services = await sql`select id, slug from cms.services where slug in ${sql(serviceSlugs)}`;
    const serviceIdBySlug = new Map(services.map((s) => [s.slug as string, s.id as number]));
    for (const slug of serviceSlugs) {
      if (!serviceIdBySlug.has(slug)) {
        throw new Error(`Service with slug "${slug}" not found — cannot seed Featured Services cards.`);
      }
    }

    await sql.begin(async (sql) => {
      const [homepage] = await sql`
        insert into cms.homepage (
          hero_eyebrow, hero_headline, hero_subheadline,
          hero_cta_primary_label, hero_cta_primary_href,
          hero_cta_secondary_label, hero_cta_secondary_href,
          hero_reassurance, hero_image, hero_image_alt,
          problem_eyebrow, problem_title, problem_body1, problem_body2, problem_quote,
          transformation_eyebrow, transformation_title, transformation_intro, transformation_closing_line,
          process_eyebrow, process_title,
          founder_eyebrow, founder_title, founder_quote, founder_body,
          founder_image, founder_image_alt, founder_cta_label, founder_cta_href,
          services_eyebrow, services_title, services_intro,
          final_cta_headline, final_cta_subheadline,
          meta_title, meta_description,
          updated_at, created_at
        ) values (
          'Websites. E-commerce. Social Media. AI. Consulting.',
          'Good businesses shouldn''t be invisible.',
          'We help Lebanese companies build a professional digital presence, reach more customers, and grow — with the systems to keep it running after launch.',
          'Get your assessment', '/digital-assessment/',
          'See what we do', '/services/',
          'Free for the first five businesses. No obligation, no pitch deck.',
          '/ralph-chbib-source.png', 'Ralph Chbib, founder of THE BUSINESS lb',
          'The problem', 'The product is rarely the problem.',
          'Lebanon is full of capable companies — family businesses with decades of trade, food producers with real recipes, designers with real craft, service firms with real expertise. Very few of them are held back by what they sell.',
          'They''re held back by everything around it. Customers can''t find them. The website was built years ago and generates nothing. Products exist but there''s no way to buy them online. The Instagram account posts, but nobody enquires. Every enquiry is handled by hand, on one phone, by one person.',
          'Many good businesses remain invisible to the customers who need them most. That''s what we exist to change.',
          'How the pieces fit', 'We don''t sell five services. We deliver one transformation.',
          'Each service solves a different stage of the same journey. Most clients start at one stage and move forward as the previous one starts paying for itself.',
          'We assess the business, build its digital foundation, and stay on as its growth partner. That''s the whole model.',
          'How we work', 'No surprises, at any stage.',
          'The founder', 'Ralph Chbib',
          'I''m Ralph Chbib, founder of THE BUSINESS. Through my experience with Lebanese institutions, communities, and business environments, I saw many capable companies with valuable products and services being held back by weak digital visibility, fragmented systems, and limited access to modern business tools. I founded THE BUSINESS to help these companies build a professional digital presence, reach customers, modernize their operations, and grow.',
          'Ralph founded THE BUSINESS lb in 2026 and works directly on every project the company takes on.',
          '/ralph-chbib-source.png', 'Ralph Chbib', 'Read Ralph''s full story →', '/about/ralph-chbib/',
          'What we do', 'Five services. One outcome.',
          'Most businesses don''t need all five. Almost none need them in the same order. That''s what the assessment is for.',
          'Start with a clear picture.',
          'One conversation, a written plan, and no obligation to buy anything. If we''re not the right fit, we''ll tell you — and you''ll still have the roadmap.',
          'THE BUSINESS lb — Digital Growth for Lebanese Businesses',
          'We build Lebanese businesses for the digital world — websites, Shopify stores, social media, AI and consulting. Start with a free digital assessment.',
          now(), now()
        )
        returning id
      `;
      const homepageId = homepage.id as number;

      const symptoms = [
        "A website that looks fine and produces no enquiries",
        "Strong physical products with no way to buy them online",
        "Posting consistently on Instagram with nothing to show for it",
        "Enquiries arriving on WhatsApp and getting lost",
        "No idea which marketing spend is working",
        "Growth that depends entirely on the owner being available",
      ];
      for (let i = 0; i < symptoms.length; i++) {
        await sql`insert into cms.homepage_problem_symptoms (id, _order, _parent_id, text) values (gen_random_uuid()::text, ${i + 1}, ${homepageId}, ${symptoms[i]})`;
      }

      const stages = [
        { stage: "Assess", where: "You know something needs to change, not what", what: "Digital assessment and a 90-day roadmap" },
        { stage: "Build the foundation", where: "No real online presence", what: "Branding, professional email, Google profile, website" },
        { stage: "Enable commerce", where: "Products, but no way to sell online", what: "Shopify store, payments, delivery, training" },
        { stage: "Attract customers", where: "A presence, but no traffic", what: "Social strategy, content, advertising" },
        { stage: "Grow", where: "Working, but not fast enough", what: "Consulting, research, growth strategy" },
        { stage: "Automate", where: "Growth outrunning your team", what: "AI tools, CRM, automation" },
        { stage: "Scale", where: "Ready for the next level", what: "Monthly partnership, reporting, expansion" },
      ];
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        await sql`insert into cms.homepage_transformation_stages (id, _order, _parent_id, stage, "where", what) values (gen_random_uuid()::text, ${i + 1}, ${homepageId}, ${s.stage}, ${s.where}, ${s.what})`;
      }

      const steps = [
        { number: "01", name: "Assess", body: "We understand the business before recommending anything." },
        { number: "02", name: "Plan", body: "You get a written scope: deliverables, what's excluded, timeline, price." },
        { number: "03", name: "Build", body: "Work is delivered by vetted specialists, coordinated by us. You have one point of contact." },
        { number: "04", name: "Launch", body: "Nothing goes live untested. You're trained on how to run it." },
        { number: "05", name: "Grow", body: "Monthly reporting, improvements, and a strategy review each quarter." },
      ];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await sql`insert into cms.homepage_process_steps (id, _order, _parent_id, number, name, body) values (gen_random_uuid()::text, ${i + 1}, ${homepageId}, ${s.number}, ${s.name}, ${s.body})`;
      }

      const trustPoints = [
        { name: "Written agreements.", body: "Scope, revisions, ownership and timelines in writing before work starts." },
        { name: "Milestone payments.", body: "50% to begin, 30% at design approval, 20% before launch. You're never far ahead of the work." },
        { name: "You own everything.", body: "Accounts, files and access are yours, in your name, from day one." },
        { name: "One point of contact.", body: "You deal with us, not with five freelancers." },
      ];
      for (let i = 0; i < trustPoints.length; i++) {
        const t = trustPoints[i];
        await sql`insert into cms.homepage_process_trust_points (id, _order, _parent_id, name, body) values (gen_random_uuid()::text, ${i + 1}, ${homepageId}, ${t.name}, ${t.body})`;
      }

      const serviceCards = [
        {
          slug: "shopify-ecommerce",
          featured: true,
          overrideBody:
            "We build online stores that turn traditional businesses into digital ones — set up properly for how Lebanese customers actually pay and receive orders.",
          bullets: ["Store build and customisation", "Payments, delivery and cash-on-delivery", "Owner training and post-launch support"],
        },
        {
          slug: "social-media",
          featured: true,
          overrideBody:
            "We don't sell posting. We build a system that turns attention into enquiries, and enquiries into customers.",
          bullets: ["Strategy and content calendar", "Reels, posts and stories", "Monthly reporting on what worked"],
        },
        {
          slug: "websites",
          featured: false,
          overrideBody:
            "A professional website built around one commercial job — generating enquiries, taking bookings, or opening export markets.",
          bullets: [],
        },
        {
          slug: "ai-automation",
          featured: false,
          overrideBody:
            "Practical tools that answer customers faster, follow up automatically, and take repetitive work off your team.",
          bullets: [],
        },
        {
          slug: "consulting",
          featured: false,
          overrideBody: "Strategy, market research, business plans and go-to-market planning for companies making a real decision.",
          bullets: [],
        },
      ];
      for (let i = 0; i < serviceCards.length; i++) {
        const c = serviceCards[i];
        const serviceId = serviceIdBySlug.get(c.slug);
        if (serviceId === undefined) {
          // Unreachable — every slug was validated to exist before this loop runs.
          throw new Error(`Service with slug "${c.slug}" not found.`);
        }
        const [cardRow] = await sql`
          insert into cms.homepage_services_cards (id, _order, _parent_id, service_id, featured, override_body)
          values (gen_random_uuid()::text, ${i + 1}, ${homepageId}, ${serviceId}, ${c.featured}, ${c.overrideBody})
          returning id
        `;
        for (let j = 0; j < c.bullets.length; j++) {
          await sql`insert into cms.homepage_services_cards_override_bullets (id, _order, _parent_id, text) values (gen_random_uuid()::text, ${j + 1}, ${cardRow.id}, ${c.bullets[j]})`;
        }
      }

      console.log(`Seeded cms.homepage (id=${homepageId}) — ${symptoms.length} symptoms, ${stages.length} transformation stages, ${steps.length} process steps, ${trustPoints.length} trust points, ${serviceCards.length} featured service cards.`);
      console.log("Featured Testimonials and Featured Case Studies were left with no manual picks — both will automatically fall back to whichever documents are marked Featured in their own collections.");
    });
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
