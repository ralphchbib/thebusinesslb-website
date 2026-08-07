import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllServices } from "@/lib/cms/services";
import { getFaqsByScope } from "@/lib/cms/faqs";
import { getSiteSettings } from "@/lib/cms/site-settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { faqSchema, breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaqBlock } from "@/components/blocks/faq-block";
import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Button } from "@/components/ui/button";

// Not CMS-managed in Phase 1 — Site Settings covers the hub's body copy,
// but not a general per-page SEO field set (only Services/Articles have
// their own metaTitle/metaDescription). See CMS-IMPACT-REPORT.md.
export const metadata: Metadata = buildMetadata({
  title: "Digital Services for Lebanese Businesses | THE BUSINESS lb",
  description:
    "Websites, Shopify stores, social media, AI automation and business consulting for Lebanese SMEs. One partner across the whole digital growth journey.",
  path: "/services/",
});

export default async function ServicesHubPage() {
  const [allServices, hubFaqs, settings] = await Promise.all([
    getAllServices(),
    getFaqsByScope("pricing"),
    getSiteSettings(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Services", path: "/services/" }])) }}
      />
      {hubFaqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(hubFaqs)) }}
        />
      )}

      <Breadcrumb items={[{ name: "Services" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {settings.servicesHubH1}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{settings.servicesHubIntro}</p>
      </Section>

      <Section surface="mist">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {allServices.map((svc) => (
            <Reveal key={svc.slug}>
              <Card className="h-full bg-white">
                <Link href={`/services/${svc.slug}/`} className="flex h-full flex-col">
                  {svc.eyebrow && <Badge className="mb-3 w-fit">{svc.eyebrow}</Badge>}
                  <h3 className="text-lg font-semibold text-ink">{svc.h1}</h3>
                  <p className="mt-2 text-sm font-medium text-petrol">{svc.priceAnchor}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">{svc.intro}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                    See what&rsquo;s included <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="white">
        <Reveal>
          <Eyebrow>Most clients follow the same path</Eyebrow>
          <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {settings.servicesHubConnectH2}
          </h2>
          <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{settings.servicesHubConnectBody}</p>
        </Reveal>
      </Section>

      <Section surface="mist">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          Indicative pricing
        </p>
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
        <p className="mt-4 max-w-2xl text-sm text-n500">
          Ranges are starting frameworks. The final figure depends on scope, catalogue size, content
          requirements, integrations and timeline — and is fixed in writing before anything begins.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/pricing/">See full pricing</Link>
        </Button>
      </Section>

      <FaqBlock faqs={hubFaqs} />
    </>
  );
}
