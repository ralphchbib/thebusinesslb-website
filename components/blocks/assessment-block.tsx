import Link from "next/link";
import { Check } from "lucide-react";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { assessmentBlock } from "@/content/home";

export function AssessmentBlock() {
  return (
    <Section surface="ink">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[6fr_4fr] lg:gap-16">
        <Reveal>
          <p className="eyebrow">
            <span className="tb-rule tb-rule--white" style={{ background: "var(--tb-brass)" }} />
            {assessmentBlock.eyebrow}
          </p>
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-white md:text-[34px]">
            {assessmentBlock.h2}
          </h2>
          <p className="measure mt-6 text-[17px] leading-relaxed text-white/75">{assessmentBlock.body}</p>
          <p className="font-display measure-lead mt-6 text-xl italic leading-relaxed text-white/90">
            &ldquo;{assessmentBlock.quote}&rdquo;
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-white/70">{assessmentBlock.offer}</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/digital-assessment/">Get your assessment</Link>
          </Button>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-6 md:p-8">
            {assessmentBlock.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-white/85">
                <Check className="mt-0.5 h-4 w-4 flex-none text-white/70" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
