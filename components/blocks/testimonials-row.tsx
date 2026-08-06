import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { TestimonialCard } from "./testimonial-card";
import { getFeaturedTestimonials, getTestimonialsByIds } from "@/lib/cms/testimonials";

/**
 * Reusable testimonials section — used directly on service pages, and
 * (via components/blocks/page/testimonials-block.tsx) inside the
 * Testimonials block on landing Pages.
 *
 * `ids`: when provided (an editor picked specific testimonials on a Pages
 * block), those are shown, in that order. When omitted (the default on
 * service pages, or when a Pages block's picker is left empty), Featured
 * testimonials are shown instead — a single "which testimonials are on by
 * default" toggle for editors, rather than needing to re-pick the same
 * testimonials on every page that wants them.
 */
export async function TestimonialsRow({
  ids,
  eyebrow = "What clients say",
  h2 = "Real feedback from real projects.",
  surface = "mist",
}: {
  ids?: (number | string)[];
  eyebrow?: string;
  h2?: string;
  surface?: "white" | "mist";
}) {
  const testimonials = ids && ids.length > 0 ? await getTestimonialsByIds(ids) : await getFeaturedTestimonials();
  if (testimonials.length === 0) return null;

  return (
    <Section surface={surface}>
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {h2}
        </h2>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <Reveal key={t.id}>
            <TestimonialCard testimonial={t} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
