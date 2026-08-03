import type { ServiceContent } from "./types";

export const aiAutomation: ServiceContent = {
  slug: "ai-automation",
  metaTitle: "AI & Automation for Lebanese Businesses | THE BUSINESS lb",
  metaDescription:
    "Practical AI and automation for Lebanese SMEs — faster customer replies, automated follow-up, and less repetitive work. Starts with a defined use case.",
  h1: "We help traditional businesses become smarter businesses.",
  priceAnchor: "Scoped per project",
  timelineSummary: "Starts with a readiness review",
  intro:
    "Most AI conversations aimed at small businesses are either hype or software sales. This isn't that. The useful version is narrow and boring: a customer gets an answer at 11pm instead of the next morning. A quote gets followed up automatically instead of being forgotten. Someone stops spending four hours a week copying information between a notebook and a spreadsheet. That's what we build. And we only build it when there's a specific, measurable reason to.",
  localProblem: {
    h2: "We don't sell AI without a defined use case.",
    intro: "It would be easy to sell \"AI transformation\" to every client. We don't, because most businesses don't need it yet — and buying tools before fixing the process underneath just makes the mess faster.",
    items: [
      { title: "Customer response", body: "An assistant trained on your products, prices, hours and policies that answers common questions instantly on WhatsApp or your website — and hands over to a person the moment it should." },
      { title: "Follow-up that doesn't depend on memory", body: "Quotes followed up automatically. Enquiries chased on a schedule. Repeat customers reminded when it's time." },
      { title: "Content workflow", body: "Systems that take one piece of source material and produce drafts for posts, captions, emails and product descriptions. You still approve everything." },
      { title: "Operations and admin", body: "Order information moving between systems without being retyped. Enquiries routed to the right person automatically." },
    ],
    note: "Before we recommend anything, we identify the specific task, how much time or money it currently costs, and what success looks like. If the numbers don't justify it, we say so.",
  },
  packages: [
    {
      name: "Readiness review",
      priceDisplay: "Scoped",
      summary: "We look at how the work actually gets done today and where time is going.",
      inclusions: ["Process review", "Use case identification", "Payback estimate"],
    },
    {
      name: "Build & train",
      priceDisplay: "Scoped after review",
      summary: "One or two specific tasks with a clear payback, tested before anyone relies on it.",
      inclusions: ["Tool build and integration", "Testing with real cases", "Team training", "Written usage policy"],
      isRecommended: true,
    },
    {
      name: "Organisation first",
      priceDisplay: "Scoped",
      summary: "Sometimes the answer isn't AI — it's a CRM, shared drive, or a form instead of a phone call.",
      inclusions: ["Microsoft 365 / Google Workspace setup", "CRM selection and migration", "Cloud file organisation", "Simple dashboards"],
    },
  ],
  inclusions: [
    "01 Readiness review — how work actually gets done today",
    "02 Use case selection — one or two tasks with clear payback",
    "03 Build and test — tested with real cases before anyone relies on it",
    "04 Train — your team learns to use it and its limits",
    "05 Review — after 30 days we check whether it's saving what we said it would",
  ],
  exclusions: [
    "AI tools sold without a defined use case",
    "Ongoing subscription costs of third-party AI tools (billed directly to you, disclosed up front)",
  ],
  timeline: [
    { label: "Step 1", body: "Readiness review" },
    { label: "Step 2", body: "Use case selection" },
    { label: "Step 3", body: "Build and test" },
    { label: "Step 4", body: "Train your team" },
    { label: "Step 5 (day 30)", body: "Review against the numbers we set out" },
  ],
  faqs: [
    { question: "Is my business too small for this?", answer: "Probably not, but you might be too early. If you're answering the same five customer questions twenty times a day, you're the right size. If your process changes every week, fix the process first." },
    { question: "Will this replace my staff?", answer: "Not in a business this size. It removes the repetitive parts of their work — the copying, the chasing, the retyping — so they spend time on the parts that need a person." },
    { question: "What about my customer data?", answer: "We set up clear rules about what goes into any tool, and a written policy for your team. Anything sensitive stays out. This is part of every AI engagement, not an add-on." },
    { question: "Does it work in Arabic?", answer: "Yes, though quality varies by tool and by dialect. We test with your real messages before committing to anything, and we'll tell you honestly where it falls short." },
    { question: "What does it cost to run?", answer: "Most tools have a monthly subscription, usually modest at this scale. We give you the full running cost — not just the build fee — before you decide." },
  ],
  relatedServices: ["consulting", "social-media", "shopify-ecommerce"],
};
