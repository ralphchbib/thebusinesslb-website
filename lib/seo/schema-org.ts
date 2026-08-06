import { siteConfig } from "@/lib/config";

/**
 * Phase 4C — description/priceRange/areaServed can be overridden from
 * Site Settings (see lib/cms/site-settings.ts's schemaDescription/
 * schemaPriceRange/schemaAreaServed). The literals below remain as the
 * fallback so this schema is never incomplete before an editor fills
 * those fields in.
 */
export function organizationSchema(overrides?: {
  description?: string;
  priceRange?: string;
  areaServed?: string;
}) {
  const sameAs = [siteConfig.instagramUrl, siteConfig.linkedinUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo-wordmark-ink.svg`,
    image: `${siteConfig.url}/og/default.png`,
    description:
      overrides?.description ||
      "Digital growth and business transformation company helping Lebanese SMEs build their digital presence and grow.",
    slogan: siteConfig.slogan,
    foundingDate: siteConfig.foundingDate,
    founder: { "@type": "Person", name: siteConfig.founder },
    email: siteConfig.email,
    address: { "@type": "PostalAddress", addressCountry: "LB" },
    areaServed: [{ "@type": "Country", name: overrides?.areaServed || "Lebanon" }],
    priceRange: overrides?.priceRange || "$$",
    sameAs,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function serviceSchema(params: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: params.name,
    name: params.name,
    description: params.description,
    url: `${siteConfig.url}${params.path}`,
    provider: { "@type": "ProfessionalService", name: siteConfig.name },
    areaServed: { "@type": "Country", name: "Lebanon" },
  };
}

export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.founder,
    jobTitle: "Founder",
    worksFor: { "@type": "Organization", name: siteConfig.name },
    url: `${siteConfig.url}/about/ralph-chbib/`,
  };
}

/**
 * Article is the correct, valid schema.org type here — there's no
 * dedicated "case study" type in the vocabulary. Matches how Articles
 * (app/(app)/insights/[slug]/page.tsx) already use "@type": "Article"
 * inline; this one lives in the shared file instead, which is the better
 * pattern going forward.
 */
export function caseStudySchema(params: {
  title: string;
  description: string;
  path: string;
  clientName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    about: params.clientName,
    url: `${siteConfig.url}${params.path}`,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
  };
}
