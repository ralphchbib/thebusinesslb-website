import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCaseStudyBySlug, getPublishedCaseStudySlugs } from "@/lib/cms/case-studies";
import { getSiteSettings } from "@/lib/cms/site-settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, caseStudySchema } from "@/lib/seo/schema-org";
import { isPreviewMode, PREVIEW_ROBOTS } from "@/lib/seo/preview";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { TestimonialCard } from "@/components/blocks/testimonial-card";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  const slugs = await getPublishedCaseStudySlugs();
  return slugs.map((slug) => ({ slug }));
}

// Same reasoning as app/(app)/services/[slug]/page.tsx and
// app/(app)/[slug]/page.tsx — a new case study goes live on first
// request, no rebuild required.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preview = await isPreviewMode();
  const [caseStudy, settings] = await Promise.all([getCaseStudyBySlug(slug, preview), getSiteSettings()]);
  if (!caseStudy) return {};
  const metadata = buildMetadata({
    title: caseStudy.seoTitle,
    description: caseStudy.seoDescription,
    path: `/case-studies/${caseStudy.slug}/`,
    ogImage: caseStudy.featuredImage?.url ?? settings.defaultOgImage,
  });
  if (preview) {
    metadata.robots = PREVIEW_ROBOTS;
  }
  return metadata;
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = await isPreviewMode();
  const caseStudy = await getCaseStudyBySlug(slug, preview);
  if (!caseStudy) notFound();

  const jsonLd = [
    caseStudySchema({
      title: caseStudy.title,
      description: caseStudy.seoDescription,
      path: `/case-studies/${caseStudy.slug}/`,
      clientName: caseStudy.clientName,
    }),
    breadcrumbSchema([
      { name: "Case Studies", path: "/case-studies/" },
      { name: caseStudy.title, path: `/case-studies/${caseStudy.slug}/` },
    ]),
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

      <Breadcrumb items={[{ name: "Case Studies", href: "/case-studies/" }, { name: caseStudy.title }]} />

      <Section surface="white">
        {caseStudy.industry && <p className="eyebrow mb-3">{caseStudy.industry.replace("_", " ")}</p>}
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {caseStudy.title}
        </h1>
        <p className="mt-4 text-lg text-n600">{caseStudy.clientName}</p>
        {caseStudy.featuredImage && (
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-lg">
            <Image
              src={caseStudy.featuredImage.url}
              alt={caseStudy.featuredImage.alt || caseStudy.title}
              fill
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        )}
      </Section>

      {caseStudy.results.length > 0 && (
        <Section surface="ink">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {caseStudy.results.map((r) => (
              <div key={r.metric} className="text-center">
                <p className="font-display text-4xl font-medium text-white">{r.value}</p>
                <p className="mt-2 text-sm text-white/70">{r.metric}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section surface="white">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-[22px] font-medium tracking-[-0.02em] text-ink">The challenge</h2>
            <p className="measure mt-4 text-[17px] leading-relaxed text-n700">{caseStudy.challenge}</p>
          </div>
          <div>
            <h2 className="font-display text-[22px] font-medium tracking-[-0.02em] text-ink">What we did</h2>
            <p className="measure mt-4 text-[17px] leading-relaxed text-n700">{caseStudy.solution}</p>
          </div>
        </div>
      </Section>

      {caseStudy.gallery.length > 0 && (
        <Section surface="mist">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {caseStudy.gallery.map((image, i) => (
              <div key={i} className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <Image
                  src={image.url}
                  alt={image.alt || `${caseStudy.title} — image ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 500px, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {caseStudy.testimonial && (
        <Section surface="white">
          <div className="mx-auto max-w-xl">
            <TestimonialCard testimonial={caseStudy.testimonial} />
          </div>
        </Section>
      )}

      {caseStudy.servicesUsed.length > 0 && (
        <Section surface="mist">
          <p className="eyebrow mb-4">Services used</p>
          <div className="flex flex-wrap gap-3">
            {caseStudy.servicesUsed.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}/`}
                className="rounded-full border border-n300 bg-white px-4 py-2 text-sm font-medium text-ink hover:border-petrol"
              >
                {s.h1}
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section surface="ink" className="text-center">
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-white md:text-[34px]">
          Want results like this?
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/digital-assessment/">Get your assessment</Link>
        </Button>
      </Section>
    </>
  );
}
