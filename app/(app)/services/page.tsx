import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { servicesHub, serviceOrder, services } from "@/content/services";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaqBlock } from "@/components/blocks/faq-block";
import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = buildMetadata({
  title: servicesHub.metaTitle,
  description: servicesHub.metaDescription,
  path: "/services/",
});

export default function ServicesHubPage() {
  return (
    <>
      <Breadcrumb items={[{ name: "Services" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {servicesHub.h1}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{servicesHub.intro}</p>
      </Section>

      <Section surface="mist">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {serviceOrder.map((slug) => {
            const svc = services[slug];
            return (
              <Reveal key={slug}>
                <Card className="h-full bg-white">
                  <Link href={`/services/${slug}/`} className="flex h-full flex-col">
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
            );
          })}
        </div>
      </Section>

      <Section surface="white">
        <Reveal>
          <Eyebrow>Most clients follow the same path</Eyebrow>
          <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {servicesHub.connect.h2}
          </h2>
          <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{servicesHub.connect.body}</p>
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
              {servicesHub.pricing.map((row) => (
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

      <FaqBlock faqs={servicesHub.faqs} />
    </>
  );
}
