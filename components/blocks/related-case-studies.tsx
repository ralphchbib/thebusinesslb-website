import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { CaseStudyCard } from "./case-study-card";
import { getCaseStudiesByServiceSlug } from "@/lib/cms/case-studies";

/** Case studies whose servicesUsed includes this service — service pages only. */
export async function RelatedCaseStudies({ serviceSlug }: { serviceSlug: string }) {
  const caseStudies = await getCaseStudiesByServiceSlug(serviceSlug);
  if (caseStudies.length === 0) return null;

  return (
    <Section surface="white">
      <Reveal>
        <Eyebrow>Case studies</Eyebrow>
        <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          See it in practice.
        </h2>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {caseStudies.map((cs) => (
          <Reveal key={cs.slug}>
            <CaseStudyCard caseStudy={cs} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
