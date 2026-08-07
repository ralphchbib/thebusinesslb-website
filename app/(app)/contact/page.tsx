import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { faqSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { Badge } from "@/components/ui/badge";
import { FaqBlock } from "@/components/blocks/faq-block";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { siteConfig } from "@/lib/config";
import { contact } from "@/content/contact";
import { getFaqsByScope } from "@/lib/cms/faqs";

export const metadata: Metadata = buildMetadata({
  title: contact.metaTitle,
  description: contact.metaDescription,
  path: "/contact/",
});

export default async function ContactPage() {
  const faqs = await getFaqsByScope("contact");
  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }}
        />
      )}

      <Breadcrumb items={[{ name: "Contact" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-2xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {contact.h1}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{contact.intro}</p>
      </Section>

      <Section surface="mist">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="flex flex-col gap-4">
            <div className="rounded-lg border-2 border-petrol bg-white p-6">
              <Badge className="mb-3">Fastest</Badge>
              <p className="text-lg font-semibold text-ink">{contact.channels.whatsapp.title.replace(" — fastest.", "")}</p>
              <p className="mt-2 text-sm leading-relaxed text-n600">{contact.channels.whatsapp.body}</p>
              <WhatsAppLink pageName="Contact" className="mt-5 w-full sm:w-auto">
                {contact.channels.whatsapp.cta}
              </WhatsAppLink>
            </div>
            <div className="rounded-lg border border-n200 bg-white p-6">
              <p className="text-lg font-semibold text-ink">{contact.channels.email.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-n600">{contact.channels.email.body}</p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-petrol"
              >
                <Mail className="h-4 w-4" />
                {siteConfig.email}
              </a>
            </div>
            <div className="rounded-lg border border-n200 bg-white p-6">
              <p className="text-lg font-semibold text-ink">{contact.channels.location.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-n600">{siteConfig.location}</p>
              <p className="mt-1 text-sm leading-relaxed text-n600">{contact.channels.location.body}</p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-lg border border-n200 bg-white p-6 md:p-8">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </Section>

      <Section surface="white">
        <p className="eyebrow mb-6">
          <span className="tb-rule tb-rule--petrol" />
          {contact.next.h2}
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {contact.next.items.map((item) => (
            <Reveal key={item.n}>
              <div className="h-full rounded-lg border border-n200 bg-mist p-6">
                <p className="font-mono text-xs font-medium text-petrol">{item.n}</p>
                <p className="mt-2 text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section surface="veil" className="text-center">
        <Reveal>
          <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {contact.exitRamp.h2}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-n700">{contact.exitRamp.body}</p>
          <Link
            href="/digital-assessment/"
            className="mt-6 inline-block text-sm font-semibold text-petrol"
          >
            Take the assessment instead &rarr;
          </Link>
        </Reveal>
      </Section>

      <FaqBlock faqs={faqs} />
    </>
  );
}
