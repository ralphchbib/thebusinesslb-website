import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { CaseStudyCard } from "@/components/blocks/case-study-card";
import { getCaseStudies } from "@/lib/cms/case-studies";

export const metadata: Metadata = buildMetadata({
  title: "Case Studies — Real Client Results | THE BUSINESS lb",
  description:
    "Real projects, real numbers. See how Lebanese businesses grew online with THE BUSINESS lb.",
  path: "/case-studies/",
});

export default async function CaseStudiesPage() {
  const caseStudies = await getCaseStudies();

  return (
    <>
      <Breadcrumb items={[{ name: "Case Studies" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-2xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Real projects, real numbers.
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          A closer look at how we&rsquo;ve helped Lebanese businesses grow online — the problem, what we
          did, and what changed.
        </p>
      </Section>

      <Section surface="mist">
        {caseStudies.length === 0 ? (
          <p className="text-n600">Case studies are on the way — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {caseStudies.map((cs) => (
              <Reveal key={cs.slug}>
                <CaseStudyCard caseStudy={cs} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
