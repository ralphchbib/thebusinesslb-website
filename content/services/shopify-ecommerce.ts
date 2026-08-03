import type { ServiceContent } from "./types";

export const shopifyEcommerce: ServiceContent = {
  slug: "shopify-ecommerce",
  metaTitle: "Shopify Store Development in Lebanon | E-commerce | THE BUSINESS lb",
  metaDescription:
    "We build Shopify stores for Lebanese businesses — set up for local payments, delivery and cash on delivery. From $900. See packages and what's included.",
  eyebrow: "Revenue engine 01",
  h1: "We build online stores that turn traditional businesses into digital ones.",
  priceAnchor: "From $900",
  timelineSummary: "3–6 weeks · fixed scope",
  intro:
    "If you make or sell a physical product in Lebanon and every sale still requires a phone call, a DM or a visit, you're capped. Not by demand — by process. An online store lifts that cap. It sells while you're closed, takes orders from customers who'll never visit your shop, and opens the diaspora market that most Lebanese producers never reach. Building one properly, in Lebanon, involves a few things generic tutorials never mention.",
  localProblem: {
    h2: "Anyone can install Shopify. The hard part is everything around it.",
    intro: "A store that works here has to answer questions that don't come up elsewhere:",
    items: [
      { title: "How do customers actually pay?", body: "Card payment options for Lebanese merchants are limited, and international gateways aren't always available. We work through what's realistically usable for your business — local card acquiring, cash on delivery, and the payment methods your customers already use." },
      { title: "How does the order get there?", body: "Delivery in Lebanon is its own project — courier selection, zones, pricing, and a cash-on-delivery process that doesn't create chaos in your accounts." },
      { title: "What about the diaspora?", body: "For most Lebanese food, fashion and artisan brands, the biggest untapped market is Lebanese customers abroad. That means international shipping rates, customs documentation, and pricing in the right currency." },
      { title: "What happens when an order arrives?", body: "Confirmation, packing, tracking, and the follow-up that turns a first order into a repeat one." },
    ],
    note: "A store that ignores these takes orders it can't fulfil. We set them up before launch, not after the first complaint.",
  },
  packages: [
    {
      name: "Starter Store",
      priceDisplay: "From $900",
      summary: "Up to 20 products, theme customisation, payment and delivery setup.",
      inclusions: ["Up to 20 products", "Theme customisation", "Payment and delivery setup", "Mobile optimisation", "Basic SEO", "Owner training", "30 days of support"],
    },
    {
      name: "Growth Store",
      priceDisplay: "From $1,800",
      summary: "Up to 100 products, advanced collections, abandoned-cart recovery, social shopping.",
      inclusions: ["Up to 100 products", "Advanced collections and filtering", "Analytics and conversion tracking", "Email capture and abandoned-cart recovery", "Instagram and Facebook shopping integration", "Conversion optimisation", "Owner and staff training", "60 days of support"],
      isRecommended: true,
    },
    {
      name: "Premium Store",
      priceDisplay: "Scoped after assessment",
      summary: "Large catalogues, custom functionality, CRM and inventory integrations.",
      inclusions: ["Large catalogues", "Custom functionality", "CRM and inventory integrations", "Subscription or wholesale models", "Email marketing automation", "Multi-currency"],
    },
  ],
  inclusions: [
    "Shopify setup and configuration",
    "Theme selection and customisation",
    "Product upload, descriptions, image preparation",
    "Collections and category structure",
    "Payment gateway setup",
    "Delivery zones, rates and cash-on-delivery workflow",
    "Mobile optimisation",
    "Basic SEO for products and collections",
    "Analytics and conversion tracking",
    "Email capture and abandoned-cart recovery",
    "Order-confirmation and notification setup",
    "Owner and staff training with written documentation",
    "Post-launch support",
  ],
  exclusions: [
    "Product photography (or we scope a shoot)",
    "Custom app development beyond Shopify's ecosystem",
    "Ongoing inventory management",
    "Shopify's own monthly subscription fee (paid directly to Shopify)",
  ],
  clientProvides: [
    "Product photography (or we scope a shoot)",
    "Product information and pricing",
    "Logo and brand assets",
    "Business registration details required by payment providers",
  ],
  timeline: [
    { label: "Week 1", body: "Discovery and structure" },
    { label: "Week 2–3", body: "Design and store build" },
    { label: "Week 3–4", body: "Products, payments, delivery" },
    { label: "Week 5", body: "Testing and training" },
    { label: "Week 5–6", body: "Launch and monitoring" },
  ],
  afterLaunch: {
    h2: "A store with no traffic is a warehouse with no door.",
    body: "Launching is the halfway point. Stores make money when something is driving qualified people to them — usually social media, sometimes advertising, and always a reason to come back. Most of our e-commerce clients move onto a monthly retainer covering content, campaigns and ongoing optimisation. It isn't compulsory, and we'll tell you honestly if you're not ready for it yet.",
  },
  faqs: [
    { question: "Shopify or WooCommerce?", answer: "Shopify for most Lebanese product businesses — it's more reliable, needs far less maintenance, and the monthly cost is usually less than what a broken WooCommerce site costs in lost sales. We'll say so if your situation is the exception." },
    { question: "What does Shopify itself cost?", answer: "Shopify charges a monthly subscription paid directly to them, separate from our build fee. We'll tell you the current plan cost before you commit and help you choose the right one." },
    { question: "Can Lebanese customers pay by card?", answer: "Card payment is possible but the options are more limited than in other markets. We work through what's realistically available to you, and set up cash on delivery properly alongside it — for many Lebanese stores it's still the majority of orders." },
    { question: "Can I sell abroad?", answer: "Yes, and for many Lebanese brands that's where the real growth is. We set up international shipping, currency handling and the customs information your courier will need." },
    { question: "How many products can I have?", answer: "Any number. Packages are banded by catalogue size because product setup is where the work sits — 300 products is a genuinely bigger job than 30." },
    { question: "Do I need photography?", answer: "Good product photos are the single biggest factor in online conversion. If yours aren't strong, we'll say so and scope a shoot with a photographer from our network." },
    { question: "Can I manage the store myself afterwards?", answer: "Yes. Training and written documentation are included in every package." },
  ],
  relatedServices: ["social-media", "websites", "ai-automation"],
};
