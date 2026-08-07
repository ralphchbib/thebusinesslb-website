import { Section } from "@/components/blocks/section";
import type { PayloadRichContentBlockDoc } from "@/lib/cms/types";

/**
 * Phase 6A — "Rich Text Block." Renders the same paragraph/heading/list
 * structured-array shape already proven for Article bodies
 * (app/(app)/insights/[slug]/page.tsx) — see
 * PHASE6A-PAGE-BUILDER-PLAN.md §2 for why this isn't a real Payload
 * richText field.
 */
export function PageRichContentBlock({
  eyebrow,
  h2,
  content,
}: Omit<PayloadRichContentBlockDoc, "id" | "blockType" | "isVisible">) {
  return (
    <Section surface="white">
      <div className="mx-auto max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-3.5">
            <span className="tb-rule tb-rule--petrol" />
            {eyebrow}
          </p>
        )}
        {h2 && (
          <h2 className="font-display mb-6 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {h2}
          </h2>
        )}
        <div className="flex flex-col gap-5">
          {content.map((block, i) => {
            if (block.blockType === "heading") {
              return (
                <h3 key={i} className="font-display mt-4 text-2xl font-medium tracking-[-0.02em] text-ink">
                  {block.text}
                </h3>
              );
            }
            if (block.blockType === "list") {
              return (
                <ul key={i} className="flex flex-col gap-2.5 pl-1">
                  {(block.items ?? []).map((item) => (
                    <li key={item.text} className="flex gap-2.5 text-[17px] leading-relaxed text-n700">
                      <span className="mt-2.5 h-1 w-1 flex-none rounded-full bg-petrol" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="text-[17px] leading-relaxed text-n700">
                {block.text}
              </p>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
