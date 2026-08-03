import type { ServiceContent } from "./types";

export const socialMedia: ServiceContent = {
  slug: "social-media",
  metaTitle: "Social Media Management for Lebanese Businesses | THE BUSINESS lb",
  metaDescription:
    "Social media that produces enquiries, not just followers. Strategy, content, Reels and monthly reporting for Lebanese SMEs. See packages.",
  eyebrow: "Revenue engine 02",
  h1: "We turn social media into a business growth system.",
  priceAnchor: "From $250/month",
  timelineSummary: "3-month minimum",
  intro:
    "Most businesses in Lebanon post regularly and get almost nothing back. It isn't a content problem. It's that the account was never set up to do a job. Posts get views. Views don't pay salaries. What matters is whether someone who sees your content ends up messaging, visiting, ordering or buying — and whether you can tell which posts caused it. That's the system we build.",
  localProblem: {
    h2: "Followers are not the goal. This is.",
    intro: "Content → Attention → Profile → Enquiry → Sale → Repeat customer",
    items: [
      { title: "Every link can break", body: "Great content pointing at a profile with no clear next step produces nothing. A perfect profile with no content produces nothing either." },
      { title: "We build the whole chain", body: "Then report on where it's working and where it isn't — not just where the views are." },
    ],
  },
  packages: [
    {
      name: "Social Starter",
      priceDisplay: "From $250/month",
      summary: "Profile optimisation, monthly content calendar, 12 branded posts.",
      inclusions: ["Profile optimisation", "Monthly content calendar", "12 branded posts", "Caption writing", "Basic design", "Monthly summary report"],
    },
    {
      name: "Social Growth",
      priceDisplay: "From $500/month",
      summary: "Full content strategy, 16 posts including 4 Reels, Stories, quarterly review.",
      inclusions: ["Everything in Starter", "Full content strategy", "16 posts including 4 Reels", "Stories throughout the month", "Community management guidance", "Monthly analytics with commentary", "Quarterly strategy review"],
      isRecommended: true,
    },
    {
      name: "Social Pro",
      priceDisplay: "From $900/month",
      summary: "Video production, paid advertising, full community management, funnels.",
      inclusions: ["Everything in Growth", "Video production", "Paid advertising management", "Full community management", "Campaign development", "Lead-generation funnels", "Monthly strategy meeting"],
    },
  ],
  inclusions: [
    "Month one: audit, competitor review, content strategy and pillars",
    "Profile, bio and highlights rebuilt",
    "Content calendar and production",
    "Stories throughout the month",
    "Performance tracked against agreed metrics",
    "Monthly report with what worked, what didn't, what changes next",
    "Quarterly full strategy review",
  ],
  exclusions: [
    "Advertising budget (paid directly to the platform, separate from management fees)",
    "On-camera talent or actors",
    "Engagement pods or follower buying — never",
  ],
  timeline: [
    { label: "Month 1", body: "Foundation — audit, strategy, profile rebuild, first content produced" },
    { label: "Every month after", body: "Content produced and scheduled, community management, performance tracked" },
    { label: "Every quarter", body: "Full strategy review — what to double down on, what to stop" },
  ],
  faqs: [
    { question: "Do I have to be on camera?", answer: "No, but it helps enormously. Founder-led content consistently outperforms brand content in Lebanon. If you're willing, we'll make it easy and structured. If not, we build around the product and the business instead." },
    { question: "Which platforms?", answer: "Instagram for almost every Lebanese consumer business. LinkedIn for B2B and professional services. TikTok where the audience justifies it. We'd rather do one platform well than four badly." },
    { question: "How long before we see results?", answer: "Expect the first meaningful signal within 60–90 days — usually more enquiries and better-quality ones. Anyone promising faster is guessing." },
    { question: "Do you handle the advertising budget?", answer: "We manage the campaigns; you pay the platform directly so you always see exactly what's being spent. Ad management is included in the Pro package." },
    { question: "Can you just do content and I'll post it?", answer: "Yes. It's slightly cheaper and slightly less effective, because timing and community response matter." },
    { question: "Why a three-month minimum?", answer: "Because one month of social media proves nothing. Three is the shortest honest window for judging whether it's working." },
  ],
  relatedServices: ["shopify-ecommerce", "websites", "ai-automation"],
};
