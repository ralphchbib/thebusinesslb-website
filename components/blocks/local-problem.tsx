import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";
import type { ServiceContent } from "@/content/services/types";

export function LocalProblem({ data }: { data: NonNullable<ServiceContent["localProblem"]> }) {
  return (
    <Section surface="mist">
      <Reveal>
        <h2 className="font-display max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {data.h2}
        </h2>
        {data.intro && <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{data.intro}</p>}
      </Reveal>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {data.items.map((item) => (
          <Reveal key={item.title}>
            <div className="h-full rounded-lg border border-n200 bg-white p-6">
              <p className="text-[15px] font-semibold text-ink">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-n600">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      {data.note && (
        <Reveal>
          <p className="font-display measure-lead mt-8 text-lg italic leading-relaxed text-ink">{data.note}</p>
        </Reveal>
      )}
    </Section>
  );
}
