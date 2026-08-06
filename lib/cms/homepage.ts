import { cache } from "react";
import { getCms } from "./client";
import { getServicesByIds } from "./services";
import type { PayloadHomepageDoc, PayloadMediaDoc } from "./types";
import type { ServiceContent } from "@/content/services/types";

// Phase 4B — resolves a Media relationship to a plain {url, alt} pair.
// Kept deliberately lean (no width/height) since Hero/Founder both render
// via next/image's `fill` mode, which doesn't need them.
function resolveMediaImage(media: number | PayloadMediaDoc | null | undefined): { url: string; alt: string } | undefined {
  if (typeof media !== "object" || !media) return undefined;
  return { url: media.url, alt: media.alt };
}

export interface HomepageServiceCard {
  service: ServiceContent;
  featured: boolean;
  overrideBody?: string;
  overrideBullets: string[];
}

export interface HomepageData {
  hero: {
    eyebrow?: string;
    headline: string;
    highlightedText?: string;
    subheadline: string;
    ctaPrimaryLabel: string;
    ctaPrimaryHref: string;
    ctaSecondaryLabel: string;
    ctaSecondaryHref: string;
    reassurance?: string;
    image: string;
    imageAlt: string;
  };
  problem: {
    eyebrow?: string;
    title: string;
    body1: string;
    body2: string;
    quote: string;
    symptoms: string[];
  };
  transformation: {
    eyebrow?: string;
    title: string;
    intro: string;
    stages: { stage: string; where: string; what: string }[];
    closingLine: string;
  };
  process: {
    eyebrow?: string;
    title: string;
    steps: { number: string; name: string; body: string }[];
    trustPoints: { name: string; body: string }[];
  };
  founder: {
    eyebrow?: string;
    title: string;
    quote: string;
    body: string;
    image: string;
    imageAlt: string;
    ctaLabel: string;
    ctaHref: string;
  };
  services: {
    eyebrow?: string;
    title: string;
    intro: string;
    cards: HomepageServiceCard[];
  };
  testimonials: {
    eyebrow?: string;
    title?: string;
    ids: number[];
  };
  caseStudies: {
    eyebrow?: string;
    title?: string;
    ids: number[];
  };
  finalCta: {
    headline: string;
    subheadline: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImage?: string;
  };
}

// Wrapped in React's cache() — see the equivalent note in lib/cms/services.ts.
// generateMetadata and the page component both call this for the same
// request; cache() collapses them into one Payload query.
export const getHomepage = cache(async (): Promise<HomepageData> => {
  const payload = await getCms();
  const doc = (await payload.findGlobal({
    slug: "homepage",
    // depth: 1 — populates heroImage/founderImage/ogImage (Media
    // relationships) and servicesCards[].service directly. servicesCards
    // is still re-resolved via getServicesByIds below regardless, since
    // that returns the full ServiceContent shape (with packages/FAQs/etc.)
    // this depth-1 population alone wouldn't include.
    depth: 1,
  })) as unknown as PayloadHomepageDoc;

  const heroImage = resolveMediaImage(doc.heroImage);
  const founderImage = resolveMediaImage(doc.founderImage);
  const ogImage = resolveMediaImage(doc.ogImage);

  const serviceIds = (doc.servicesCards ?? []).map((c) => (typeof c.service === "object" ? c.service.id : c.service));
  const resolvedServices = await getServicesByIds(serviceIds);
  const serviceById = new Map(resolvedServices.map((s) => [String(s.id), s]));

  const cards: HomepageServiceCard[] = (doc.servicesCards ?? [])
    .map((c): HomepageServiceCard | null => {
      const id = typeof c.service === "object" ? c.service.id : c.service;
      const service = serviceById.get(String(id));
      if (!service) return null;
      return {
        service,
        featured: c.featured ?? false,
        overrideBody: c.overrideBody || undefined,
        overrideBullets: (c.overrideBullets ?? []).map((b) => b.text),
      };
    })
    .filter((c): c is HomepageServiceCard => c !== null);

  const testimonialsIds = (doc.testimonialsIds ?? []).map((t) => (typeof t === "object" ? t.id : t));
  const caseStudiesIds = (doc.caseStudiesIds ?? []).map((c) => (typeof c === "object" ? c.id : c));

  return {
    hero: {
      eyebrow: doc.heroEyebrow || undefined,
      headline: doc.heroHeadline,
      highlightedText: doc.heroHighlightedText || undefined,
      subheadline: doc.heroSubheadline,
      ctaPrimaryLabel: doc.heroCtaPrimaryLabel,
      ctaPrimaryHref: doc.heroCtaPrimaryHref,
      ctaSecondaryLabel: doc.heroCtaSecondaryLabel,
      ctaSecondaryHref: doc.heroCtaSecondaryHref,
      reassurance: doc.heroReassurance || undefined,
      image: heroImage?.url ?? "",
      imageAlt: heroImage?.alt ?? "",
    },
    problem: {
      eyebrow: doc.problemEyebrow || undefined,
      title: doc.problemTitle,
      body1: doc.problemBody1,
      body2: doc.problemBody2,
      quote: doc.problemQuote,
      symptoms: (doc.problemSymptoms ?? []).map((s) => s.text),
    },
    transformation: {
      eyebrow: doc.transformationEyebrow || undefined,
      title: doc.transformationTitle,
      intro: doc.transformationIntro,
      stages: (doc.transformationStages ?? []).map((s) => ({ stage: s.stage, where: s.where, what: s.what })),
      closingLine: doc.transformationClosingLine,
    },
    process: {
      eyebrow: doc.processEyebrow || undefined,
      title: doc.processTitle,
      steps: (doc.processSteps ?? []).map((s) => ({ number: s.number, name: s.name, body: s.body })),
      trustPoints: (doc.processTrustPoints ?? []).map((t) => ({ name: t.name, body: t.body })),
    },
    founder: {
      eyebrow: doc.founderEyebrow || undefined,
      title: doc.founderTitle,
      quote: doc.founderQuote,
      body: doc.founderBody,
      image: founderImage?.url ?? "",
      imageAlt: founderImage?.alt ?? "",
      ctaLabel: doc.founderCtaLabel,
      ctaHref: doc.founderCtaHref,
    },
    services: {
      eyebrow: doc.servicesEyebrow || undefined,
      title: doc.servicesTitle,
      intro: doc.servicesIntro,
      cards,
    },
    testimonials: {
      eyebrow: doc.testimonialsEyebrow || undefined,
      title: doc.testimonialsTitle || undefined,
      ids: testimonialsIds,
    },
    caseStudies: {
      eyebrow: doc.caseStudiesEyebrow || undefined,
      title: doc.caseStudiesTitle || undefined,
      ids: caseStudiesIds,
    },
    finalCta: {
      headline: doc.finalCtaHeadline,
      subheadline: doc.finalCtaSubheadline,
    },
    seo: {
      metaTitle: doc.metaTitle,
      metaDescription: doc.metaDescription,
      ogImage: ogImage?.url,
    },
  };
});
