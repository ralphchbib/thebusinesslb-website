import { siteConfig } from "@/lib/config";

export function organizationSchema() {
  const sameAs = [siteConfig.instagramUrl, siteConfig.linkedinUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo-wordmark-ink.svg`,
    image: `${siteConfig.url}/og/default.png`,
    description:
      "Digital growth and business transformation company helping Lebanese SMEs build their digital presence and grow.",
    slogan: siteConfig.slogan,
    foundingDate: siteConfig.foundingDate,
    founder: { "@type": "Person", name: siteConfig.founder },
    email: siteConfig.email,
    address: { "@type": "PostalAddress", addressCountry: "LB" },
    areaServed: [{ "@type": "Country", name: "Lebanon" }],
    priceRange: "$$",
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
 * Phase 4C — extracted from what was previously an inline object literal
 * in app/(app)/insights/[slug]/page.tsx (the one schema type in this
 * codebase that wasn't centralized here, unlike the near-identical
 * caseStudySchema() below). Produces the exact same fields as the
 * original inline version when `image` is omitted — verified byte-
 * identical before the `image` field was added, see
 * PHASE4C-4-VALIDATION.md. Deliberately does not add a `url` field
 * (unlike caseStudySchema()) to keep this refactor's diff minimal;
 * worth revisiting for consistency in a future pass.
 */
export function articleSchema(params: {
  title: string;
  description: string;
  datePublished: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    datePublished: params.datePublished,
    author: { "@type": "Person", name: siteConfig.founder },
    publisher: { "@type": "Organization", name: siteConfig.name },
    ...(params.image ? { image: params.image } : {}),
  };
}

/**
 * Article is the correct, valid schema.org type here — there's no
 * dedicated "case study" type in the vocabulary. Matches how Articles
 * now use articleSchema() above; this one lives in the shared file too,
 * the pattern every schema type in this codebase now follows.
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
