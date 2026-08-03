import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = buildMetadata({
  title: "Terms | THE BUSINESS lb",
  description: "The terms that govern use of this website and how THE BUSINESS lb engagements are structured.",
  path: "/terms/",
});

export default function TermsPage() {
  return (
    <>
      <Breadcrumb items={[{ name: "Terms" }]} />
      <Section surface="white">
        <div className="measure mx-auto flex max-w-2xl flex-col gap-6 text-[15px] leading-relaxed text-n700">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[40px]">
            Terms
          </h1>
          <p className="text-sm text-n500">Last updated 3 August 2026.</p>

          <p>
            This page covers the terms of using this website. This is a working draft, published so the site
            can launch with an honest, functioning terms page in place; it has not yet been reviewed by a
            Lebanese lawyer, and it will be updated once that review is complete. It does not replace the
            written scope of work agreed for any individual project — that document, not this page, governs a
            specific engagement.
          </p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Using this website</h2>
          <p>You&rsquo;re welcome to browse this site, read the content, and use the forms to get in touch or apply for the assessment. Content on this site — text, design and the {siteConfig.name} name and logo — belongs to {siteConfig.name} and shouldn&rsquo;t be copied or reused without permission.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">The Digital Business Assessment</h2>
          <p>The assessment is offered free to a limited number of businesses, as described on the assessment page. Applying does not create any obligation to purchase a project, and {siteConfig.name} may decline an application at its discretion — most often because the business isn&rsquo;t yet a fit, not as a judgement of its quality.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Projects and engagements</h2>
          <p>Any paid work — a website, a Shopify store, a social media retainer, consulting — is governed by its own written scope of work, agreed and signed before the project begins. That document sets out deliverables, exclusions, revisions, timeline, ownership and price. If anything on this website conflicts with a signed scope of work, the scope of work takes precedence.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">No guarantees implied by this site</h2>
          <p>Pricing shown on this site is indicative and starting-point information, not a binding quote. Timelines described are typical, not guaranteed for every project — actual figures are confirmed in writing before work starts.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Questions</h2>
          <p>
            Contact <a href={`mailto:${siteConfig.email}`} className="text-petrol underline">{siteConfig.email}</a>{" "}
            with any question about these terms.
          </p>
        </div>
      </Section>
    </>
  );
}
