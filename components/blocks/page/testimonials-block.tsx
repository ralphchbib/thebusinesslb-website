import { TestimonialsRow } from "@/components/blocks/testimonials-row";
import type { PayloadTestimonialsBlockDoc } from "@/lib/cms/types";

export async function PageTestimonialsBlock({
  eyebrow,
  h2,
  testimonials,
}: Omit<PayloadTestimonialsBlockDoc, "id" | "blockType" | "isVisible">) {
  const ids = (testimonials ?? []).map((t) => (typeof t === "object" ? t.id : t));
  return <TestimonialsRow ids={ids} eyebrow={eyebrow ?? undefined} h2={h2 ?? undefined} />;
}
