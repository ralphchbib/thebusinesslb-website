import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CaseStudy } from "@/lib/cms/case-studies";

export function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  const { slug, title, clientName, industry, results, featuredImage } = caseStudy;
  const headlineResult = results[0];

  return (
    <Card className="h-full bg-white" ruleColor="petrol">
      <Link href={`/case-studies/${slug}/`} className="flex h-full flex-col">
        {featuredImage && (
          <div className="relative -mx-6 -mt-6 mb-4 aspect-[16/9] w-[calc(100%+3rem)] overflow-hidden rounded-t-lg md:-mx-8 md:-mt-8 md:mb-5 md:w-[calc(100%+4rem)]">
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt || title}
              fill
              sizes="(min-width: 768px) 400px, 100vw"
              className="object-cover"
            />
          </div>
        )}
        {industry && <p className="eyebrow mb-2">{industry.replace("_", " ")}</p>}
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm text-n500">{clientName}</p>
        {headlineResult && (
          <p className="font-display mt-4 text-2xl font-medium text-petrol">
            {headlineResult.value}
            <span className="ml-2 text-sm font-normal text-n500">{headlineResult.metric}</span>
          </p>
        )}
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
          Read the case study <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </Card>
  );
}
