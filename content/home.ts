// Phase 4A moved hero, problem, transformation, services, founder, and
// finalCta into the Payload "homepage" Global (payload/globals/Homepage.ts,
// read via lib/cms/homepage.ts) — see PHASE4A-HOMEPAGE-CMS-PLAN.md.
// `process` looks like a candidate too but is kept here unchanged: it's
// also used by app/(app)/about/how-we-work/page.tsx, which is out of this
// phase's scope — see the note above that export. Everything else below
// remains hardcoded, also out of scope.

export const positioning =
  "Digital growth partner for Lebanese SMEs · Based in Lebanon · Founded 2026 · Websites, e-commerce, social, AI and strategy under one roof";

export const assessmentBlock = {
  eyebrow: "Start here",
  h2: "Before we build, we assess.",
  body: "Most agencies quote first and understand later. We do it the other way around. The Digital Business Assessment is a structured review of where your business actually stands online — and a written plan for the next 90 days.",
  deliverables: [
    "A short questionnaire, then a 45–60 minute conversation",
    "A clear picture of where you stand today",
    "The five things worth fixing first, in order",
    "Suggested tools, systems and indicative budgets",
    "A written 90-day digitalization roadmap you keep, whether or not you work with us",
  ],
  offer:
    "The first five assessments are free. In exchange we ask for honest feedback, a testimonial if you found it useful, and permission to write about the results. That's it.",
  quote: "Before we build, we assess. Before we recommend, we understand.",
};

export const foundingClients = {
  eyebrow: "Founding clients",
  h2: "We're new. Here's how we're handling that.",
  body: "THE BUSINESS lb launched in August 2026. We could fill this page with borrowed logos and vague claims. Instead, here's the honest version. Our first five clients get more attention than any client we'll ever take on again, at a price that reflects it — because their results become the work we show everyone after them. If you're a Lebanese business with a good product and a weak digital presence, that trade is a good one for both sides.",
  offer: [
    "Founding-client pricing, fixed for the first year of any retainer",
    "Direct access to Ralph on every project, not an account manager",
    "A written roadmap before anyone asks you for money",
    "The right to walk away after the assessment with no obligation",
  ],
  cta: "Apply as a founding client",
};

// Phase 9 — introduces THE BUSINESS Network (Phase 9A/9B: accounts,
// business/professional profiles, portfolio). Deliberately no directory
// preview, counts, or featured-profile content — there's no real
// directory yet (that's Phase 9C) and no published profiles to feature.
// See PHASE9-HOMEPAGE-ALIGNMENT.md for why.
export const networkIntro = {
  eyebrow: "THE BUSINESS Network",
  h2: "One profile. Your whole presence.",
  body: "THE BUSINESS Network is a free place for Lebanese businesses and professionals to build a real, public profile — a page that represents you properly, with your services and your work, at a link you can actually share.",
  joinCta: "Join the Network",
  loginCta: "Already have an account? Log in",
  cards: [
    {
      label: "For businesses",
      h3: "Build your business profile",
      body: "A public page for your company: what you do, the services you offer, and a portfolio of the work you've done — all in one place, at your own link.",
      cta: "Create your business profile",
    },
    {
      label: "For professionals",
      h3: "Build your professional profile",
      body: "A public page for you: your title, your bio, your skills and experience, the services you offer, and a portfolio of your work.",
      cta: "Create your professional profile",
    },
  ],
};

export const sectors = {
  eyebrow: "Who we work with",
  h2: "We work best with businesses that already have something worth selling.",
  body: "We're not the right partner for an idea on paper. We're the right partner for a business that's already trading, already has customers, and knows it could have many more.",
  sectorList: [
    "Food brands & mouneh producers",
    "Fashion & accessories",
    "Beauty & wellness",
    "Restaurants & hospitality",
    "Tourism operators",
    "Retailers",
    "Professional service firms",
    "Real estate",
    "Exporters",
    "Growing startups",
  ],
  qualifiers: [
    "You already generate revenue",
    "Your product or service is genuinely good",
    "One person can make the decision",
    "You see digital as an investment, not a cost",
    "You want a partner, not a supplier",
  ],
};

// Still used by app/(app)/about/how-we-work/page.tsx, which is out of
// Phase 4A's scope — the Homepage Global has its own independent copy of
// this same content (seeded from these same values) for the homepage's
// Process section. Editing one does not affect the other.
export const process = {
  eyebrow: "How we work",
  h2: "No surprises, at any stage.",
  steps: [
    { n: "01", name: "Assess", body: "We understand the business before recommending anything." },
    { n: "02", name: "Plan", body: "You get a written scope: deliverables, what's excluded, timeline, price." },
    { n: "03", name: "Build", body: "Work is delivered by vetted specialists, coordinated by us. You have one point of contact." },
    { n: "04", name: "Launch", body: "Nothing goes live untested. You're trained on how to run it." },
    { n: "05", name: "Grow", body: "Monthly reporting, improvements, and a strategy review each quarter." },
  ],
  trust: [
    { name: "Written agreements.", body: "Scope, revisions, ownership and timelines in writing before work starts." },
    { name: "Milestone payments.", body: "50% to begin, 30% at design approval, 20% before launch. You're never far ahead of the work." },
    { name: "You own everything.", body: "Accounts, files and access are yours, in your name, from day one." },
    { name: "One point of contact.", body: "You deal with us, not with five freelancers." },
  ],
};

export const insights = {
  eyebrow: "Insights",
  h2: "Practical reading, no filler.",
  body: "Straightforward writing on digital growth for Lebanese businesses — what works here, what doesn't, and why.",
};

export const faq = [
  {
    question: "How much does this cost?",
    answer:
      "Most projects start between $400 and $3,000 depending on scope, with monthly retainers on top for social media or ongoing support. Full ranges are on the pricing page, and the exact figure is confirmed after we understand what you need.",
  },
  {
    question: "We already have a website. Is it worth talking?",
    answer:
      "Usually, yes. Most of the websites we're asked to look at don't need replacing — they need a clear job, better structure, and something driving traffic to them. The assessment will tell you which one you're dealing with.",
  },
  {
    question: "Who actually does the work?",
    answer:
      "We coordinate a network of vetted Lebanese specialists — developers, designers, photographers, copywriters, ads specialists — and take responsibility for the result. You get one point of contact and one agreement.",
  },
  {
    question: "How long does a project take?",
    answer:
      "A basic website is typically 2–4 weeks. A Shopify store is 3–6 weeks depending on catalogue size. Social media is ongoing from the first month. Exact timelines are written into every scope.",
  },
  {
    question: "Do you work with businesses outside Beirut?",
    answer:
      "Yes. Most of the work is done remotely, and we work with businesses across Lebanon and with Lebanese brands selling abroad.",
  },
];
