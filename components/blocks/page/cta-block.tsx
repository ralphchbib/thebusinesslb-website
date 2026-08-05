import Link from "next/link";
import { Section } from "@/components/blocks/section";
import { Button } from "@/components/ui/button";
import type { PayloadCtaBlockDoc } from "@/lib/cms/types";

export function PageCtaBlock({
  h2,
  body,
  buttonLabel,
  buttonHref,
  surface,
}: Omit<PayloadCtaBlockDoc, "id" | "blockType" | "isVisible">) {
  const isDark = surface === "ink";
  return (
    <Section surface={surface ?? "white"} className="text-center">
      <h2
        className={`font-display mx-auto max-w-2xl text-[26px] font-medium tracking-[-0.02em] md:text-[34px] ${
          isDark ? "text-white" : "text-ink"
        }`}
      >
        {h2}
      </h2>
      {body && (
        <p
          className={`mx-auto mt-4 max-w-xl text-[15px] leading-relaxed ${
            isDark ? "text-white/75" : "text-n700"
          }`}
        >
          {body}
        </p>
      )}
      <Button asChild size="lg" className="mt-6">
        <Link href={buttonHref}>{buttonLabel}</Link>
      </Button>
    </Section>
  );
}
