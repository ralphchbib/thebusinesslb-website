import { Section } from "@/components/blocks/section";
import type { PayloadTextBlockDoc } from "@/lib/cms/types";

export function PageTextBlock({
  eyebrow,
  h2,
  body,
}: Omit<PayloadTextBlockDoc, "id" | "blockType" | "isVisible">) {
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
          <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {h2}
          </h2>
        )}
        <p className="measure mt-4 text-[17px] leading-relaxed text-n700">{body}</p>
      </div>
    </Section>
  );
}
