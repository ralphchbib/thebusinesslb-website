/**
 * One-time Phase 1 content migration: reads the existing hardcoded
 * content/*.ts modules and writes them into the already-created `cms`
 * schema tables via plain SQL.
 *
 * Why raw SQL instead of Payload's Local API: Payload 3.87.0's standalone
 * Node bootstrapping (`getPayload()` called outside the Next.js process)
 * hits a reproducible `@next/env` CJS/ESM interop crash under Node 24.18.0
 * on this machine — confirmed across four different invocation methods
 * (payload CLI, --use-swc, tsx CLI, `node --import tsx`). The actual app
 * runtime is unaffected (Next's own bundler loads payload.config.ts fine,
 * proven by working /admin and /api routes) — this is purely a local
 * scripting limitation, documented in CMS-IMPACT-REPORT.md. The `cms`
 * schema itself was created correctly by Payload's dev-mode schema push,
 * and its structure was read back via information_schema before writing
 * this script, so every column name/type below is verified, not guessed.
 *
 * Run with: npx tsx payload/scripts/seed.ts
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

import { services as allServices, serviceOrder, servicesHub } from "@/content/services";
import { articles as allArticles } from "@/content/insights";
import { faq as homeFaq } from "@/content/home";
import { assessment } from "@/content/assessment";
import { contact } from "@/content/contact";
import { megaMenuServices, megaMenuStartHere, footerColumns } from "@/content/site";
import { siteConfig } from "@/lib/config";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });

async function main() {
  console.log("Seeding cms schema from content/*.ts ...");

  // ---------- Services ----------
  const serviceIdBySlug: Record<string, number> = {};

  for (const slug of serviceOrder) {
    const svc = allServices[slug];
    const [row] = await sql`
      insert into cms.services
        (slug, is_published, "order", eyebrow, h1, price_anchor, timeline_summary, intro,
         local_problem_h2, local_problem_intro, local_problem_note,
         after_launch_h2, after_launch_body, meta_title, meta_description,
         updated_at, created_at)
      values
        (${svc.slug}, true, ${serviceOrder.indexOf(slug)}, ${svc.eyebrow ?? null}, ${svc.h1},
         ${svc.priceAnchor}, ${svc.timelineSummary}, ${svc.intro},
         ${svc.localProblem?.h2 ?? null}, ${svc.localProblem?.intro ?? null}, ${svc.localProblem?.note ?? null},
         ${svc.afterLaunch?.h2 ?? null}, ${svc.afterLaunch?.body ?? null},
         ${svc.metaTitle}, ${svc.metaDescription}, now(), now())
      returning id
    `;
    serviceIdBySlug[slug] = row.id;
  }
  console.log(`  services: ${Object.keys(serviceIdBySlug).length}`);

  for (const slug of serviceOrder) {
    const svc = allServices[slug];
    const serviceId = serviceIdBySlug[slug];

    if (svc.localProblem?.items?.length) {
      for (let i = 0; i < svc.localProblem.items.length; i++) {
        const item = svc.localProblem.items[i];
        await sql`
          insert into cms.services_local_problem_items (_order, _parent_id, id, title, body)
          values (${i + 1}, ${serviceId}, ${crypto.randomUUID()}, ${item.title}, ${item.body})
        `;
      }
    }

    for (let i = 0; i < svc.packages.length; i++) {
      const pkg = svc.packages[i];
      const pkgId = crypto.randomUUID();
      await sql`
        insert into cms.services_packages (_order, _parent_id, id, name, price_display, summary, is_recommended)
        values (${i + 1}, ${serviceId}, ${pkgId}, ${pkg.name}, ${pkg.priceDisplay}, ${pkg.summary}, ${pkg.isRecommended ?? false})
      `;
      for (let j = 0; j < pkg.inclusions.length; j++) {
        await sql`
          insert into cms.services_packages_inclusions (_order, _parent_id, id, text)
          values (${j + 1}, ${pkgId}, ${crypto.randomUUID()}, ${pkg.inclusions[j]})
        `;
      }
    }

    for (let i = 0; i < svc.inclusions.length; i++) {
      await sql`
        insert into cms.services_inclusions (_order, _parent_id, id, text)
        values (${i + 1}, ${serviceId}, ${crypto.randomUUID()}, ${svc.inclusions[i]})
      `;
    }
    for (let i = 0; i < svc.exclusions.length; i++) {
      await sql`
        insert into cms.services_exclusions (_order, _parent_id, id, text)
        values (${i + 1}, ${serviceId}, ${crypto.randomUUID()}, ${svc.exclusions[i]})
      `;
    }
    for (let i = 0; i < (svc.clientProvides ?? []).length; i++) {
      await sql`
        insert into cms.services_client_provides (_order, _parent_id, id, text)
        values (${i + 1}, ${serviceId}, ${crypto.randomUUID()}, ${svc.clientProvides![i]})
      `;
    }
    for (let i = 0; i < svc.timeline.length; i++) {
      const step = svc.timeline[i];
      await sql`
        insert into cms.services_timeline (_order, _parent_id, id, label, body)
        values (${i + 1}, ${serviceId}, ${crypto.randomUUID()}, ${step.label}, ${step.body})
      `;
    }
  }
  console.log("  service child rows: done");

  // Related services relationships (second pass — needs every service's id to exist first)
  for (const slug of serviceOrder) {
    const svc = allServices[slug];
    const serviceId = serviceIdBySlug[slug];
    for (let i = 0; i < svc.relatedServices.length; i++) {
      const relatedId = serviceIdBySlug[svc.relatedServices[i]];
      if (!relatedId) continue;
      await sql`
        insert into cms.services_rels ("order", parent_id, path, services_id)
        values (${i + 1}, ${serviceId}, 'relatedServices', ${relatedId})
      `;
    }
  }
  console.log("  service relationships: done");

  // ---------- Articles ----------
  const articleIdBySlug: Record<string, number> = {};
  for (const article of allArticles) {
    const [row] = await sql`
      insert into cms.articles
        (slug, is_published, title, excerpt, topic, published_at, reading_minutes,
         meta_title, meta_description, updated_at, created_at)
      values
        (${article.slug}, true, ${article.title}, ${article.excerpt}, ${article.topic},
         ${article.publishedAt}, ${article.readingMinutes}, ${article.metaTitle},
         ${article.metaDescription}, now(), now())
      returning id
    `;
    articleIdBySlug[article.slug] = row.id;

    const blockTypeMap: Record<string, string> = { p: "paragraph", h2: "heading", list: "list" };

    for (let i = 0; i < article.body.length; i++) {
      const block = article.body[i];
      const blockId = crypto.randomUUID();
      await sql`
        insert into cms.articles_body (_order, _parent_id, id, block_type, text)
        values (${i + 1}, ${row.id}, ${blockId}, ${blockTypeMap[block.type]}, ${block.text ?? null})
      `;
      if (block.type === "list" && block.items) {
        for (let j = 0; j < block.items.length; j++) {
          await sql`
            insert into cms.articles_body_items (_order, _parent_id, id, text)
            values (${j + 1}, ${blockId}, ${crypto.randomUUID()}, ${block.items[j]})
          `;
        }
      }
    }

    for (let i = 0; i < article.relatedServices.length; i++) {
      const relatedId = serviceIdBySlug[article.relatedServices[i]];
      if (!relatedId) continue;
      await sql`
        insert into cms.articles_rels ("order", parent_id, path, services_id)
        values (${i + 1}, ${row.id}, 'relatedServices', ${relatedId})
      `;
    }
  }
  console.log(`  articles: ${Object.keys(articleIdBySlug).length}`);

  // ---------- FAQs ----------
  let faqOrder = 0;
  const insertFaq = async (
    question: string,
    answer: string,
    scope: string,
    serviceId?: number,
  ) => {
    faqOrder += 1;
    await sql`
      insert into cms.faqs (question, answer, scope, service_id, "order", is_published, updated_at, created_at)
      values (${question}, ${answer}, ${scope}, ${serviceId ?? null}, ${faqOrder}, true, now(), now())
    `;
  };

  for (const f of homeFaq) await insertFaq(f.question, f.answer, "global");
  for (const f of servicesHub.faqs) await insertFaq(f.question, f.answer, "pricing");
  for (const f of assessment.faqs) await insertFaq(f.question, f.answer, "assessment");
  for (const f of contact.faqs) await insertFaq(f.question, f.answer, "contact");
  for (const slug of serviceOrder) {
    const svc = allServices[slug];
    for (const f of svc.faqs) await insertFaq(f.question, f.answer, "service", serviceIdBySlug[slug]);
  }
  console.log(`  faqs: ${faqOrder}`);

  // ---------- Navigation ----------
  let navOrder = 0;
  const insertNav = async (menu: string, label: string, href: string) => {
    navOrder += 1;
    await sql`
      insert into cms.navigation_items (menu, label, href, "order", is_external, updated_at, created_at)
      values (${menu}, ${label}, ${href}, ${navOrder}, false, now(), now())
    `;
  };

  // header_primary intentionally excludes "Services" — it triggers the mega
  // menu rather than being a direct link, and stays as structural chrome in
  // components/layout/header.tsx (see CMS-IMPACT-REPORT.md).
  await insertNav("header_primary", "Insights", "/insights/");
  await insertNav("header_primary", "About", "/about/");
  await insertNav("header_primary", "Contact", "/contact/");
  for (const item of megaMenuServices) await insertNav("header_mega_col1", item.label, item.href);
  for (const item of megaMenuStartHere) await insertNav("header_mega_col2", item.label, item.href);
  for (const item of footerColumns.services) await insertNav("footer_services", item.label, item.href);
  for (const item of footerColumns.company) await insertNav("footer_company", item.label, item.href);
  for (const item of footerColumns.startHere) await insertNav("footer_start_here", item.label, item.href);
  console.log(`  navigation items: ${navOrder}`);

  // ---------- Site Settings (global, single row) ----------
  const [settingsRow] = await sql`
    insert into cms.site_settings
      (site_name, slogan, service_statement, contact_email, whatsapp_number,
       instagram_handle, instagram_url,
       footer_slogan, footer_services_line, footer_copyright,
       newsletter_heading, newsletter_sub, newsletter_consent,
       services_hub_h1, services_hub_intro, services_hub_connect_h2, services_hub_connect_body,
       updated_at, created_at)
    values
      (${siteConfig.name}, ${siteConfig.slogan}, ${siteConfig.serviceStatement}, ${siteConfig.email},
       ${siteConfig.whatsappNumber}, ${siteConfig.instagramHandle}, ${siteConfig.instagramUrl},
       'Where Business Happens.', 'Websites. E-commerce. Social Media. AI. Consulting.',
       '© 2026 THE BUSINESS lb',
       'One useful email, twice a month.',
       'Practical digital growth for Lebanese businesses. No pitches, no filler.',
       'Unsubscribe whenever you like.',
       ${servicesHub.h1}, ${servicesHub.intro}, ${servicesHub.connect.h2}, ${servicesHub.connect.body},
       now(), now())
    returning id
  `;
  for (let i = 0; i < servicesHub.pricing.length; i++) {
    const row = servicesHub.pricing[i];
    await sql`
      insert into cms.site_settings_services_pricing_table (_order, _parent_id, id, name, covers, range)
      values (${i + 1}, ${settingsRow.id}, ${crypto.randomUUID()}, ${row.name}, ${row.covers}, ${row.range})
    `;
  }
  console.log("  site settings: done");

  console.log("Seed complete.");
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
