import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { sectors } from "@/content/home";

export function SectorGrid() {
  return (
    <Section surface="white">
      <Reveal>
        <Eyebrow>{sectors.eyebrow}</Eyebrow>
        <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {sectors.h2}
        </h2>
        <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{sectors.body}</p>
      </Reveal>

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
        {sectors.sectorList.map((sector) => (
          <div
            key={sector}
            className="flex min-h-[88px] items-center rounded-lg border border-n200 bg-mist p-4 text-sm font-medium text-ink"
          >
            {sector}
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-5">
        {sectors.qualifiers.map((q) => (
          <div key={q} className="text-sm leading-relaxed text-n600">
            {q}
          </div>
        ))}
      </div>
    </Section>
  );
}
