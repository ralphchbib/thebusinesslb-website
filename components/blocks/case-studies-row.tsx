import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { CaseStudyCard } from "./case-study-card";
import { getFeaturedCaseStudies, getCaseStudiesByIds } from "@/lib/cms/case-studies";

/**
 * Reusable case studies section for landing Pages (via
 * components/blocks/page/case-studies-block.tsx). Same "specific picks or
 * Featured default" pattern as TestimonialsRow — see that file for the
 * reasoning. Not used on service pages; those use RelatedCaseStudies
 * instead, which filters by servicesUsed rather than Featured.
 */
export async function CaseStudiesRow({
  ids,
  eyebrow = "Case studies",
  h2 = "Real results for real businesses.",
}: {
  ids?: (number | string)[];
  eyebrow?: string;
  h2?: string;
}) {
  const caseStudies = ids && ids.length > 0 ? await getCaseStudiesByIds(ids) : await getFeaturedCaseStudies();
  if (caseStudies.length === 0) return null;

  return (
    <Section surface="white">
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {h2}
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
