import type { Metadata } from "next";
import { Hero } from "@/components/blocks/hero";
import { PositioningBar } from "@/components/blocks/positioning-bar";
import { ProblemBlock } from "@/components/blocks/problem-block";
import { ServiceGrid } from "@/components/blocks/service-grid";
import { TransformationStrip } from "@/components/blocks/transformation-strip";
import { AssessmentBlock } from "@/components/blocks/assessment-block";
import { ProcessBlock } from "@/components/blocks/process-block";
import { FoundingClients } from "@/components/blocks/founding-clients";
import { SectorGrid } from "@/components/blocks/sector-grid";
import { FounderBlock } from "@/components/blocks/founder-block";
import { InsightsRow } from "@/components/blocks/insights-row";
import { TestimonialsRow } from "@/components/blocks/testimonials-row";
import { CaseStudiesRow } from "@/components/blocks/case-studies-row";
import { FinalCta } from "@/components/blocks/final-cta";
import { FaqBlock } from "@/components/blocks/faq-block";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFaqsByScope } from "@/lib/cms/faqs";
import { getHomepage } from "@/lib/cms/homepage";
import { getSiteSettings } from "@/lib/cms/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const [home, settings] = await Promise.all([getHomepage(), getSiteSettings()]);
  return buildMetadata({
    title: home.seo.metaTitle,
    description: home.seo.metaDescription,
    path: "/",
    ogImage: home.seo.ogImage ?? settings.defaultOgImage,
  });
}

export default async function Home() {
  const [home, faq] = await Promise.all([getHomepage(), getFaqsByScope("global")]);

  return (
    <>
      <Hero
        eyebrow={home.hero.eyebrow}
        headline={home.hero.headline}
        highlightedText={home.hero.highlightedText}
        subheadline={home.hero.subheadline}
        ctaPrimaryLabel={home.hero.ctaPrimaryLabel}
        ctaPrimaryHref={home.hero.ctaPrimaryHref}
        ctaSecondaryLabel={home.hero.ctaSecondaryLabel}
        ctaSecondaryHref={home.hero.ctaSecondaryHref}
        reassurance={home.hero.reassurance}
        image={home.hero.image}
        imageAlt={home.hero.imageAlt}
      />
      <PositioningBar />
      <ProblemBlock
        eyebrow={home.problem.eyebrow}
        title={home.problem.title}
        body1={home.problem.body1}
        body2={home.problem.body2}
        quote={home.problem.quote}
        symptoms={home.problem.symptoms}
      />
      <ServiceGrid
        eyebrow={home.services.eyebrow}
        title={home.services.title}
        intro={home.services.intro}
        cards={home.services.cards}
      />
      <TransformationStrip
        eyebrow={home.transformation.eyebrow}
        title={home.transformation.title}
        intro={home.transformation.intro}
        stages={home.transformation.stages}
        closingLine={home.transformation.closingLine}
      />
      <AssessmentBlock />
      {/* Mobile-only: founder moves directly after the assessment block, §6.5 */}
      <FounderBlock
        className="lg:hidden"
        eyebrow={home.founder.eyebrow}
        title={home.founder.title}
        quote={home.founder.quote}
        body={home.founder.body}
        image={home.founder.image}
        imageAlt={home.founder.imageAlt}
        ctaLabel={home.founder.ctaLabel}
        ctaHref={home.founder.ctaHref}
      />
      <ProcessBlock
        eyebrow={home.process.eyebrow}
        title={home.process.title}
        steps={home.process.steps}
        trustPoints={home.process.trustPoints}
      />
      <FoundingClients />
      <SectorGrid />
      {/* Desktop-only: founder sits in its normal position 10 */}
      <FounderBlock
        className="hidden lg:block"
        eyebrow={home.founder.eyebrow}
        title={home.founder.title}
        quote={home.founder.quote}
        body={home.founder.body}
        image={home.founder.image}
        imageAlt={home.founder.imageAlt}
        ctaLabel={home.founder.ctaLabel}
        ctaHref={home.founder.ctaHref}
      />
      <InsightsRow />
      <TestimonialsRow
        ids={home.testimonials.ids}
        eyebrow={home.testimonials.eyebrow}
        h2={home.testimonials.title}
      />
      <CaseStudiesRow ids={home.caseStudies.ids} eyebrow={home.caseStudies.eyebrow} h2={home.caseStudies.title} />
      <FinalCta headline={home.finalCta.headline} subheadline={home.finalCta.subheadline} />
      <FaqBlock faqs={faq} h2="Common questions" surface="mist" />
    </>
  );
}
