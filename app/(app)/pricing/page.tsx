import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { getAllServices } from "@/lib/cms/services";
import { getFaqsByScope } from "@/lib/cms/faqs";
import { getSiteSettings } from "@/lib/cms/site-settings";
import { FaqBlock } from "@/components/blocks/faq-block";

export const metadata: Metadata = buildMetadata({
  title: "Pricing & Packages | THE BUSINESS lb",
  description:
    "Indicative pricing for websites, Shopify stores, social media, AI and consulting for Lebanese businesses. Final price confirmed after we understand the scope.",
  path: "/pricing/",
});

export default async function PricingPage() {
  const [allServices, faqs, settings] = await Promise.all([
    getAllServices(),
    getFaqsByScope("pricing"),
    getSiteSettings(),
  ]);

  return (
    <>
      <Breadcrumb items={[{ name: "Pricing" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Real numbers, not &ldquo;contact us for a quote.&rdquo;
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Ranges below are starting frameworks. The final figure depends on scope, catalogue size, content
          requirements, integrations and timeline — and is fixed in writing before anything begins.
        </p>
      </Section>

      <Section surface="mist">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-n300 text-n500">
                <th className="py-3 pr-4 font-medium">Package</th>
                <th className="py-3 pr-4 font-medium">Covers</th>
                <th className="py-3 font-medium">Indicative range</th>
              </tr>
            </thead>
            <tbody>
              {settings.servicesPricingTable.map((row) => (
                <tr key={row.name} className="border-b border-n200">
                  <td className="py-4 pr-4 font-semibold text-ink">{row.name}</td>
                  <td className="py-4 pr-4 text-n600">{row.covers}</td>
                  <td className="py-4 font-mono text-[13px] text-ink">{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section surface="white">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          By service
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {allServices.map((svc) => (
            <Reveal key={svc.slug}>
              <div className="h-full rounded-lg border border-n200 bg-mist p-6">
                <p className="text-lg font-semibold text-ink">{svc.h1}</p>
                <p className="font-display mt-2 text-2xl font-medium text-petrol">{svc.priceAnchor}</p>
                <p className="mt-1 text-sm text-n500">{svc.timelineSummary}</p>
                <Link
                  href={`/services/${svc.slug}/`}
                  className="mt-4 inline-block text-sm font-semibold text-petrol"
                >
                  See packages &rarr;
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="ink" className="text-center">
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-white md:text-[34px]">
          Not sure which range applies to you?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/75">
          The assessment tells you exactly what to budget for, before you talk to anyone about a project.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/digital-assessment/">Get your assessment</Link>
          </Button>
          <WhatsAppLink pageName="Pricing" variant="secondary" size="lg">
            Message us on WhatsApp
          </WhatsAppLink>
        </div>
      </Section>

      <FaqBlock faqs={faqs} eyebrow="Questions" h2="About pricing" />
    </>
  );
}
