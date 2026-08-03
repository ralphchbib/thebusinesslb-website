import { PricePanel } from "./price-panel";
import type { ServiceContent } from "@/content/services/types";

export function ServiceHero({ service }: { service: ServiceContent }) {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-10 px-6 py-16 md:py-24 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-12 lg:px-10">
        <div>
          {service.eyebrow && (
            <p className="eyebrow mb-4">
              <span className="tb-rule tb-rule--petrol" />
              {service.eyebrow}
            </p>
          )}
          <h1 className="font-display text-[30px] font-medium leading-[1.14] tracking-[-0.02em] text-ink md:text-[40px] lg:text-[44px]">
            {service.h1}
          </h1>
          <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{service.intro}</p>

          {/* Price shown inline right after intro on mobile — stays in the first viewport */}
          <div className="mt-6 lg:hidden">
            <PricePanel service={service} />
          </div>
        </div>

        <div className="hidden lg:block">
          <PricePanel service={service} sticky />
        </div>
      </div>
    </section>
  );
}
