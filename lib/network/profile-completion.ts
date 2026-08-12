/**
 * Phase 9D — computed on read, never stored (PHASE9D-TECHNICAL-DESIGN.md
 * §I). Each check is a real field on the profile the account already owns
 * and can already see in full; no weighting beyond equal-per-check, no
 * fabricated signal. `label` is the specific, actionable copy shown in the
 * missing-checks list on the dashboard.
 */

export interface CompletionCheck {
  key: string;
  label: string;
  done: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  checks: CompletionCheck[];
  missing: CompletionCheck[];
}

function summarize(checks: CompletionCheck[]): ProfileCompletion {
  const done = checks.filter((c) => c.done).length;
  return {
    percentage: Math.round((done / checks.length) * 100),
    checks,
    missing: checks.filter((c) => !c.done),
  };
}

export interface BusinessProfileForCompletion {
  companyName?: unknown;
  slug?: unknown;
  description?: unknown;
  logo?: unknown;
  industry?: unknown;
  category?: unknown;
  location?: unknown;
  languages?: unknown;
  services?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  socialLinks?: unknown;
}

export function computeBusinessProfileCompletion(
  profile: BusinessProfileForCompletion,
  portfolioCount: number,
): ProfileCompletion {
  const hasArray = (v: unknown) => Array.isArray(v) && v.length > 0;
  const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  return summarize([
    { key: "companyName", label: "Add your company name", done: hasText(profile.companyName) },
    { key: "slug", label: "Choose your public URL", done: hasText(profile.slug) },
    { key: "description", label: "Write a description", done: hasText(profile.description) },
    { key: "logo", label: "Add a logo", done: Boolean(profile.logo) },
    { key: "industry", label: "Add your industry", done: hasText(profile.industry) },
    { key: "category", label: "Add a category", done: hasText(profile.category) },
    { key: "location", label: "Add your location", done: hasText(profile.location) },
    { key: "languages", label: "Add at least one language", done: hasArray(profile.languages) },
    { key: "services", label: "Add at least one service", done: hasArray(profile.services) },
    { key: "contactEmail", label: "Add a contact email", done: hasText(profile.contactEmail) },
    { key: "contactPhone", label: "Add a contact phone number", done: hasText(profile.contactPhone) },
    { key: "socialLinks", label: "Add a social link", done: hasArray(profile.socialLinks) },
    { key: "portfolio", label: "Publish a portfolio project", done: portfolioCount > 0 },
  ]);
}

export interface ProfessionalProfileForCompletion {
  name?: unknown;
  slug?: unknown;
  title?: unknown;
  bio?: unknown;
  photo?: unknown;
  category?: unknown;
  location?: unknown;
  languages?: unknown;
  skills?: unknown;
  experience?: unknown;
  services?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
}

export function computeProfessionalProfileCompletion(
  profile: ProfessionalProfileForCompletion,
  portfolioCount: number,
): ProfileCompletion {
  const hasArray = (v: unknown) => Array.isArray(v) && v.length > 0;
  const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  return summarize([
    { key: "name", label: "Add your name", done: hasText(profile.name) },
    { key: "slug", label: "Choose your public URL", done: hasText(profile.slug) },
    { key: "title", label: "Add your professional title", done: hasText(profile.title) },
    { key: "bio", label: "Write a bio", done: hasText(profile.bio) },
    { key: "photo", label: "Add a photo", done: Boolean(profile.photo) },
    { key: "category", label: "Add a category", done: hasText(profile.category) },
    { key: "location", label: "Add your location", done: hasText(profile.location) },
    { key: "languages", label: "Add at least one language", done: hasArray(profile.languages) },
    { key: "skills", label: "Add at least one skill", done: hasArray(profile.skills) },
    { key: "experience", label: "Add at least one experience entry", done: hasArray(profile.experience) },
    { key: "services", label: "Add at least one service", done: hasArray(profile.services) },
    { key: "contactEmail", label: "Add a contact email", done: hasText(profile.contactEmail) },
    { key: "contactPhone", label: "Add a contact phone number", done: hasText(profile.contactPhone) },
    { key: "portfolio", label: "Publish a portfolio project", done: portfolioCount > 0 },
  ]);
}
