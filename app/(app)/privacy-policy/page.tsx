import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy | THE BUSINESS lb",
  description: "How THE BUSINESS lb collects, uses and protects information submitted through this website.",
  path: "/privacy-policy/",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <Breadcrumb items={[{ name: "Privacy Policy" }]} />
      <Section surface="white">
        <div className="measure mx-auto flex max-w-2xl flex-col gap-6 text-[15px] leading-relaxed text-n700">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[40px]">
            Privacy policy
          </h1>
          <p className="text-sm text-n500">Last updated 3 August 2026.</p>

          <p>
            This policy explains what {siteConfig.name} collects when you use this website, why, and what
            control you have over it. This is a working draft, published so the site can launch with an honest,
            functioning policy in place; it has not yet been reviewed by a Lebanese lawyer, and it will be
            updated once that review is complete.
          </p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">What we collect</h2>
          <p>When you submit a form on this site — the assessment application, the contact form, or the newsletter subscription — we collect the information you provide directly: your name, business name, email, phone or WhatsApp number, and anything you write in free-text fields. We also record where you came from (referring page and campaign tags) so we understand which channels are working.</p>
          <p>We do not collect payment information anywhere on this site. We never sell or rent your information to anyone.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">How we use it</h2>
          <p>We use what you submit to reply to you, to prepare for a call, and — if you apply for the Digital Business Assessment — to write your roadmap. Newsletter subscribers receive the emails they signed up for and nothing else. We store submissions to keep a record of our conversation with you; we do not use it for any purpose beyond running this business and delivering the assessment, project or reply you asked for.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Consent and marketing</h2>
          <p>
            We only contact you about an assessment application or message if you&rsquo;ve ticked the consent box
            that says so. You can unsubscribe from newsletter emails at any time —{" "}
            <Link href="/unsubscribe/" className="font-semibold text-petrol underline">
              use this page
            </Link>{" "}
            and we&rsquo;ll stop.
          </p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">How we protect it</h2>
          <p>Submitted information is stored securely and access is limited to the people who need it to do the work — in practice, that&rsquo;s Ralph. IP addresses used for basic spam protection are hashed before storage; we never store them in plain text. Assessment answers are treated as commercially sensitive and are never exposed through any public part of the site.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Your rights</h2>
          <p>You can ask us at any time what we hold about you, ask us to correct it, or ask us to delete it entirely. Email {siteConfig.email} and we&rsquo;ll act on it within a reasonable time.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Cookies and analytics</h2>
          <p>Where analytics are enabled, they load only after you&rsquo;ve accepted non-essential cookies. Declining doesn&rsquo;t affect your ability to use the site or submit a form.</p>

          <h2 className="font-display mt-4 text-2xl font-medium text-ink">Questions</h2>
          <p>
            Contact <a href={`mailto:${siteConfig.email}`} className="text-petrol underline">{siteConfig.email}</a>{" "}
            with any question about this policy.
          </p>
        </div>
      </Section>
    </>
  );
}
