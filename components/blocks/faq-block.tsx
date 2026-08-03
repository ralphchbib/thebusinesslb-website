import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { Accordion } from "@/components/ui/accordion";

export function FaqBlock({
  eyebrow = "Questions",
  h2 = "Frequently asked",
  faqs,
  surface = "white",
}: {
  eyebrow?: string;
  h2?: string;
  faqs: { question: string; answer: string }[];
  surface?: "white" | "mist";
}) {
  if (faqs.length === 0) return null;
  return (
    <Section surface={surface}>
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {h2}
          </h2>
        </Reveal>
        <Reveal delay={0.06} className="mt-8">
          <Accordion items={faqs} />
        </Reveal>
      </div>
    </Section>
  );
}
