import { Check } from "lucide-react";
import { Section } from "./section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";
import { WhatsAppLink } from "@/components/whatsapp-link";
import type { ServicePackage } from "@/content/services/types";
import { cn } from "@/lib/utils";

export function PackagesGrid({ packages, serviceName }: { packages: ServicePackage[]; serviceName: string }) {
  // Mobile reads top-down, so the recommended tier goes first there; desktop keeps natural order.
  const recommendedIndex = packages.findIndex((p) => p.isRecommended);
  const mobileOrder =
    recommendedIndex > 0
      ? [packages[recommendedIndex], ...packages.filter((_, i) => i !== recommendedIndex)]
      : packages;

  return (
    <Section surface="white">
      <p className="eyebrow mb-4">
        <span className="tb-rule tb-rule--petrol" />
        Packages
      </p>

      {/* Mobile order */}
      <div className="grid grid-cols-1 gap-6 md:hidden">
        {mobileOrder.map((pkg) => (
          <PackageCard key={pkg.name} pkg={pkg} serviceName={serviceName} />
        ))}
      </div>
      {/* Desktop order */}
      <div className="hidden grid-cols-3 gap-6 md:grid">
        {packages.map((pkg) => (
          <PackageCard key={pkg.name} pkg={pkg} serviceName={serviceName} />
        ))}
      </div>
    </Section>
  );
}

function PackageCard({ pkg, serviceName }: { pkg: ServicePackage; serviceName: string }) {
  return (
    <Reveal>
      <Card
        ruleColor={pkg.isRecommended ? "brass" : "ink"}
        className={cn("h-full", pkg.isRecommended && "border-ink")}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">{pkg.name}</h3>
          {pkg.isRecommended && <Badge variant="brass">Most chosen</Badge>}
        </div>
        <p className="font-display text-2xl font-medium text-ink">{pkg.priceDisplay}</p>
        <p className="mt-2 text-sm text-n600">{pkg.summary}</p>
        <ul className="mt-4 flex flex-1 flex-col gap-2">
          {pkg.inclusions.map((inc) => (
            <li key={inc} className="flex items-start gap-2 text-sm text-n700">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-petrol" />
              {inc}
            </li>
          ))}
        </ul>
        <WhatsAppLink
          pageName={`${serviceName} — ${pkg.name}`}
          variant={pkg.isRecommended ? "primary" : "secondary"}
          size="md"
          className="mt-6 w-full"
        >
          Ask about this package
        </WhatsAppLink>
      </Card>
    </Reveal>
  );
}
