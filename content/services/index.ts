import { websites } from "./websites";
import { shopifyEcommerce } from "./shopify-ecommerce";
import { socialMedia } from "./social-media";
import { aiAutomation } from "./ai-automation";
import { consulting } from "./consulting";
import type { ServiceContent } from "./types";

export const services: Record<string, ServiceContent> = {
  "shopify-ecommerce": shopifyEcommerce,
  "social-media": socialMedia,
  websites,
  "ai-automation": aiAutomation,
  consulting,
};

export const serviceOrder = [
  "shopify-ecommerce",
  "social-media",
  "websites",
  "ai-automation",
  "consulting",
] as const;

export function getService(slug: string): ServiceContent | undefined {
  return services[slug];
}

export const servicesHub = {
  metaTitle: "Digital Services for Lebanese Businesses | THE BUSINESS lb",
  metaDescription:
    "Websites, Shopify stores, social media, AI automation and business consulting for Lebanese SMEs. One partner across the whole digital growth journey.",
  h1: "Everything a business needs to grow online.",
  intro:
    "Five services that solve five different stages of the same problem. Most clients start with one and add others as each starts paying for itself. If you're not sure which you need, that's normal — and it's exactly what the assessment is for.",
  connect: {
    h2: "Most clients follow the same path.",
    body: "A food brand comes to us with no website and a busy Instagram account. We assess. We build a Shopify store and fix the brand basics. Once orders start, we take over social media on a monthly retainer to drive traffic to the store. Six months in, when enquiries outgrow the team, we automate the customer responses and set up a CRM. That's four services over a year — but it's one relationship, one plan, and one company accountable for the result. That's the difference between hiring a supplier and having a partner.",
  },
  pricing: [
    { name: "Digital Start", covers: "Assessment, professional email, Google profile, basic website, WhatsApp Business setup", range: "$400 – $900" },
    { name: "Digital Commerce", covers: "Shopify setup, products, payments, delivery, mobile, analytics, training", range: "$900 – $3,000+" },
    { name: "Digital Growth", covers: "Full website, social strategy, monthly content, lead generation, CRM", range: "$1,500 – $4,000+ setup, plus monthly" },
    { name: "Digital Transformation", covers: "Process audit, CRM, automation, AI, reporting, training, advisory", range: "Scoped after assessment" },
  ],
  faqs: [
    { question: "Do I have to buy more than one service?", answer: "No. Most clients start with one. We'd rather do one thing properly than sell you a bundle you're not ready for." },
    { question: "Can you take over work someone else started?", answer: "Often, yes — an existing Shopify store, a half-built website, an Instagram account that needs direction. The assessment tells us whether fixing or rebuilding is the better spend." },
    { question: "What if I only need advice, not delivery?", answer: "That's what consulting is for. Some clients take the roadmap and implement it with their own team. That's a legitimate outcome and we'll support it." },
  ],
};
