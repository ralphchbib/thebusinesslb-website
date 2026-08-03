import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { finalCta } from "@/content/home";

export function FinalCta() {
  return (
    <Section surface="white">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {finalCta.h2}
          </h2>
          <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{finalCta.body}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rounded-lg border border-n200 bg-mist p-6 md:p-8">
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
