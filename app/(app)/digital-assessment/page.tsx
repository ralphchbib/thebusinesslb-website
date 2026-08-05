import type { Metadata } from "next";
import { Check } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { AssessmentHero } from "@/components/blocks/assessment-hero";
import { Section } from "@/components/blocks/section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { FaqBlock } from "@/components/blocks/faq-block";
import { AssessmentForm } from "@/components/forms/assessment-form";
import { assessment } from "@/content/assessment";
import { getFaqsByScope } from "@/lib/cms/faqs";

export const metadata: Metadata = buildMetadata({
  title: assessment.metaTitle,
  description: assessment.metaDescription,
  path: "/digital-assessment/",
});

export default async function DigitalAssessmentPage() {
  const faqs = await getFaqsByScope("assessment");
  const jsonLd = [
    serviceSchema({
      name: "Digital Business Assessment",
      description: assessment.metaDescription,
      path: "/digital-assessment/",
    }),
    breadcrumbSchema([{ name: "Digital Business Assessment", path: "/digital-assessment/" }]),
    faqSchema(faqs),
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Breadcrumb items={[{ name: "Digital Business Assessment" }]} />
      <AssessmentHero />

      <Section surface="mist">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
              {assessment.why.h2}
            </h2>
            <p className="measure mt-5 text-[17px] leading-relaxed text-n700">{assessment.why.body}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex h-full items-center rounded-lg border border-n200 bg-white p-6 md:p-8">
              <p className="font-display text-xl italic leading-relaxed text-ink">
                &ldquo;{assessment.why.quote}&rdquo;
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section surface="white">
        <Reveal>
          <Eyebrow>Eleven areas</Eyebrow>
          <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            What the assessment actually covers
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessment.areas.map((area) => (
            <Reveal key={area.area}>
              <div className="h-full rounded-lg border border-n200 bg-mist p-5">
                <p className="text-[15px] font-semibold text-ink">{area.area}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{area.question}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="mist">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          How it works
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessment.steps.map((step) => (
            <Reveal key={step.n}>
              <div className="h-full rounded-lg border border-n200 bg-white p-5">
                <p className="font-mono text-xs font-medium text-petrol">{step.n}</p>
                <p className="mt-2 text-[15px] font-semibold text-ink">{step.what}</p>
                <p className="mt-2 text-sm text-n500">{step.time}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="ink">
        <Reveal>
          <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-white md:text-[34px]">
            {assessment.free.h2}
          </h2>
          <p className="measure mt-5 text-[17px] leading-relaxed text-white/75">{assessment.free.body}</p>
          <p className="mt-5 text-lg font-semibold text-white">{assessment.free.bold}</p>
          <p className="measure mt-3 text-[15px] leading-relaxed text-white/75">{assessment.free.exchange}</p>
          <ul className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-8">
            {["Honest feedback on the process", "A testimonial if genuinely useful", "Permission to write about the results"].map(
              (item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-white/85">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-white/70" />
                  {item}
                </li>
              ),
            )}
          </ul>
          <p className="mt-6 text-[15px] leading-relaxed text-white/70">{assessment.free.close}</p>
        </Reveal>
      </Section>

      <Section surface="white" id="apply">
        <div className="mx-auto max-w-[560px]">
          <Reveal>
            <h2 className="font-display text-center text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
              {assessment.form.h2}
            </h2>
            <p className="mt-3 text-center text-[15px] leading-relaxed text-n600">{assessment.form.intro}</p>
          </Reveal>
          <Reveal delay={0.06} className="mt-8 rounded-lg border border-n200 bg-mist p-6 md:p-8">
            <AssessmentForm />
          </Reveal>
        </div>
      </Section>

      <FaqBlock faqs={faqs} eyebrow="Questions" h2="Before you apply" surface="mist" />
    </>
  );
}
