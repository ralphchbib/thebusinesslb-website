import Image from "next/image";
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
          <Image
            src={logo.url}
            alt={logo.alt || companyName || clientName}
            width={logo.width ?? 200}
            height={logo.height ?? 80}
            className="h-8 w-auto object-contain"
          />
        )}
        <div>
          <p className="text-sm font-semibold text-ink">{clientName}</p>
          {attribution && <p className="text-sm text-n500">{attribution}</p>}
        </div>
      </div>
    </Card>
  );
}
