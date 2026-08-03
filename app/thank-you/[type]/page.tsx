import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/blocks/section";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { buildMetadata } from "@/lib/seo/metadata";
import { thankYouAssessment } from "@/content/assessment";
import { thankYouContact, thankYouSubscribe } from "@/content/contact";
import { articles } from "@/content/insights";

const VALID_TYPES = ["assessment", "contact", "subscribe"] as const;
type ThankYouType = (typeof VALID_TYPES)[number];

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as ThankYouType)) return {};
  return buildMetadata({
    title: "Thank you",
    description: "Thank you — we've received your submission.",
    path: `/thank-you/${type}/`,
  });
}

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { type } = await params;
  const { name } = await searchParams;
  if (!VALID_TYPES.includes(type as ThankYouType)) notFound();

  if (type === "assessment") {
    return (
      <>
        <Section surface="white" className="text-center">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
            {thankYouAssessment.h1}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-n600">
            {thankYouAssessment.lead(name || "there")}
          </p>

          <div className="mx-auto mt-12 max-w-md text-left">
            <p className="mb-4 text-sm font-semibold text-ink">{thankYouAssessment.subHeading}</p>
            <ol className="flex flex-col gap-4">
              {thankYouAssessment.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-n700">
                  <span className="font-mono flex h-6 w-6 flex-none items-center justify-center rounded-full bg-petrol-tint text-xs font-semibold text-petrol">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-12 text-sm font-semibold text-ink">{thankYouAssessment.ctaHeading}</p>
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            <WhatsAppLink pageName="Assessment thank-you" size="lg">
              Message us on WhatsApp
            </WhatsAppLink>
          </div>
        </Section>
        {articles.length > 0 && (
          <Section surface="mist">
            <p className="mb-6 text-center text-sm font-semibold text-ink">{thankYouAssessment.readingHeading}</p>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3">
              {articles.slice(0, 3).map((a) => (
                <Link
                  key={a.slug}
                  href={`/insights/${a.slug}/`}
                  className="rounded-lg border border-n200 bg-white p-4 text-sm font-medium text-ink transition-colors hover:border-petrol"
                >
                  {a.title}
                </Link>
              ))}
            </div>
          </Section>
        )}
      </>
    );
  }

  if (type === "contact") {
    return (
      <Section surface="white" className="text-center">
        <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {thankYouContact.h1}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-n600">{thankYouContact.lead}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/insights/">Read our latest thinking</Link>
        </Button>
      </Section>
    );
  }

  return (
    <Section surface="white" className="text-center">
      <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
        {thankYouSubscribe.h1}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-n600">{thankYouSubscribe.lead}</p>
    </Section>
  );
}
