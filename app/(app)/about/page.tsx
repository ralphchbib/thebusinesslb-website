import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Button } from "@/components/ui/button";
import { about } from "@/content/about";

export const metadata: Metadata = buildMetadata({
  title: about.metaTitle,
  description: about.metaDescription,
  path: "/about/",
});

export default function AboutPage() {
  return (
    <>
      <Breadcrumb items={[{ name: "About" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {about.h1}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{about.intro}</p>
      </Section>

      <Section surface="mist">
        <Reveal>
          <h2 className="font-display max-w-2xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {about.why.h2}
          </h2>
          <p className="font-display mt-2 text-xl italic text-petrol">{about.why.subhead}</p>
          <p className="measure mt-5 text-[17px] leading-relaxed text-n700">{about.why.body}</p>
        </Reveal>
      </Section>

      <Section surface="white">
        <Reveal>
          <Eyebrow>What we believe</Eyebrow>
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {about.beliefs.h2}
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {about.beliefs.items.map((item) => (
            <Reveal key={item.n}>
              <div className="h-full rounded-lg border border-n200 bg-mist p-6">
                <p className="font-mono text-xs font-medium text-petrol">{item.n}</p>
                <p className="mt-2 text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="mist">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          Divisions
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {about.divisions.map((d) => (
            <div key={d.name} className="rounded-lg border border-n200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">{d.name}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-n600">{d.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section surface="ink">
        <Reveal>
          <p className="font-display measure-lead text-xl italic leading-relaxed text-white/90">
            &ldquo;{about.founderQuote}&rdquo;
          </p>
          <p className="mt-4 text-sm text-white/60">{about.founderQuoteAttribution}</p>
          <Link href="/about/ralph-chbib/" className="mt-6 inline-block text-sm font-semibold text-white underline">
            Read Ralph&rsquo;s full story
          </Link>
        </Reveal>
      </Section>

      <Section surface="white">
        <Reveal>
          <h2 className="font-display max-w-2xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {about.roadmap.h2}
          </h2>
          <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{about.roadmap.intro}</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {about.roadmap.stages.map((stage) => (
            <Reveal key={stage.name}>
              <div className="h-full rounded-lg border border-n200 bg-mist p-6">
                <p className="text-[15px] font-semibold text-ink">{stage.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{stage.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="measure mt-8 text-[15px] leading-relaxed text-n600">{about.roadmap.close}</p>
      </Section>

      <Section surface="mist" className="text-center">
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          Meet Ralph
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/about/ralph-chbib/">Read Ralph&rsquo;s story</Link>
        </Button>
      </Section>
    </>
  );
}
