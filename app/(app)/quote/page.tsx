import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { QuoteForm } from "@/components/forms/quote-form";
import { quote } from "@/content/quote";

export const metadata: Metadata = buildMetadata({
  title: quote.metaTitle,
  description: quote.metaDescription,
  path: "/quote/",
});

export default function QuotePage() {
  return (
    <>
      <Breadcrumb items={[{ name: "Request a Quote" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-2xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {quote.h1}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{quote.intro}</p>
      </Section>

      <Section surface="mist">
        <div className="mx-auto max-w-2xl rounded-lg border border-n200 bg-white p-6 sm:p-10">
          <h2 className="font-display mb-6 text-2xl font-medium text-ink">{quote.form.h2}</h2>
          <QuoteForm />
        </div>
      </Section>
    </>
  );
}
