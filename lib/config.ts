/**
 * Single source of truth for brand facts, contact channels and site-wide
 * settings. Fields left empty are genuinely unknown (see Appendix E of the
 * spec) — components must render conditionally around them, never invent a
 * value.
 */
export const siteConfig = {
  name: "THE BUSINESS lb",
  slogan: "Where Business Happens.",
  serviceStatement: "Websites. E-commerce. Social Media. AI. Consulting.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://thebusinesslb.com",
  founder: "Ralph Chbib",
  email: "hello@thebusinesslb.com",
  instagramHandle: "thebusiness.lb",
  instagramUrl: "https://www.instagram.com/thebusiness.lb",
  // Sourced from the founder's existing prototype site — real, not invented.
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "96176126860",
  location: "Beirut & North Lebanon, Lebanon",
  // Not yet supplied — omit from UI rather than invent.
  phoneDisplay: "",
  linkedinUrl: "",
  foundingDate: "2026-08-01",
} as const;

export function whatsappLink(pageName: string, customMessage?: string) {
  const text =
    customMessage ??
    `Hi, I found you through the ${pageName} page on thebusinesslb.com.`;
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
