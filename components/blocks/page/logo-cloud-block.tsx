import Image from "next/image";
import { Section } from "@/components/blocks/section";
import type { PayloadLogoCloudBlockDoc } from "@/lib/cms/types";

export function PageLogoCloudBlock({
  eyebrow,
  h2,
  logos,
}: Omit<PayloadLogoCloudBlockDoc, "id" | "blockType" | "isVisible">) {
  const items = logos.filter((l) => typeof l.logo === "object" && l.logo);
  if (items.length === 0) return null;

  return (
    <Section surface="white">
      {eyebrow && (
        <p className="eyebrow mb-3.5 text-center">
          <span className="tb-rule tb-rule--petrol" />
          {eyebrow}
        </p>
      )}
      {h2 && (
        <h2 className="font-display mb-8 text-center text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {h2}
        </h2>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {items.map((item, i) => {
          const media = item.logo as { url: string; alt: string; width?: number | null; height?: number | null };
          const image = (
            <Image
              src={media.url}
              alt={media.alt}
              width={media.width ?? 160}
              height={media.height ?? 60}
              className="h-10 w-auto object-contain grayscale transition-all hover:grayscale-0"
            />
          );
          return (
            <div key={item.id ?? i} title={item.name}>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  {image}
                </a>
              ) : (
                image
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
