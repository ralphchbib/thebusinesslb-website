import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedProfessionalProfiles } from "@/lib/cms/professional-profiles";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DirectoryFilterForm } from "@/components/network/directory-filter-form";
import { Pagination } from "@/components/network/pagination";

export const metadata: Metadata = buildMetadata({
  title: "Professional Directory | THE BUSINESS lb",
  description: "Browse published Lebanese professionals on THE BUSINESS Network — filter by skill, category, location, services and language.",
  path: "/network/professionals/",
});

type SearchParams = {
  page?: string;
  q?: string;
  category?: string;
  location?: string;
  service?: string;
  skill?: string;
  language?: string;
};

export default async function ProfessionalDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;

  const result = await getPublishedProfessionalProfiles({
    page,
    q: sp.q,
    category: sp.category,
    location: sp.location,
    service: sp.service,
    skill: sp.skill,
    language: sp.language,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema([{ name: "Professionals", path: "/network/professionals/" }])),
        }}
      />

      <Breadcrumb items={[{ name: "Professionals" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Professional Directory
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Published Lebanese professionals on THE BUSINESS Network.
        </p>
      </Section>

      <Section surface="mist">
        <DirectoryFilterForm basePath="/network/professionals" type="professional" values={sp} />

        {result.docs.length === 0 ? (
          <p className="mt-8 text-[15px] text-n500">No professionals match these filters yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((pro) => (
              <Card key={pro.id} className="h-full bg-white">
                <Link href={`/network/professionals/${pro.slug}`} className="flex h-full flex-col">
                  {pro.photoUrl && (
                    <Image src={pro.photoUrl} alt={pro.name} width={48} height={48} className="mb-3 rounded-full" />
                  )}
                  <h3 className="text-lg font-semibold text-ink">{pro.name}</h3>
                  <p className="mt-1 text-sm font-medium text-petrol">{pro.title}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">{pro.bio}</p>
                  {pro.location && <p className="mt-3 text-[13px] text-n500">📍 {pro.location}</p>}
                  {pro.languages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pro.languages.map((lang) => (
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
          basePath="/network/professionals"
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
