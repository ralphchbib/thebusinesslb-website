import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPostings } from "@/lib/network/market";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostingFilterForm } from "@/components/network/posting-filter-form";
import { Pagination } from "@/components/network/pagination";

export const metadata: Metadata = buildMetadata({
  title: "Opportunities | THE BUSINESS lb",
  description: "Browse Offers and Needs posted by businesses and professionals on THE BUSINESS Network — Blueprint §18 Offer and Need Exchange.",
  path: "/network/opportunities/",
});

type SearchParams = {
  page?: string;
  q?: string;
  postingType?: string;
  category?: string;
  location?: string;
};

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;

  const result = await getPublishedPostings({
    page,
    q: sp.q,
    postingType: sp.postingType === "offer" || sp.postingType === "need" ? sp.postingType : undefined,
    category: sp.category,
    location: sp.location,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Opportunities", path: "/network/opportunities/" }])) }}
      />

      <Breadcrumb items={[{ name: "Opportunities" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Opportunities
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Offers and Needs posted by businesses and professionals on THE BUSINESS Network. Respond to one to start a
          purposeful introduction.
        </p>
      </Section>

      <Section surface="mist">
        <PostingFilterForm basePath="/network/opportunities" values={sp} />

        {result.docs.length === 0 ? (
          <p className="mt-8 text-[15px] text-n500">No opportunities match these filters yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((posting) => (
              <Card key={posting.id} className="h-full bg-white">
                <Link href={`/network/opportunities/${posting.id}`} className="flex h-full flex-col">
                  <div className="flex items-center gap-2">
                    <Badge variant={posting.postingType === "offer" ? "petrol" : "neutral"}>
                      {posting.postingType === "offer" ? "Offer" : "Need"}
                    </Badge>
                    {posting.category && <span className="text-[12px] text-n500">{posting.category}</span>}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{posting.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-n600">{posting.description}</p>
                  <p className="mt-3 text-[13px] text-n500">Posted by {posting.ownerName}</p>
                  {posting.location && <p className="mt-1 text-[13px] text-n500">📍 {posting.location}</p>}
                </Link>
              </Card>
            ))}
          </div>
        )}

        <Pagination
          basePath="/network/opportunities"
          searchParams={sp}
          page={result.page}
          totalPages={result.totalPages}
          hasNextPage={result.hasNextPage}
          hasPrevPage={result.hasPrevPage}
        />
      </Section>
    </>
  );
}
