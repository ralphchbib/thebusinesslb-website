import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "./section";
import { Card } from "@/components/ui/card";
import { getServicesBySlugs } from "@/lib/cms/services";

export async function RelatedServices({ slugs }: { slugs: string[] }) {
  const items = await getServicesBySlugs(slugs);
  if (items.length === 0) return null;

  return (
    <Section surface="white">
      <p className="eyebrow mb-4">
        <span className="tb-rule tb-rule--petrol" />
        Related services
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((svc) => (
          <Card key={svc.slug} className="h-full bg-white">
            <Link href={`/services/${svc.slug}/`} className="flex h-full flex-col">
              {svc.eyebrow && <p className="eyebrow mb-2">{svc.eyebrow}</p>}
              <h3 className="text-lg font-semibold text-ink">{svc.h1}</h3>
              <p className="mt-2 text-sm font-medium text-petrol">{svc.priceAnchor}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                See what&rsquo;s included <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </Card>
        ))}
      </div>
    </Section>
  );
}
