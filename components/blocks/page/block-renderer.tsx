import { PageHeroBlock } from "./hero-block";
import { PageTextBlock } from "./text-block";
import { PageCtaBlock } from "./cta-block";
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
            default:
              return null;
          }
        })}
    </>
  );
}
