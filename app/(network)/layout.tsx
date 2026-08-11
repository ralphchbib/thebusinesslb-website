import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../(app)/globals.css";
import { siteConfig } from "@/lib/config";

/**
 * Phase 9A — a deliberately separate, minimal root layout for the Network's
 * auth/dashboard pages. Not the marketing site's Header/Footer/consent
 * banner/analytics stack (that's (app)'s job) — this is a self-contained
 * utility shell, matching how (payload)'s admin panel already has its own
 * independent root layout alongside (app)'s. Only Inter is loaded (no
 * display font/mono) since these are plain, functional pages, not
 * brand-marketing surfaces.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `Network | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name} Network`,
  },
  robots: { index: false, follow: false },
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-mist">
        <main className="flex flex-1 items-start justify-center px-6 py-16">{children}</main>
      </body>
    </html>
  );
}
