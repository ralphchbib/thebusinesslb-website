"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/config";

export function StickyActionBar({ servicePrices }: { servicePrices: Record<string, string> }) {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith("/contact")) return null;

  const slug = pathname.match(/^\/services\/([^/]+)\/?$/)?.[1];
  const priceAnchor = slug ? servicePrices[slug] : undefined;

  // On the assessment page itself, the CTA should jump straight to the form
  // instead of "navigating" to the page the visitor is already reading.
  const isAssessmentPage = pathname.startsWith("/digital-assessment");
  const assessmentHref = isAssessmentPage ? "#apply" : "/digital-assessment/";
  const assessmentLabel = isAssessmentPage ? "Apply now" : "Get your assessment";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-n200 bg-white/95 px-4 py-3 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {priceAnchor ? (
        <div className="flex flex-1 items-center text-sm font-semibold text-ink">{priceAnchor}</div>
      ) : (
        <Button asChild variant="secondary" size="md" className="flex-1">
          <a href={whatsappLink(pathname)} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </Button>
      )}
      <Button asChild size="md" className="flex-[1.4]">
        <Link href={assessmentHref}>{assessmentLabel}</Link>
      </Button>
    </div>
  );
}
