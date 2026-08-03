export const assessment = {
  metaTitle: "Free Digital Business Assessment for Lebanese Companies | THE BUSINESS lb",
  metaDescription:
    "A structured review of where your business stands online, plus a written 90-day roadmap. Free for the first five businesses. No obligation.",
  h1: "Find out exactly where your business stands online.",
  hero: {
    badge: "Free for the first five businesses",
    sub: "A structured review of your digital position, a conversation with the founder, and a written 90-day plan you keep — whether or not you work with us.",
    cta: "Apply for your assessment",
    secondary: "Message us on WhatsApp",
    micro: "Takes about two minutes to apply. Ralph replies within one business day.",
    tiles: [
      "Where you stand today",
      "Main weaknesses, ranked",
      "Five priority actions",
      "Tools, with real costs",
      "Implementation sequence",
      "Investment ranges",
    ],
  },
  why: {
    h2: "Most agencies quote first and understand later.",
    body: "You describe a problem in a WhatsApp message. You get a proposal for a website. Nobody has looked at whether a website is the thing that would actually move your business. We reversed it. Before we propose anything, we look at the whole picture — how you attract customers, how enquiries reach you, what happens after they do, what you're spending, and what's actually broken.",
    quote:
      "Sometimes the answer is a Shopify store. Sometimes it's that your Google listing is wrong and your WhatsApp is unanswered, and fixing those two things would matter more than anything we could build. We'd rather tell you that.",
  },
  areas: [
    { area: "Business model & revenue", question: "Where does the money actually come from?" },
    { area: "Target customer & market position", question: "Who buys, and why you over someone else?" },
    { area: "Brand & messaging", question: "Can a stranger tell what you do in five seconds?" },
    { area: "Website", question: "Does it exist, does it work, does it produce anything?" },
    { area: "E-commerce readiness", question: "Could you sell online, and would it be worth it?" },
    { area: "Social media", question: "Is it producing attention, or just activity?" },
    { area: "Customer journey", question: "What actually happens between interest and purchase?" },
    { area: "Lead generation & follow-up", question: "Where do enquiries come from and where do they get lost?" },
    { area: "Internal digital tools", question: "What's being done by hand that shouldn't be?" },
    { area: "AI & automation readiness", question: "Is there anything here worth automating yet?" },
    { area: "Basic security", question: "Who has access to your accounts, and what happens if they leave?" },
  ],
  deliverable: [
    "Where you stand today",
    "The main weaknesses, in order of impact",
    "Immediate opportunities",
    "Five priority recommendations, specific and sequenced",
    "Suggested tools and systems with real costs",
    "An implementation sequence and why that order",
    "Indicative investment ranges",
    "Expected outcomes and how you'll measure them",
  ],
  steps: [
    { n: "01", what: "You apply using the form", time: "2 minutes" },
    { n: "02", what: "We review and confirm whether it's a fit", time: "Within 1 business day" },
    { n: "03", what: "You complete a short questionnaire", time: "15 minutes" },
    { n: "04", what: "We review your website, social, listings and market position", time: "Our time" },
    { n: "05", what: "A conversation with Ralph", time: "45–60 minutes" },
    { n: "06", what: "You receive your written roadmap", time: "Within one week" },
  ],
  free: {
    h2: "Why it's free right now.",
    body: "THE BUSINESS lb launched in August 2026. We need a small number of businesses to work with closely and openly, so that our recommendations are grounded in real Lebanese companies rather than theory.",
    bold: "The first five assessments are free.",
    exchange:
      "In exchange we ask for three things: honest feedback on the process, a testimonial if you found it genuinely useful, and permission to write about the results.",
    close: "No obligation to buy anything. No pressure afterwards. If we're not the right fit, we'll say so and you'll still have the roadmap.",
  },
  form: {
    h2: "Apply for your assessment",
    intro: "Two minutes. The more specific you are about the last question, the more useful the conversation will be.",
    submit: "Send my application",
    micro: "Ralph reads every application personally. You'll hear back within one business day.",
    consent: "I'm happy for THE BUSINESS lb to contact me about this application.",
  },
  faqs: [
    { question: "Is it really free?", answer: "For the first five businesses, yes — completely. After that it becomes a paid service, and the page will say so." },
    { question: "What's the catch?", answer: "There isn't one, but there's a trade. We're a new company and we need real work and real feedback. You get a genuine piece of thinking; we get a case study and a testimonial if we've earned it." },
    { question: "Will you just try to sell me a website?", answer: "Sometimes a website is the right answer, and we'll say so. Often it isn't, and we'll say that too. The roadmap is written to be useful whether or not it involves us." },
    { question: "How long does it take?", answer: "About 15 minutes for the questionnaire, 45–60 minutes for the conversation, and your written roadmap within a week of it." },
    { question: "Do I need to prepare anything?", answer: "No. Come as you are. If you have basic numbers — enquiries per month, roughly where sales come from — bring them. If you don't, that's useful information too." },
    { question: "What if I'm not one of the first five?", answer: "Apply anyway. We'll tell you honestly where you stand and what the paid assessment costs." },
    { question: "Is this confidential?", answer: "Yes. Nothing about your business is shared or published without your written permission, including in any case study." },
  ],
};

export const thankYouAssessment = {
  h1: "Application received.",
  lead: (firstName: string) =>
    `Thanks, ${firstName}. Ralph reads every application personally and will reply within one business day.`,
  subHeading: "What happens next",
  steps: [
    "We review what you've told us about your business.",
    "If it's a fit, we send a short questionnaire and book a 45–60 minute call.",
    "Within a week of that call you receive your written 90-day digitalization roadmap.",
  ],
  ctaHeading: "Don't want to wait?",
  readingHeading: "While you wait, three things worth reading:",
};
