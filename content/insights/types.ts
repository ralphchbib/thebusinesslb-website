export interface ArticleBlock {
  type: "p" | "h2" | "list";
  text?: string;
  items?: string[];
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  topic: "ecommerce" | "websites" | "social" | "ai" | "strategy" | "lebanon-business";
  publishedAt: string;
  readingMinutes: number;
  body: ArticleBlock[];
  relatedServices: string[];
  // Phase 4C — optional OG image, resolved from the Media relationship.
  ogImage?: string;
}
