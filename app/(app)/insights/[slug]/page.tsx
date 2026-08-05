import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { siteConfig } from "@/lib/config";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { getArticleBySlug, getPublishedArticleSlugs } from "@/lib/cms/articles";
import { getServicesBySlugs } from "@/lib/cms/services";

export async function generateStaticParams() {
  const slugs = await getPublishedArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return buildMetadata({
    title: article.metaTitle,
    description: article.metaDescription,
    path: `/insights/${article.slug}/`,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      datePublished: article.publishedAt,
      author: { "@type": "Person", name: siteConfig.founder },
      publisher: { "@type": "Organization", name: siteConfig.name },
    },
    breadcrumbSchema([
      { name: "Insights", path: "/insights/" },
      { name: article.title, path: `/insights/${article.slug}/` },
    ]),
  ];

  const related = await getServicesBySlugs(article.relatedServices);

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <Breadcrumb items={[{ name: "Insights", href: "/insights/" }, { name: article.title }]} />

      <Section surface="white">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wide text-petrol">{article.topic.replace("-", " ")}</p>
          <h1 className="font-display mt-3 text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-ink md:text-[38px]">
            {article.title}
          </h1>
          <p className="mt-4 text-sm text-n500">
            {new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {article.readingMinutes} min read
          </p>

          <div className="mt-10 flex flex-col gap-5">
            {article.body.map((block, i) => {
              if (block.type === "h2") {
                return (
                  <h2 key={i} className="font-display mt-4 text-2xl font-medium tracking-[-0.02em] text-ink">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "list") {
                return (
                  <ul key={i} className="flex flex-col gap-2.5 pl-1">
                    {block.items?.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[17px] leading-relaxed text-n700">
                        <span className="mt-2.5 h-1 w-1 flex-none rounded-full bg-petrol" />
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-[17px] leading-relaxed text-n700">
                  {block.text}
                </p>
              );
            })}
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section surface="mist">
          <div className="mx-auto max-w-2xl">
            <p className="eyebrow mb-4">
              <span className="tb-rule tb-rule--petrol" />
              Related service
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((svc) => (
                <Card key={svc!.slug} className="bg-white">
                  <Link href={`/services/${svc!.slug}/`} className="flex flex-col">
                    <h3 className="text-base font-semibold text-ink">{svc!.h1}</h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                      See what&rsquo;s included <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
