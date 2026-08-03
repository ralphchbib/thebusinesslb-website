import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, personSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { founderPage } from "@/content/about";

export const metadata: Metadata = buildMetadata({
  title: founderPage.metaTitle,
  description: founderPage.metaDescription,
  path: "/about/ralph-chbib/",
});

export default function FounderPage() {
  const jsonLd = [personSchema(), breadcrumbSchema([{ name: "About", path: "/about/" }, { name: "Ralph Chbib", path: "/about/ralph-chbib/" }])];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <Breadcrumb items={[{ name: "About", href: "/about/" }, { name: "Ralph Chbib" }]} />

      <Section surface="white">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[280px_1fr] md:gap-14">
          <Reveal>
            <div className="relative aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-lg bg-mist">
              <Image src="/ralph-chbib-source.png" alt="Ralph Chbib" fill sizes="280px" className="object-cover" priority />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow mb-3">
              <span className="tb-rule tb-rule--petrol" />
              {founderPage.eyebrow}
            </p>
            <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
              {founderPage.h1}
            </h1>
            <div className="measure mt-6 flex flex-col gap-4 text-[17px] leading-relaxed text-n700">
              {founderPage.narrative.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
            <p className="measure-lead mt-6 text-sm font-medium text-n600">{founderPage.workDirectly}</p>
          </Reveal>
        </div>
      </Section>

      <Section surface="veil">
        <Reveal>
          <p className="font-display measure-lead mx-auto text-center text-2xl italic leading-relaxed text-ink">
            &ldquo;{founderPage.quote}&rdquo;
          </p>
        </Reveal>
      </Section>

      <Section surface="white" className="text-center">
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          Want to talk directly?
        </h2>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/digital-assessment/">Get your assessment</Link>
          </Button>
          <WhatsAppLink pageName="Ralph Chbib" variant="secondary" size="lg">
            Message us on WhatsApp
          </WhatsAppLink>
        </div>
      </Section>
    </>
  );
}
