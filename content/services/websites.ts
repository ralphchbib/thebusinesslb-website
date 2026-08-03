import type { ServiceContent } from "./types";

export const websites: ServiceContent = {
  slug: "websites",
  metaTitle: "Website Design & Development in Lebanon | THE BUSINESS lb",
  metaDescription:
    "Professional business websites for Lebanese companies — built around a clear commercial objective, not just a design. From $400. See what's included.",
  h1: "A website is not a brochure. It's a commercial asset.",
  priceAnchor: "From $400",
  timelineSummary: "2–6 weeks · fixed scope",
  intro:
    "Most business websites in Lebanon were built to exist, not to work. They look acceptable, sit at a domain nobody visits, and produce nothing. We build the other kind — sites with a single defined job, structured around what the business actually needs to happen: an enquiry, a booking, a phone call, an export lead, or the credibility that closes a deal already in progress.",
  localProblem: {
    h2: "What is this website supposed to make happen?",
    intro:
      "Every project starts there. The answer changes everything that follows — structure, content, what goes above the fold, what we measure.",
    items: [
      { title: "Generate enquiries", body: "a service firm that needs qualified leads" },
      { title: "Take bookings", body: "a clinic, salon, restaurant or tour operator" },
      { title: "Establish credibility", body: "a company whose deals are won in meetings but checked online first" },
      { title: "Open export markets", body: "a producer whose next customer is abroad" },
    ],
    note: "A site built for one of these looks nothing like a site built for another. Sites built for none of them are the ones that don't work.",
  },
  packages: [
    {
      name: "Website Starter",
      priceDisplay: "From $400",
      summary: "Up to 5 pages, mobile-optimised, contact form, WhatsApp, Google profile, basic SEO.",
      inclusions: ["Up to 5 pages", "Mobile-optimised", "Contact form + WhatsApp", "Google Business Profile", "Basic SEO", "2 rounds of revisions", "30 days of support"],
    },
    {
      name: "Website Growth",
      priceDisplay: "From $1,200",
      summary: "Up to 12 pages, custom design, lead-generation structure, blog, analytics.",
      inclusions: ["Up to 12 pages", "Custom design", "Lead-generation structure", "Service pages built for search", "Blog setup", "Analytics and conversion tracking", "3 rounds of revisions", "60 days of support"],
      isRecommended: true,
    },
    {
      name: "Custom",
      priceDisplay: "Scoped after assessment",
      summary: "Booking systems, multi-language sites, property or catalogue search, integrations.",
      inclusions: ["Booking systems", "Multi-language sites", "Property or catalogue search", "Custom integrations"],
    },
  ],
  inclusions: [
    "A structure planned around your commercial objective",
    "Mobile-first design",
    "Copywriting support or a clear brief if you're writing it",
    "Contact and enquiry forms that reach you reliably",
    "WhatsApp integration",
    "Google Business Profile setup and connection",
    "Basic SEO: titles, descriptions, structure, speed",
    "Analytics",
    "Speed optimisation for real Lebanese connection conditions",
    "Training so you can update it yourself",
    "30 days of support after launch",
  ],
  exclusions: [
    "Photography and video production",
    "Content writing beyond the guidance provided",
    "Translation",
    "Ongoing hosting management",
    "Custom web applications",
    "E-commerce functionality (that's a Shopify project)",
  ],
  timeline: [
    { label: "Week 1", body: "Discovery, structure, sitemap approval" },
    { label: "Week 2", body: "Design of key pages, feedback" },
    { label: "Week 3", body: "Build, content loading, revisions" },
    { label: "Week 4", body: "Testing, training, launch" },
  ],
  faqs: [
    { question: "I have a website already. Should I replace it?", answer: "Maybe not. Plenty of sites need restructuring and traffic rather than rebuilding. We'll give you an honest answer even when the honest answer is a smaller project." },
    { question: "Who owns the website?", answer: "You do. Domain, hosting and all accounts are registered in your name from the start." },
    { question: "What happens if I want changes later?", answer: "You're trained to make routine updates yourself. For anything bigger, we offer monthly maintenance or work on an hourly basis — your choice, no lock-in." },
    { question: "WordPress, Webflow or something else?", answer: "We choose based on what you need to do with the site, not on what we prefer to build. We'll explain the trade-offs before deciding, including the ongoing cost of each." },
    { question: "Can you write the content?", answer: "Yes, as a scoped add-on. Otherwise we give you a page-by-page brief telling you exactly what to write and how long each piece should be." },
    { question: "Do you build in Arabic?", answer: "Yes. Arabic and bilingual sites are handled properly — right-to-left layout, appropriate typography, and translation coordinated as part of the project." },
  ],
  relatedServices: ["shopify-ecommerce", "social-media", "ai-automation"],
};
