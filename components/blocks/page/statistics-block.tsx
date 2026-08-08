import { Section } from "@/components/blocks/section";
import type { PayloadStatisticsBlockDoc } from "@/lib/cms/types";

export function PageStatisticsBlock({
  eyebrow,
  h2,
  stats,
}: Omit<PayloadStatisticsBlockDoc, "id" | "blockType" | "isVisible">) {
  return (
    <Section surface="mist">
      {eyebrow && (
        <p className="eyebrow mb-3.5">
          <span className="tb-rule tb-rule--petrol" />
          {eyebrow}
        </p>
      )}
      {h2 && (
        <h2 className="font-display mb-8 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {h2}
        </h2>
      )}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={stat.id ?? i} className="text-center">
            <p className="font-display text-3xl font-medium tracking-[-0.02em] text-petrol md:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-n600">{stat.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
