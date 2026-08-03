import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { assessment } from "@/content/assessment";

export function AssessmentHero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-10 px-6 py-16 md:py-24 lg:grid-cols-[1fr_380px] lg:gap-16 lg:px-10">
        <div>
          <Badge variant="brass" className="mb-5">
            {assessment.hero.badge}
          </Badge>
          <h1 className="font-display text-[30px] font-medium leading-[1.14] tracking-[-0.02em] text-ink md:text-[40px] lg:text-[48px]">
            {assessment.h1}
          </h1>
          <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{assessment.hero.sub}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="#apply">{assessment.hero.cta}</Link>
            </Button>
            <WhatsAppLink pageName="Digital Business Assessment" variant="secondary" size="lg">
              {assessment.hero.secondary}
            </WhatsAppLink>
          </div>
          <p className="mt-4 text-sm text-n500">{assessment.hero.micro}</p>
        </div>

        <div className="rounded-lg border border-n200 bg-mist p-6 md:p-8">
          <p className="mb-4 text-sm font-semibold text-ink">What you receive</p>
          <ul className="flex flex-col gap-3">
            {assessment.hero.tiles.map((tile) => (
              <li key={tile} className="flex items-start gap-3 text-[15px] text-n700">
                <Check className="mt-0.5 h-4 w-4 flex-none text-petrol" />
                {tile}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
