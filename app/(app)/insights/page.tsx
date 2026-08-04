import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { getAllArticles } from "@/lib/cms/articles";
import { getSiteSettings } from "@/lib/cms/site-settings";

export const metadata: Metadata = buildMetadata({
  title: "Insights — Practical Digital Growth Reading | THE BUSINESS lb",
  description:
    "Straightforward writing on digital growth for Lebanese businesses — what works here, what doesn't, and why.",
  path: "/insights/",
});

export default async function InsightsPage() {
  const [articles, settings] = await Promise.all([getAllArticles(), getSiteSettings()]);
  return (
    <>
      <Breadcrumb items={[{ name: "Insights" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-2xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          Practical reading, no filler.
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Straightforward writing on digital growth for Lebanese businesses — what works here, what doesn&rsquo;t,
          and why.
        </p>
      </Section>

      <Section surface="mist">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Reveal key={article.slug}>
              <Card className="h-full bg-white">
                <Link href={`/insights/${article.slug}/`} className="flex h-full flex-col">
                  <p className="font-mono text-xs uppercase tracking-wide text-petrol">
                    {article.topic.replace("-", " ")}
                  </p>
                  <h2 className="mt-3 text-lg font-semibold leading-snug text-ink">{article.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">{article.excerpt}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                    {article.readingMinutes} min read <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="ink">
        <div className="mx-auto max-w-md text-center">
          <NewsletterForm
            dark
            heading={settings.newsletterHeading}
            sub={settings.newsletterSub}
            consent={settings.newsletterConsent}
          />
        </div>
      </Section>
    </>
  );
}
