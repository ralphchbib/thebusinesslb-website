import { cache } from "react";
import { getCms } from "./client";
import type { PayloadSiteSettingsDoc, PayloadMediaDoc } from "./types";

export interface SiteSettingsData {
  siteName: string;
  slogan: string;
  serviceStatement: string;
  contactEmail: string;
  whatsappNumber?: string;
  phoneDisplay?: string;
  address?: string;
  instagramHandle?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  footerSlogan?: string;
  footerServicesLine?: string;
  footerCopyright?: string;
  newsletterHeading?: string;
  newsletterSub?: string;
  newsletterConsent?: string;
  servicesHubH1?: string;
  servicesHubIntro?: string;
  servicesHubConnectH2?: string;
  servicesHubConnectBody?: string;
  servicesPricingTable: { name: string; covers: string; range: string }[];
  // Phase 4C — sitewide SEO fallbacks. See PHASE4C-SEO-PLAN.md §A.
  defaultSeoTitle?: string;
  defaultMetaDescription?: string;
  defaultOgImage?: string;
  defaultTwitterImage?: string;
  schemaDescription?: string;
  schemaPriceRange?: string;
  schemaAreaServed?: string;
}

// Same helper as lib/cms/homepage.ts — resolves a Media relationship to a
// plain URL, ignoring alt/width/height since none of this global's image
// fields render an <img>/<Image> directly (they only ever feed OG/Twitter
// meta tags).
function resolveMediaUrl(media: number | PayloadMediaDoc | null | undefined): string | undefined {
  return typeof media === "object" && media ? media.url : undefined;
}

// Wrapped in React's cache() — see the equivalent note in lib/cms/services.ts.
export const getSiteSettings = cache(async (): Promise<SiteSettingsData> => {
  const payload = await getCms();
  const doc = (await payload.findGlobal({
    slug: "site-settings",
    // depth: 1 — populates defaultOgImage/defaultTwitterImage (Media
    // relationships), matching the pattern already established in
    // lib/cms/homepage.ts.
    depth: 1,
  })) as unknown as PayloadSiteSettingsDoc;
  return {
    siteName: doc.siteName,
    slogan: doc.slogan,
    serviceStatement: doc.serviceStatement,
    contactEmail: doc.contactEmail,
    whatsappNumber: doc.whatsappNumber || undefined,
    phoneDisplay: doc.phoneDisplay || undefined,
    address: doc.address || undefined,
    instagramHandle: doc.instagramHandle || undefined,
    instagramUrl: doc.instagramUrl || undefined,
    linkedinUrl: doc.linkedinUrl || undefined,
    footerSlogan: doc.footerSlogan || undefined,
    footerServicesLine: doc.footerServicesLine || undefined,
    footerCopyright: doc.footerCopyright || undefined,
    newsletterHeading: doc.newsletterHeading || undefined,
    newsletterSub: doc.newsletterSub || undefined,
    newsletterConsent: doc.newsletterConsent || undefined,
    servicesHubH1: doc.servicesHubH1 || undefined,
    servicesHubIntro: doc.servicesHubIntro || undefined,
    servicesHubConnectH2: doc.servicesHubConnectH2 || undefined,
    servicesHubConnectBody: doc.servicesHubConnectBody || undefined,
    servicesPricingTable: (doc.servicesPricingTable ?? []).map((r) => ({
      name: r.name,
      covers: r.covers,
      range: r.range,
    })),
    defaultSeoTitle: doc.defaultSeoTitle || undefined,
    defaultMetaDescription: doc.defaultMetaDescription || undefined,
    defaultOgImage: resolveMediaUrl(doc.defaultOgImage),
    defaultTwitterImage: resolveMediaUrl(doc.defaultTwitterImage),
    schemaDescription: doc.schemaDescription || undefined,
    schemaPriceRange: doc.schemaPriceRange || undefined,
    schemaAreaServed: doc.schemaAreaServed || undefined,
  };
});
