import type { GlobalConfig } from "payload";
import { anyone, adminOnly } from "../access";
import { revalidateGlobalAfterChange } from "../hooks/revalidate";

/**
 * Singleton. Also carries the Services Hub page copy (H1/intro/connect
 * block/pricing table) and the newsletter block copy — see the two
 * scoping decisions flagged before implementation began: Phase 1 has no
 * general-purpose `pages` collection, so this content lives here instead.
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  access: {
    read: anyone,
    update: adminOnly,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Company",
          fields: [
            { name: "siteName", type: "text", required: true, defaultValue: "THE BUSINESS lb" },
            { name: "slogan", type: "text", required: true, defaultValue: "Where Business Happens." },
            {
              name: "serviceStatement",
              type: "text",
              required: true,
              defaultValue: "Websites. E-commerce. Social Media. AI. Consulting.",
            },
            { name: "contactEmail", type: "email", required: true },
            {
              name: "whatsappNumber",
              type: "text",
              admin: {
                description:
                  "E.164 without +, e.g. 96176126860. Note: NEXT_PUBLIC_WHATSAPP_NUMBER env var remains the source of truth for the client-side WhatsAppLink component — see implementation notes.",
              },
            },
            { name: "phoneDisplay", type: "text" },
            { name: "address", type: "text" },
            { name: "instagramHandle", type: "text" },
            { name: "instagramUrl", type: "text" },
            { name: "linkedinUrl", type: "text" },
          ],
        },
        {
          label: "Footer",
          fields: [
            { name: "footerSlogan", type: "text", defaultValue: "Where Business Happens." },
            {
              name: "footerServicesLine",
              type: "text",
              defaultValue: "Websites. E-commerce. Social Media. AI. Consulting.",
            },
            { name: "footerCopyright", type: "text", defaultValue: "© 2026 THE BUSINESS lb" },
          ],
        },
        {
          label: "Newsletter",
          fields: [
            {
              name: "newsletterHeading",
              type: "text",
              defaultValue: "One useful email, twice a month.",
            },
            {
              name: "newsletterSub",
              type: "textarea",
              defaultValue:
                "Practical digital growth for Lebanese businesses. No pitches, no filler.",
            },
            {
              name: "newsletterConsent",
              type: "text",
              defaultValue: "Unsubscribe whenever you like.",
            },
          ],
        },
        {
          label: "Services Hub Page",
          fields: [
            { name: "servicesHubH1", type: "text" },
            { name: "servicesHubIntro", type: "textarea" },
            { name: "servicesHubConnectH2", type: "text" },
            { name: "servicesHubConnectBody", type: "textarea" },
            {
              name: "servicesPricingTable",
              type: "array",
              admin: {
                description: "Shared by both /services/ and /pricing/ — matches current behavior.",
              },
              fields: [
                { name: "name", type: "text", required: true },
                { name: "covers", type: "text", required: true },
                { name: "range", type: "text", required: true },
              ],
            },
          ],
        },
        {
          // Phase 4C — sitewide SEO fallbacks. These are last-resort
          // defaults only: any content type's own SEO fields (Services/
          // Articles/Pages/Case Studies' metaTitle etc.) always take
          // priority when set. See PHASE4C-SEO-PLAN.md §A.
          label: "SEO Defaults",
          fields: [
            {
              name: "defaultSeoTitle",
              type: "text",
              admin: { description: "Fallback title used when a piece of content has no title of its own." },
            },
            {
              name: "defaultMetaDescription",
              type: "textarea",
              admin: { description: "Fallback meta description used when a piece of content has no description of its own." },
            },
            {
              name: "defaultOgImage",
              type: "upload",
              relationTo: "media",
              admin: { description: "Sitewide social-share image, used when a page has no image of its own." },
            },
            {
              name: "defaultTwitterImage",
              type: "upload",
              relationTo: "media",
              admin: { description: "Optional — falls back to the Default OG Image above when left blank." },
            },
            {
              name: "schemaDescription",
              type: "textarea",
              admin: { description: "Business description used in the sitewide Organization structured data (JSON-LD)." },
            },
            {
              name: "schemaPriceRange",
              type: "text",
              admin: { description: 'Used in the sitewide Organization structured data, e.g. "$$".' },
            },
            {
              name: "schemaAreaServed",
              type: "text",
              admin: { description: "Used in the sitewide Organization structured data, e.g. \"Lebanon\"." },
            },
          ],
        },
      ],
    },
  ],
};
