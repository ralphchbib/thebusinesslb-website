import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceBySlug, getPublishedServiceSlugs } from "@/lib/cms/services";
import { getSiteSettings } from "@/lib/cms/site-settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo/schema-org";
import { isPreviewMode, PREVIEW_ROBOTS } from "@/lib/seo/preview";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { ServiceHero } from "@/components/blocks/service-hero";
import { LocalProblem } from "@/components/blocks/local-problem";
import { PackagesGrid } from "@/components/blocks/packages-grid";
import { IncludedExcluded } from "@/components/blocks/included-excluded";
import { TimelineStrip } from "@/components/blocks/timeline-strip";
import { FaqBlock } from "@/components/blocks/faq-block";
import { RelatedServices } from "@/components/blocks/related-services";
import { RelatedCaseStudies } from "@/components/blocks/related-case-studies";
import { TestimonialsRow } from "@/components/blocks/testimonials-row";
import { Section } from "@/components/blocks/section";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  const slugs = await getPublishedServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Phase 5B — same reasoning as app/(app)/[slug]/page.tsx and
// app/(app)/case-studies/[slug]/page.tsx: a newly published service goes
// live on first request, no rebuild required. Previously relied on
// Next's implicit default; set explicitly for consistency.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preview = await isPreviewMode();
  const [service, settings] = await Promise.all([getServiceBySlug(slug, preview), getSiteSettings()]);
  if (!service) return {};
  const metadata = buildMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/services/${service.slug}/`,
    ogImage: service.ogImage ?? settings.defaultOgImage,
  });
  if (preview) {
    metadata.robots = PREVIEW_ROBOTS;
  }
  return metadata;
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = await isPreviewMode();
  const service = await getServiceBySlug(slug, preview);
  if (!service) notFound();

  const jsonLd = [
    serviceSchema({ name: service.h1, description: service.intro, path: `/services/${service.slug}/` }),
    breadcrumbSchema([
      { name: "Services", path: "/services/" },
      { name: service.h1, path: `/services/${service.slug}/` },
    ]),
    faqSchema(service.faqs),
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Breadcrumb items={[{ name: "Services", href: "/services/" }, { name: service.h1 }]} />
      <ServiceHero service={service} />
      {service.localProblem && <LocalProblem data={service.localProblem} />}
      <PackagesGrid packages={service.packages} serviceName={service.h1} />
      <IncludedExcluded inclusions={service.inclusions} exclusions={service.exclusions} />
      <TimelineStrip steps={service.timeline} />
      {service.afterLaunch && (
        <Section surface="veil">
          <h2 className="font-display max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {service.afterLaunch.h2}
          </h2>
          <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{service.afterLaunch.body}</p>
        </Section>
      )}
      <FaqBlock
        faqs={service.faqs}
        eyebrow="Questions"
        h2="Frequently asked"
        surface={service.afterLaunch ? "white" : "mist"}
      />
      <RelatedServices slugs={service.relatedServices} />
      <RelatedCaseStudies serviceSlug={service.slug} />
      <TestimonialsRow surface="white" />

      <Section surface="ink" className="text-center">
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-white md:text-[34px]">
          Ready to talk about {service.h1.toLowerCase()}?
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/digital-assessment/">Get your assessment</Link>
        </Button>
      </Section>
    </>
  );
}
