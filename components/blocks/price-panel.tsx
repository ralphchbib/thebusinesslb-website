import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import type { ServiceContent } from "@/content/services/types";

export function PricePanel({ service, sticky = false }: { service: ServiceContent; sticky?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-n200 bg-white p-6 shadow-tb-2 ${sticky ? "lg:sticky lg:top-[88px]" : ""}`}
    >
      <p className="font-mono text-xs uppercase tracking-wide text-n500">Starting from</p>
      <p className="font-display mt-1 text-3xl font-medium text-ink">{service.priceAnchor}</p>
      <p className="mt-1 text-sm text-n500">{service.timelineSummary}</p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link href="/digital-assessment/">Get your assessment</Link>
      </Button>
      <WhatsAppLink pageName={service.h1} variant="secondary" size="md" className="mt-3 w-full">
        Message us on WhatsApp
      </WhatsAppLink>
      <p className="mt-4 text-[13px] leading-relaxed text-n500">
        Final price is confirmed after we understand the scope.
      </p>
    </div>
  );
}
