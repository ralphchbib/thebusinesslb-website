import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { hero } from "@/content/home";

export function Hero() {
  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-content grid-cols-1 items-center gap-10 px-6 py-16 md:py-24 lg:grid-cols-[6fr_4fr] lg:gap-16 lg:px-10">
        <div>
          <p className="eyebrow mb-5">
            <span className="tb-rule tb-rule--petrol" />
            {hero.eyebrow}
          </p>
          <h1 className="font-display text-[32px] leading-[1.14] font-medium tracking-[-0.02em] text-ink md:text-[44px] lg:text-[56px] lg:leading-[1.08]">
            {hero.h1}
          </h1>
          <p className="measure-lead mt-5 text-lg leading-relaxed text-n600 md:text-xl">{hero.sub}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/digital-assessment/">{hero.ctaPrimary}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/services/">{hero.ctaSecondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-n500">{hero.reassurance}</p>
        </div>

        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-mist">
            <Image
              src="/ralph-chbib-source.png"
              alt="Ralph Chbib, founder of THE BUSINESS lb"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
