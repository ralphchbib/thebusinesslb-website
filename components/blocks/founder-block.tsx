import Link from "next/link";
import Image from "next/image";
import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";

export interface FounderBlockProps {
  eyebrow?: string;
  title: string;
  quote: string;
  body: string;
  image: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export function FounderBlock({
  eyebrow,
  title,
  quote,
  body,
  image,
  imageAlt,
  ctaLabel,
  ctaHref,
  className,
}: FounderBlockProps) {
  return (
    <Section surface="white" className={className}>
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[220px_1fr] md:gap-12">
        <Reveal>
          <div className="relative aspect-square w-[160px] overflow-hidden rounded-lg bg-mist md:w-[220px]">
            <Image src={image} alt={imageAlt} fill sizes="220px" className="object-cover" />
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {title}
          </h2>
          <p className="font-display measure-lead mt-5 text-lg italic leading-relaxed text-ink">
            &ldquo;{quote}&rdquo;
          </p>
          <p className="measure mt-4 text-[15px] leading-relaxed text-n600">{body}</p>
          <Link href={ctaHref} className="mt-5 inline-flex items-center text-sm font-semibold text-petrol">
            {ctaLabel}
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}
