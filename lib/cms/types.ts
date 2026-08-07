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
  _status?: "draft" | "published" | null;
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
  // Phase 4C — optional OG image, falls back to Site Settings' default.
  ogImage?: number | PayloadMediaDoc | null;
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
  _status?: "draft" | "published" | null;
  title: string;
  excerpt: string;
  topic: "ecommerce" | "websites" | "social" | "ai" | "strategy" | "lebanon-business";
  publishedAt: string;
  readingMinutes?: number | null;
  body?: PayloadArticleBodyBlock[] | null;
  relatedServices?: (number | PayloadServiceDoc)[] | null;
  metaTitle: string;
  metaDescription: string;
  // Phase 4C — optional OG image, falls back to Site Settings' default.
  ogImage?: number | PayloadMediaDoc | null;
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
  // Phase 4C — sitewide SEO fallbacks. See PHASE4C-SEO-PLAN.md §A.
  defaultSeoTitle?: string | null;
  defaultMetaDescription?: string | null;
  defaultOgImage?: number | PayloadMediaDoc | null;
  defaultTwitterImage?: number | PayloadMediaDoc | null;
  schemaDescription?: string | null;
  schemaPriceRange?: string | null;
  schemaAreaServed?: string | null;
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

// Phase 3 — Testimonials + Case Studies. Reuses the same industry/sector
// taxonomy already canonical for Services and the assessment intake form
// (lib/validation/schemas.ts's sectorValues) rather than inventing a new
// list.
export type PayloadIndustry =
  | "food_mouneh"
  | "fashion"
  | "beauty"
  | "restaurants"
  | "tourism"
  | "retail"
  | "professional_services"
  | "real_estate"
  | "exporter"
  | "startup"
  | "other";

// Phase 4B — Media Library. See MEDIA-ARCHITECTURE.md. `width`/`height`
// are Payload's own auto-captured upload metadata (set at upload time via
// sharp), always present on an image doc regardless of query depth.
export interface PayloadMediaDoc {
  id: number;
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}

export interface PayloadTestimonialDoc {
  id: number;
  clientName: string;
  companyName?: string | null;
  position?: string | null;
  industry?: PayloadIndustry | null;
  quote: string;
  rating: number;
  featured?: boolean | null;
  logo?: number | PayloadMediaDoc | null;
  website?: string | null;
  displayOrder?: number | null;
  _status?: "draft" | "published" | null;
}

export interface PayloadCaseStudyResultDoc {
  id?: string;
  metric: string;
  value: string;
}

export interface PayloadCaseStudyDoc {
  id: number;
  title: string;
  slug: string;
  clientName: string;
  industry?: PayloadIndustry | null;
  servicesUsed?: (number | { slug: string; h1: string })[] | null;
  challenge: string;
  solution: string;
  results?: PayloadCaseStudyResultDoc[] | null;
  testimonial?: number | PayloadTestimonialDoc | null;
  featuredImage?: number | PayloadMediaDoc | null;
  gallery?: { id?: string; image: number | PayloadMediaDoc }[] | null;
  featured?: boolean | null;
  seoTitle: string;
  seoDescription: string;
  _status?: "draft" | "published" | null;
}

export interface PayloadTestimonialsBlockDoc {
  id?: string;
  blockType: "testimonialsBlock";
  isVisible?: boolean | null;
  eyebrow?: string | null;
  h2?: string | null;
  testimonials?: (number | PayloadTestimonialDoc)[] | null;
}

export interface PayloadCaseStudiesBlockDoc {
  id?: string;
  blockType: "caseStudiesBlock";
  isVisible?: boolean | null;
  eyebrow?: string | null;
  h2?: string | null;
  caseStudies?: (number | PayloadCaseStudyDoc)[] | null;
}

export type PayloadPageBlockDoc =
  | PayloadHeroBlockDoc
  | PayloadTextBlockDoc
  | PayloadCtaBlockDoc
  | PayloadTestimonialsBlockDoc
  | PayloadCaseStudiesBlockDoc;

export interface PayloadPageDoc {
  id: number;
  title: string;
  slug: string;
  pageType: "landing" | "campaign" | "seasonal";
  seoTitle: string;
  seoDescription: string;
  // Phase 4C — see PHASE4C-SEO-PLAN.md §E.
  ogImage?: number | PayloadMediaDoc | null;
  noindex?: boolean | null;
  blocks?: PayloadPageBlockDoc[] | null;
  _status?: "draft" | "published" | null;
}

// Phase 4A — Homepage. A singleton Global, not a collection — see
// PHASE4A-HOMEPAGE-CMS-PLAN.md. No versions/drafts: every save is live
// immediately, matching SiteSettings.
export interface PayloadHomepageServicesCardDoc {
  id?: string;
  service: number | PayloadServiceDoc;
  featured?: boolean | null;
  overrideBody?: string | null;
  overrideBullets?: PayloadTextItem[] | null;
}

export interface PayloadHomepageDoc {
  heroEyebrow?: string | null;
  heroHeadline: string;
  heroHighlightedText?: string | null;
  heroSubheadline: string;
  heroCtaPrimaryLabel: string;
  heroCtaPrimaryHref: string;
  heroCtaSecondaryLabel: string;
  heroCtaSecondaryHref: string;
  heroReassurance?: string | null;
  heroImage: number | PayloadMediaDoc;

  problemEyebrow?: string | null;
  problemTitle: string;
  problemBody1: string;
  problemBody2: string;
  problemQuote: string;
  problemSymptoms: PayloadTextItem[];

  transformationEyebrow?: string | null;
  transformationTitle: string;
  transformationIntro: string;
  transformationStages: { id?: string; stage: string; where: string; what: string }[];
  transformationClosingLine: string;

  processEyebrow?: string | null;
  processTitle: string;
  processSteps: { id?: string; number: string; name: string; body: string }[];
  processTrustPoints?: { id?: string; name: string; body: string }[] | null;

  founderEyebrow?: string | null;
  founderTitle: string;
  founderQuote: string;
  founderBody: string;
  founderImage: number | PayloadMediaDoc;
  founderCtaLabel: string;
  founderCtaHref: string;

  servicesEyebrow?: string | null;
  servicesTitle: string;
  servicesIntro: string;
  servicesCards: PayloadHomepageServicesCardDoc[];

  testimonialsEyebrow?: string | null;
  testimonialsTitle?: string | null;
  testimonialsIds?: (number | PayloadTestimonialDoc)[] | null;

  caseStudiesEyebrow?: string | null;
  caseStudiesTitle?: string | null;
  caseStudiesIds?: (number | PayloadCaseStudyDoc)[] | null;

  finalCtaHeadline: string;
  finalCtaSubheadline: string;

  metaTitle: string;
  metaDescription: string;
  ogImage?: number | PayloadMediaDoc | null;
}
