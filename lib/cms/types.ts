/**
 * Minimal local types matching the Payload collection/global shapes this
 * app actually reads. Payload can generate a full `payload-types.ts` via
 * `payload generate:types`, but that goes through the same standalone CLI
 * bootstrapping that's broken under Node 24 on this machine (see
 * CMS-IMPACT-REPORT.md) — these are hand-written against the exact field
 * definitions in payload/collections/*.ts instead of `any`, so lint passes
 * and future edits to a collection's fields will surface a real type error
 * here if this file isn't kept in sync.
 */

export interface PayloadTextItem {
  id?: string;
  text: string;
}

export interface PayloadServicePackage {
  id?: string;
  name: string;
  priceDisplay: string;
  summary: string;
  inclusions?: PayloadTextItem[] | null;
  isRecommended?: boolean | null;
}

export interface PayloadServiceDoc {
  id: number;
  slug: string;
  isPublished?: boolean | null;
  order?: number | null;
  eyebrow?: string | null;
  h1: string;
  priceAnchor: string;
  timelineSummary: string;
  intro: string;
  localProblem?: {
    h2?: string | null;
    intro?: string | null;
    items?: { id?: string; title: string; body: string }[] | null;
    note?: string | null;
  } | null;
  packages?: PayloadServicePackage[] | null;
  inclusions?: PayloadTextItem[] | null;
  exclusions?: PayloadTextItem[] | null;
  clientProvides?: PayloadTextItem[] | null;
  timeline?: { id?: string; label: string; body: string }[] | null;
  afterLaunch?: { h2?: string | null; body?: string | null } | null;
  relatedServices?: (number | PayloadServiceDoc)[] | null;
  metaTitle: string;
  metaDescription: string;
}

export type PayloadArticleBlockType = "paragraph" | "heading" | "list";

export interface PayloadArticleBodyBlock {
  id?: string;
  blockType: PayloadArticleBlockType;
  text?: string | null;
  items?: PayloadTextItem[] | null;
}

export interface PayloadArticleDoc {
  id: number;
  slug: string;
  isPublished?: boolean | null;
  title: string;
  excerpt: string;
  topic: "ecommerce" | "websites" | "social" | "ai" | "strategy" | "lebanon-business";
  publishedAt: string;
  readingMinutes?: number | null;
  body?: PayloadArticleBodyBlock[] | null;
  relatedServices?: (number | PayloadServiceDoc)[] | null;
  metaTitle: string;
  metaDescription: string;
}

export interface PayloadFaqDoc {
  id: number;
  question: string;
  answer: string;
  scope: "global" | "service" | "assessment" | "contact" | "pricing";
  service?: number | PayloadServiceDoc | null;
  order?: number | null;
  isPublished?: boolean | null;
}

export interface PayloadNavigationItemDoc {
  id: number;
  menu:
    | "header_primary"
    | "header_mega_col1"
    | "header_mega_col2"
    | "footer_services"
    | "footer_company"
    | "footer_start_here";
  label: string;
  href: string;
  order?: number | null;
  isExternal?: boolean | null;
}

export interface PayloadSiteSettingsDoc {
  siteName: string;
  slogan: string;
  serviceStatement: string;
  contactEmail: string;
  whatsappNumber?: string | null;
  phoneDisplay?: string | null;
  address?: string | null;
  instagramHandle?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  footerSlogan?: string | null;
  footerServicesLine?: string | null;
  footerCopyright?: string | null;
  newsletterHeading?: string | null;
  newsletterSub?: string | null;
  newsletterConsent?: string | null;
  servicesHubH1?: string | null;
  servicesHubIntro?: string | null;
  servicesHubConnectH2?: string | null;
  servicesHubConnectBody?: string | null;
  servicesPricingTable?: { id?: string; name: string; covers: string; range: string }[] | null;
}

// Phase 2 foundation — see PHASE2-ARCHITECTURE.md. Hero/Text/Cta only;
// deliberately not the full block library from the architecture doc.
export interface PayloadHeroBlockDoc {
  id?: string;
  blockType: "hero";
  isVisible?: boolean | null;
  eyebrow?: string | null;
  h1: string;
  sub?: string | null;
  ctaPrimaryLabel?: string | null;
  ctaPrimaryHref?: string | null;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryHref?: string | null;
  reassurance?: string | null;
}

export interface PayloadTextBlockDoc {
  id?: string;
  blockType: "text";
  isVisible?: boolean | null;
  eyebrow?: string | null;
  h2?: string | null;
  body: string;
}

export interface PayloadCtaBlockDoc {
  id?: string;
  blockType: "cta";
  isVisible?: boolean | null;
  h2: string;
  body?: string | null;
  buttonLabel: string;
  buttonHref: string;
  surface?: "white" | "mist" | "veil" | "ink" | null;
}

export type PayloadPageBlockDoc = PayloadHeroBlockDoc | PayloadTextBlockDoc | PayloadCtaBlockDoc;

export interface PayloadPageDoc {
  id: number;
  title: string;
  slug: string;
  pageType: "landing" | "campaign" | "seasonal";
  seoTitle: string;
  seoDescription: string;
  blocks?: PayloadPageBlockDoc[] | null;
  _status?: "draft" | "published" | null;
}
