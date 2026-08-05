import type { Metadata } from "next";
import { Bodoni_Moda, Inter, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { siteConfig } from "@/lib/config";
import { organizationSchema } from "@/lib/seo/schema-org";
import { getNavItems } from "@/lib/cms/navigation";
import { getServicePriceMap } from "@/lib/cms/services";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  weight: ["400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Digital Growth for Lebanese Businesses`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "We build Lebanese businesses for the digital world — websites, Shopify stores, social media, AI and consulting. Start with a free digital assessment.",
  icons: {
    icon: "/monogram.svg",
    apple: "/icon-192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [primaryNav, megaMenuServices, megaMenuStartHere, servicePrices] = await Promise.all([
    getNavItems("header_primary"),
    getNavItems("header_mega_col1"),
    getNavItems("header_mega_col2"),
    getServicePriceMap(),
  ]);

  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Header
          primaryNav={primaryNav}
          megaMenuServices={megaMenuServices}
          megaMenuStartHere={megaMenuStartHere}
        />
        <main id="main" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <StickyActionBar servicePrices={servicePrices} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
