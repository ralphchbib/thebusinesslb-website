import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { Section } from "@/components/blocks/section";
import { UnsubscribeForm } from "@/components/forms/unsubscribe-form";

export const metadata: Metadata = buildMetadata({
  title: "Unsubscribe — THE BUSINESS lb",
  description: "Unsubscribe from THE BUSINESS lb newsletter emails.",
  path: "/unsubscribe/",
});

export default function UnsubscribePage() {
  return (
    <Section surface="white">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[36px]">
          Unsubscribe
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-n600">
          Enter the email address you subscribed with and we&rsquo;ll stop sending newsletter emails to it.
        </p>
        <div className="mt-8">
          <UnsubscribeForm />
        </div>
      </div>
    </Section>
  );
}
