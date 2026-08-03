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
