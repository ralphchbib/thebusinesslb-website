import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { howWeWork } from "@/content/about";
import { process } from "@/content/home";

export const metadata: Metadata = buildMetadata({
  title: howWeWork.metaTitle,
  description: howWeWork.metaDescription,
  path: "/about/how-we-work/",
});

export default function HowWeWorkPage() {
  return (
    <>
      <Breadcrumb items={[{ name: "About", href: "/about/" }, { name: "How we work" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {howWeWork.h1}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{howWeWork.intro}</p>
      </Section>

      <Section surface="mist">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          The five stages
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {process.steps.map((step) => (
            <Reveal key={step.n}>
              <div className="h-full rounded-lg border border-n200 bg-white p-5">
                <p className="font-mono text-xs font-medium text-petrol">{step.n}</p>
                <p className="mt-2 text-[15px] font-semibold text-ink">{step.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="white">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          What that means for you
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {process.trust.map((item) => (
            <Reveal key={item.name}>
              <div className="h-full rounded-lg border border-n200 bg-mist p-6">
                <p className="text-[15px] font-semibold text-ink">{item.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="ink" className="text-center">
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-white md:text-[34px]">
          Ready to start with an assessment?
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/digital-assessment/">Get your assessment</Link>
        </Button>
      </Section>
    </>
  );
}
