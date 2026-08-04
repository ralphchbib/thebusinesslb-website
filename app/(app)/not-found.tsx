import Link from "next/link";
import { Section } from "@/components/blocks/section";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { error404 } from "@/content/site";

export default function NotFound() {
  return (
    <Section surface="white" className="text-center">
      <p className="font-mono text-sm text-petrol">404</p>
      <h1 className="font-display mt-3 text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
        {error404.heading}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-n600">{error404.body}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/services/">See our services</Link>
        </Button>
        <WhatsAppLink pageName="404 page" variant="secondary" size="lg">
          Tell us what you were looking for
        </WhatsAppLink>
      </div>
    </Section>
  );
}
