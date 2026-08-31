import type { Metadata } from "next";
import Link from "next/link";
import { getDeclarationDirectory, type DeclarationValue } from "@/lib/network/diaspora";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeclarationFilterForm } from "@/components/network/declaration-filter-form";
import { DECLARATION_LABELS } from "@/lib/network/diaspora-labels";
import { Pagination } from "@/components/network/pagination";
import { allDeclarations } from "@/lib/validation/diaspora-schemas";

export const metadata: Metadata = buildMetadata({
  title: "Diaspora Bridge | THE BUSINESS lb",
  description: "Connect Lebanese businesses and professionals with diaspora members worldwide — Blueprint §33 Diaspora Bridge.",
  path: "/network/diaspora-bridge/",
});

type SearchParams = {
  page?: string;
  side?: string;
  declaration?: string;
};

export default async function DiasporaBridgePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;
  const declaration = (allDeclarations as readonly string[]).includes(sp.declaration ?? "") ? (sp.declaration as DeclarationValue) : undefined;
  const side = sp.side === "supply" || sp.side === "diaspora" ? sp.side : undefined;

  const result = await getDeclarationDirectory({ page, declaration, side });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Diaspora Bridge", path: "/network/diaspora-bridge/" }])) }}
      />

      <Breadcrumb items={[{ name: "Diaspora Bridge" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Diaspora Bridge
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Lebanese businesses declare what they&rsquo;re seeking or offering — export readiness, distributors, mentors,
          partnerships. Diaspora members declare how they can help — mentoring, distribution, introductions, hiring.
          Browse both sides and reach out to start a purposeful introduction.
        </p>
      </Section>

      <Section surface="mist">
        <DeclarationFilterForm basePath="/network/diaspora-bridge" values={sp} />

        {result.docs.length === 0 ? (
          <p className="mt-8 text-[15px] text-n500">No declarations match these filters yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((item) => (
              <Card key={item.id} className="h-full bg-white">
                <Link href={`/network/diaspora-bridge/${item.id}`} className="flex h-full flex-col">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.accountType === "diaspora" ? "brass" : "petrol"}>
                      {item.accountType === "diaspora" ? "Diaspora" : item.accountType === "professional" ? "Professional" : "Business"}
                    </Badge>
                    {item.diasporaCountry && <span className="text-[12px] text-n500">{item.diasporaCountry}</span>}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{item.accountName}</h3>
                  <div className="mt-2 flex flex-1 flex-wrap gap-1.5">
                    {item.declarations.map((d) => (
                      <span key={d} className="rounded-pill bg-n100 px-2.5 py-1 text-[12px] text-n700">
                        {DECLARATION_LABELS[d]}
                      </span>
                    ))}
                  </div>
                  {item.note && <p className="mt-3 text-[13px] leading-relaxed text-n600">{item.note}</p>}
                </Link>
              </Card>
            ))}
          </div>
        )}

        <Pagination
          basePath="/network/diaspora-bridge"
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
