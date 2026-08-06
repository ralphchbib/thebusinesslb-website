export interface ServicePackage {
  name: string;
  priceDisplay: string;
  summary: string;
  inclusions: string[];
  isRecommended?: boolean;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceTimelineStep {
  label: string;
  body: string;
}

export interface ServiceContent {
  // Optional: only populated when built from a live Payload document (see
  // lib/cms/services.ts's toServiceContent). The static content/services/*
  // literals predate the CMS migration and never set this — kept optional
  // so those files don't need updating for a field they can't have.
  id?: number;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow?: string;
  h1: string;
  priceAnchor: string;
  timelineSummary: string;
  intro: string;
  localProblem?: {
    h2: string;
    intro?: string;
    items: { title: string; body: string }[];
    note?: string;
  };
  packages: ServicePackage[];
  inclusions: string[];
  exclusions: string[];
  clientProvides?: string[];
  timeline: ServiceTimelineStep[];
  afterLaunch?: { h2: string; body: string };
  faqs: ServiceFaq[];
  relatedServices: string[];
}
