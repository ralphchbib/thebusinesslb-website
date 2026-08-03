import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export function buildMetadata(params: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}): Metadata {
  const url = `${siteConfig.url}${params.path}`;
  const ogImage = params.ogImage ?? `${siteConfig.url}/og/default.png`;

  return {
    // Content titles already carry the "| THE BUSINESS lb" suffix per the
    // copy spec, so bypass the root layout's title template here.
    title: { absolute: params.title },
    description: params.description,
    alternates: { canonical: url },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      siteName: siteConfig.name,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
      images: [ogImage],
    },
  };
}
