import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Testimonial } from "@/lib/cms/testimonials";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const { clientName, companyName, position, quote, rating, logo } = testimonial;
  const attribution = [position, companyName].filter(Boolean).join(", ");

  return (
    <Card className="h-full bg-white" ruleColor="petrol">
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-brass text-brass" : "text-n300"}`}
          />
        ))}
      </div>
      <p className="font-display mt-4 flex-1 text-[17px] leading-relaxed text-ink">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-6 flex items-center gap-3">
        {logo && (
          // Plain <img>, not next/image — logo is an arbitrary editor-supplied
          // path/URL string (no media library yet, same convention as every
          // other image field added since Phase 2), so it isn't guaranteed to
          // satisfy next/image's remote-pattern configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={companyName ?? clientName} className="h-8 w-auto object-contain" />
        )}
        <div>
          <p className="text-sm font-semibold text-ink">{clientName}</p>
          {attribution && <p className="text-sm text-n500">{attribution}</p>}
        </div>
      </div>
    </Card>
  );
}
