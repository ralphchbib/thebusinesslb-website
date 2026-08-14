import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedBusinessProfiles } from "@/lib/cms/business-profiles";
import { getNetworkUser } from "@/lib/network/session";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DirectoryFilterForm } from "@/components/network/directory-filter-form";
import { Pagination } from "@/components/network/pagination";
import { VerifiedBadge } from "@/components/network/verified-badge";
import { SaveSearchButton } from "@/components/network/save-search-button";

export const metadata: Metadata = buildMetadata({
  title: "Business Directory | THE BUSINESS lb",
  description: "Browse published Lebanese businesses on THE BUSINESS Network — filter by industry, category, location, services and language.",
  path: "/network/businesses/",
});

type SearchParams = {
  page?: string;
  q?: string;
  industry?: string;
  category?: string;
  location?: string;
  service?: string;
  language?: string;
};

export default async function BusinessDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;
  const viewer = await getNetworkUser();

  const result = await getPublishedBusinessProfiles({
    page,
    q: sp.q,
    industry: sp.industry,
    category: sp.category,
    location: sp.location,
    service: sp.service,
    language: sp.language,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema([{ name: "Businesses", path: "/network/businesses/" }])),
        }}
      />

      <Breadcrumb items={[{ name: "Businesses" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Business Directory
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Published Lebanese businesses on THE BUSINESS Network.
        </p>
      </Section>

      <Section surface="mist">
        <DirectoryFilterForm basePath="/network/businesses" type="business" values={sp} />
        {viewer && (
          <SaveSearchButton
            profileType="business"
            filters={{ q: sp.q, industry: sp.industry, category: sp.category, location: sp.location, service: sp.service, language: sp.language }}
          />
        )}

        {result.docs.length === 0 ? (
          <p className="mt-8 text-[15px] text-n500">No businesses match these filters yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((biz) => (
              <Card key={biz.id} className="h-full bg-white">
                <Link href={`/network/businesses/${biz.slug}`} className="flex h-full flex-col">
                  {biz.logoUrl && (
                    <Image src={biz.logoUrl} alt={biz.companyName} width={48} height={48} className="mb-3 rounded-md" />
                  )}
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-ink">{biz.companyName}</h3>
                    {biz.verified && <VerifiedBadge />}
                  </div>
                  {biz.industry && <p className="mt-1 text-sm font-medium text-petrol">{biz.industry}</p>}
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">{biz.description}</p>
                  {biz.location && <p className="mt-3 text-[13px] text-n500">📍 {biz.location}</p>}
                  {biz.languages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {biz.languages.map((lang) => (
                        <Badge key={lang} variant="neutral">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Link>
              </Card>
            ))}
          </div>
        )}

        <Pagination
          basePath="/network/businesses"
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
