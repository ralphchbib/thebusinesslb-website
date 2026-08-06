import { CaseStudiesRow } from "@/components/blocks/case-studies-row";
import type { PayloadCaseStudiesBlockDoc } from "@/lib/cms/types";

export async function PageCaseStudiesBlock({
  eyebrow,
  h2,
  caseStudies,
}: Omit<PayloadCaseStudiesBlockDoc, "id" | "blockType" | "isVisible">) {
  const ids = (caseStudies ?? []).map((c) => (typeof c === "object" ? c.id : c));
  return <CaseStudiesRow ids={ids} eyebrow={eyebrow ?? undefined} h2={h2 ?? undefined} />;
}
