import type { ServiceContent } from "./types";

export const consulting: ServiceContent = {
  slug: "consulting",
  metaTitle: "Business Consulting & Strategy in Lebanon | THE BUSINESS lb",
  metaDescription:
    "Business strategy, market research, business plans and go-to-market planning for Lebanese companies, startups and exporters.",
  h1: "Better decisions, built on better information.",
  priceAnchor: "From $600",
  timelineSummary: "2–6 weeks · scoped per engagement",
  intro:
    "Some problems aren't digital. A business plan that a bank or investor will take seriously. A price that's been the same for four years while costs weren't. A decision about whether a new market is worth entering. Those are the problems this service exists for.",
  localProblem: {
    h2: "Consulting is worth it when a real decision is on the table.",
    intro: "Good fit:",
    items: [
      { title: "An established business", body: "considering a new product, market or channel" },
      { title: "A founder", body: "who needs a plan a bank or investor will take seriously" },
      { title: "A company", body: "whose pricing hasn't been reviewed in years" },
      { title: "An exporter", body: "deciding which market to enter first" },
    ],
    note: "Not a good fit: an idea with no research behind it and no willingness to do any · a document needed only to satisfy a formality · a decision already made, looking for endorsement. We'll tell you within the first conversation which one this is.",
  },
  packages: [
    {
      name: "Business strategy",
      priceDisplay: "From $600",
      summary: "Business and revenue model design, market and competitive analysis, pricing strategy.",
      inclusions: ["Business model and revenue model design", "Market analysis", "Competitive analysis", "Growth strategy", "Pricing strategy", "Go-to-market planning"],
    },
    {
      name: "Business planning",
      priceDisplay: "Scoped per engagement",
      summary: "Business plans, feasibility studies, financial projections, investor documentation.",
      inclusions: ["Business plans", "Market research", "Feasibility studies", "Financial projections", "Commercial strategy", "Documentation for investors, banks and grants"],
      isRecommended: true,
    },
    {
      name: "Startup & digitalization consulting",
      priceDisplay: "Scoped per engagement",
      summary: "Idea validation, go-to-market strategy, digital transformation audits.",
      inclusions: ["Idea validation", "Business model design", "Pitch deck preparation", "Digital transformation audit", "AI adoption planning"],
    },
  ],
  inclusions: [
    "01 Frame the question — often it isn't the one you arrived with",
    "02 Gather evidence — market data, competitor analysis, your own numbers",
    "03 Analyse — options laid out with trade-offs, costs and risks",
    "04 Recommend — a written deliverable with a clear recommendation",
    "05 Support delivery — optional; some clients want a plan, some want help executing it",
  ],
  exclusions: [
    "A guarantee of funding or investment",
    "Endorsement of a decision already made",
    "Implementation, unless separately scoped",
  ],
  timeline: [
    { label: "Week 1", body: "Frame the question, agree scope" },
    { label: "Weeks 2–4", body: "Evidence gathering and analysis" },
    { label: "Weeks 5–6", body: "Recommendation, written deliverable" },
  ],
  faqs: [
    { question: "Can you write a business plan for a bank or grant application?", answer: "Yes, and we'll tell you up front what evidence we need from you. A plan built on numbers you can't defend in a meeting is worse than no plan." },
    { question: "Do you guarantee funding?", answer: "No, and anyone who does is selling something. We produce documentation that stands up to scrutiny. The decision belongs to the funder." },
    { question: "Is this only for big companies?", answer: "No. Most of our consulting clients are small businesses facing a decision that's large relative to their size." },
    { question: "Can consulting be combined with delivery?", answer: "Yes, and it often is — a digitalization strategy followed by building what it recommends. Kept as separate agreements so you're never locked into implementing with us." },
    { question: "Do you sign an NDA?", answer: "Yes, as standard. Confidentiality is written into every agreement before information is shared." },
  ],
  relatedServices: ["ai-automation", "websites", "shopify-ecommerce"],
};
