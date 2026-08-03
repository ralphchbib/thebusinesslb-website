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
import { FinalCta } from "@/components/blocks/final-cta";
import { FaqBlock } from "@/components/blocks/faq-block";
import { buildMetadata } from "@/lib/seo/metadata";
import { faq } from "@/content/home";

export const metadata: Metadata = buildMetadata({
  title: "THE BUSINESS lb — Digital Growth for Lebanese Businesses",
  description:
    "We build Lebanese businesses for the digital world — websites, Shopify stores, social media, AI and consulting. Start with a free digital assessment.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <Hero />
      <PositioningBar />
      <ProblemBlock />
      <ServiceGrid />
      <TransformationStrip />
      <AssessmentBlock />
      {/* Mobile-only: founder moves directly after the assessment block, §6.5 */}
      <FounderBlock className="lg:hidden" />
      <ProcessBlock />
      <FoundingClients />
      <SectorGrid />
      {/* Desktop-only: founder sits in its normal position 10 */}
      <FounderBlock className="hidden lg:block" />
      <InsightsRow />
      <FinalCta />
      <FaqBlock faqs={faq} h2="Common questions" surface="mist" />
    </>
  );
}
