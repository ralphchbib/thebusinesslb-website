import type { GlobalConfig } from "payload";
import { adminOrEditor } from "../access";
import { revalidateGlobalAfterChange } from "../hooks/revalidate";
import { siteConfig } from "@/lib/config";

/**
 * Phase 4A shipped this as a singleton with no draft/publish workflow.
 * Phase 5C — gains native draft/publish versioning, same pattern as
 * Pages/CaseStudies/Services/Articles. See PHASE5C-HOMEPAGE-PREVIEW-PLAN.md
 * for the full rationale; summary here:
 *
 * - `versions.drafts` + the `access.read` gate below are the exact same
 *   pattern already proven in production on 4 collections — not a new
 *   mechanism, just the first time it's applied to a Global.
 * - Unlike Services/Articles, there was no legacy `isPublished`-style
 *   field to retire — `_status` is the only publish-state concept this
 *   document has ever had.
 *
 * Scope: only the 7 homepage sections + SEO covered by the Phase 4A brief
 * (see PHASE4A-HOMEPAGE-CMS-PLAN.md §0). PositioningBar, AssessmentBlock,
 * FoundingClients, SectorGrid, and InsightsRow's heading copy remain
 * hardcoded in content/home.ts — out of scope for this phase.
 */
export const Homepage: GlobalConfig = {
  slug: "homepage",
  admin: {
    // Phase 5C — same "Preview" button pattern as every drafts-enabled
    // collection; no slug needed since this Global has exactly one
    // document, always rendered at "/".
    preview: () => {
      const secret = process.env.PREVIEW_SECRET;
      if (!secret) return null;
      return `${siteConfig.url}/api/draft?secret=${secret}&collection=homepage`;
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    // Same reasoning as Pages.ts/CaseStudies.ts/Services.ts/Articles.ts —
    // see those files. Closes the same pre-existing gap: `read: anyone`
    // previously meant Payload's own access layer imposed no restriction
    // at all on this Global.
    read: ({ req: { user } }) => {
      if (user) return true;
      return { _status: { equals: "published" } };
    },
    update: adminOrEditor,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Hero",
          fields: [
            { name: "heroEyebrow", type: "text" },
            { name: "heroHeadline", type: "text", required: true },
            {
              name: "heroHighlightedText",
              type: "text",
              admin: {
                description:
                  "Optional — must be an exact substring of the headline above. That portion renders styled; leave blank for no highlight (matches the current design exactly).",
              },
            },
            { name: "heroSubheadline", type: "textarea", required: true },
            { name: "heroCtaPrimaryLabel", type: "text", required: true },
            { name: "heroCtaPrimaryHref", type: "text", required: true },
            { name: "heroCtaSecondaryLabel", type: "text", required: true },
            { name: "heroCtaSecondaryHref", type: "text", required: true },
            { name: "heroReassurance", type: "text" },
            {
              name: "heroImage",
              type: "upload",
              relationTo: "media",
              required: true,
              admin: {
                description:
                  "The hero image. This is the page's priority/LCP image — pick or upload one that's already reasonably sized; the Media library generates a 1200px-wide variant for this use automatically.",
              },
            },
          ],
        },
        {
          label: "Problem",
          fields: [
            { name: "problemEyebrow", type: "text" },
            { name: "problemTitle", type: "text", required: true },
            { name: "problemBody1", type: "textarea", required: true },
            { name: "problemBody2", type: "textarea", required: true },
            { name: "problemQuote", type: "textarea", required: true },
            {
              name: "problemSymptoms",
              type: "array",
              required: true,
              minRows: 1,
              labels: { singular: "Symptom", plural: "Symptoms" },
              fields: [{ name: "text", type: "text", required: true }],
            },
          ],
        },
        {
          label: "Transformation",
          fields: [
            { name: "transformationEyebrow", type: "text" },
            { name: "transformationTitle", type: "text", required: true },
            { name: "transformationIntro", type: "textarea", required: true },
            {
              name: "transformationStages",
              type: "array",
              required: true,
              minRows: 1,
              fields: [
                { name: "stage", type: "text", required: true },
                { name: "where", type: "text", required: true },
                { name: "what", type: "text", required: true },
              ],
            },
            { name: "transformationClosingLine", type: "textarea", required: true },
          ],
        },
        {
          label: "Process",
          fields: [
            { name: "processEyebrow", type: "text" },
            { name: "processTitle", type: "text", required: true },
            {
              name: "processSteps",
              type: "array",
              required: true,
              minRows: 1,
              fields: [
                {
                  name: "number",
                  type: "text",
                  required: true,
                  admin: { description: 'e.g. "01" — plain text, not auto-generated.' },
                },
                { name: "name", type: "text", required: true },
                { name: "body", type: "textarea", required: true },
              ],
            },
            {
              name: "processTrustPoints",
              type: "array",
              labels: { singular: "Trust point", plural: "Trust points" },
              admin: {
                description: "The 4-item trust grid shown below the process steps.",
              },
              fields: [
                { name: "name", type: "text", required: true },
                { name: "body", type: "textarea", required: true },
              ],
            },
          ],
        },
        {
          label: "Founder",
          fields: [
            { name: "founderEyebrow", type: "text" },
            { name: "founderTitle", type: "text", required: true },
            { name: "founderQuote", type: "textarea", required: true },
            { name: "founderBody", type: "textarea", required: true },
            {
              name: "founderImage",
              type: "upload",
              relationTo: "media",
              required: true,
              admin: { description: "The founder's photo. Pick or upload one." },
            },
            { name: "founderCtaLabel", type: "text", required: true },
            { name: "founderCtaHref", type: "text", required: true },
          ],
        },
        {
          label: "Featured Services",
          fields: [
            { name: "servicesEyebrow", type: "text" },
            { name: "servicesTitle", type: "text", required: true },
            { name: "servicesIntro", type: "textarea", required: true },
            {
              name: "servicesCards",
              type: "array",
              required: true,
              minRows: 1,
              maxRows: 5,
              admin: {
                description:
                  "Up to 5. The first 2 with \"featured\" checked render as the large two-column cards; the rest render as the smaller 3-column row — matches the current design's layout split.",
              },
              fields: [
                {
                  name: "service",
                  type: "relationship",
                  relationTo: "services",
                  required: true,
                },
                {
                  name: "featured",
                  type: "checkbox",
                  defaultValue: false,
                  admin: { description: "Renders as a large card. Pick exactly 2." },
                },
                {
                  name: "overrideBody",
                  type: "textarea",
                  admin: {
                    description:
                      "Optional homepage-specific summary. Leave blank to fall back to this Service's own intro text.",
                  },
                },
                {
                  name: "overrideBullets",
                  type: "array",
                  admin: {
                    description: "Optional — only shown on large (featured) cards. Leave empty for none.",
                  },
                  fields: [{ name: "text", type: "text", required: true }],
                },
              ],
            },
          ],
        },
        {
          label: "Featured Testimonials",
          fields: [
            { name: "testimonialsEyebrow", type: "text" },
            { name: "testimonialsTitle", type: "text" },
            {
              name: "testimonialsIds",
              type: "relationship",
              relationTo: "testimonials",
              hasMany: true,
              admin: {
                description: "Leave empty to automatically show Featured testimonials instead.",
              },
            },
          ],
        },
        {
          label: "Featured Case Studies",
          fields: [
            { name: "caseStudiesEyebrow", type: "text" },
            { name: "caseStudiesTitle", type: "text" },
            {
              name: "caseStudiesIds",
              type: "relationship",
              relationTo: "case-studies",
              hasMany: true,
              admin: {
                description: "Leave empty to automatically show Featured case studies instead.",
              },
            },
          ],
        },
        {
          label: "Final CTA",
          fields: [
            { name: "finalCtaHeadline", type: "text", required: true },
            { name: "finalCtaSubheadline", type: "textarea", required: true },
          ],
        },
        {
          label: "SEO",
          fields: [
            { name: "metaTitle", type: "text", required: true, maxLength: 60 },
            { name: "metaDescription", type: "textarea", required: true, maxLength: 155 },
            {
              name: "ogImage",
              type: "upload",
              relationTo: "media",
              admin: { description: "Optional. Leave blank to use the site default social-share image." },
            },
          ],
        },
      ],
    },
  ],
};
