import { PageHeroBlock } from "./hero-block";
import { PageTextBlock } from "./text-block";
import { PageCtaBlock } from "./cta-block";
import { PageRichContentBlock } from "./rich-content-block";
import { PageFaqBlock } from "./faq-block";
import { PageServicesGridBlock } from "./services-grid-block";
import { PageTestimonialsBlock } from "./testimonials-block";
import { PageCaseStudiesBlock } from "./case-studies-block";
import { PageStatisticsBlock } from "./statistics-block";
import { PageLogoCloudBlock } from "./logo-cloud-block";
import { PageFeatureGridBlock } from "./feature-grid-block";
import { PagePricingBlock } from "./pricing-block";
import { PageProcessBlock } from "./process-block";
import { PageComparisonTableBlock } from "./comparison-table-block";
import type { PayloadPageBlockDoc } from "@/lib/cms/types";

/**
 * Switches on blockType, same pattern already shipped for Article body
 * blocks (app/(app)/insights/[slug]/page.tsx) — scaled up to real Payload
 * `blocks` field docs instead of the array+select-discriminator hack used
 * there. See PHASE2-ARCHITECTURE.md §4.3.
 */
export function BlockRenderer({ blocks }: { blocks: PayloadPageBlockDoc[] }) {
  return (
    <>
      {blocks
        .filter((block) => block.isVisible !== false)
        .map((block, i) => {
          switch (block.blockType) {
            case "hero":
              return <PageHeroBlock key={block.id ?? i} {...block} />;
            case "text":
              return <PageTextBlock key={block.id ?? i} {...block} />;
            case "cta":
              return <PageCtaBlock key={block.id ?? i} {...block} />;
            case "richContent":
              return <PageRichContentBlock key={block.id ?? i} {...block} />;
            case "faqBlock":
              return <PageFaqBlock key={block.id ?? i} {...block} />;
            case "servicesGridBlock":
              return <PageServicesGridBlock key={block.id ?? i} {...block} />;
            case "testimonialsBlock":
              return <PageTestimonialsBlock key={block.id ?? i} {...block} />;
            case "caseStudiesBlock":
              return <PageCaseStudiesBlock key={block.id ?? i} {...block} />;
            case "statistics":
              return <PageStatisticsBlock key={block.id ?? i} {...block} />;
            case "logoCloud":
              return <PageLogoCloudBlock key={block.id ?? i} {...block} />;
            case "featureGrid":
              return <PageFeatureGridBlock key={block.id ?? i} {...block} />;
            case "pricing":
              return <PagePricingBlock key={block.id ?? i} {...block} />;
            case "process":
              return <PageProcessBlock key={block.id ?? i} {...block} />;
            case "comparisonTable":
              return <PageComparisonTableBlock key={block.id ?? i} {...block} />;
            default:
              return null;
          }
        })}
    </>
  );
}
