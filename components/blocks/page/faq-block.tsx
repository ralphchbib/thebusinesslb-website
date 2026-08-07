import { FaqBlock } from "@/components/blocks/faq-block";
import { getFaqsByIds } from "@/lib/cms/faqs";
import type { PayloadFaqPageBlockDoc } from "@/lib/cms/types";

/**
 * Phase 6A — thin wrapper resolving the block's relationship IDs into
 * {question, answer} pairs, then delegating to the already-existing,
 * already-styled FaqBlock component (components/blocks/faq-block.tsx) —
 * the same one Homepage and Service pages already use. Zero changes
 * needed there.
 */
export async function PageFaqBlock({
  eyebrow,
  h2,
  faqs,
  surface,
}: Omit<PayloadFaqPageBlockDoc, "id" | "blockType" | "isVisible">) {
  const ids = (faqs ?? []).map((f) => (typeof f === "object" ? f.id : f));
  const resolved = await getFaqsByIds(ids);
  return (
    <FaqBlock
      faqs={resolved}
      eyebrow={eyebrow ?? undefined}
      h2={h2 ?? undefined}
      surface={surface ?? "white"}
    />
  );
}
