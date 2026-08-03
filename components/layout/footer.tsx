import Link from "next/link";
import { InstagramIcon } from "@/components/icons/instagram";
import { Logo } from "./logo";
import { footerColumns, footerCopy } from "@/content/site";
import { siteConfig, whatsappLink } from "@/lib/config";
import { NewsletterForm } from "@/components/forms/newsletter-form";

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-white/50">{title}</p>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[15px] text-white/80 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-content px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo variant="white" width={160} className="mb-5" />
            <p className="mb-6 max-w-xs text-[15px] text-white/70">{footerCopy.services}</p>
            <div className="flex flex-col gap-2 text-[15px] text-white/80">
              <a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-white">
                {siteConfig.email}
              </a>
              <span>{siteConfig.location}</span>
              <a
                href={siteConfig.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-white"
              >
                <InstagramIcon className="h-4 w-4" />@{siteConfig.instagramHandle}
              </a>
            </div>
          </div>

          <FooterColumn title="Services" links={footerColumns.services} />
          <FooterColumn title="Company" links={footerColumns.company} />
          <FooterColumn title="Start here" links={footerColumns.startHere} />
        </div>

        <div className="mt-16 border-t border-white/10 pt-10">
          <NewsletterForm dark />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
            <span>
              {siteConfig.name} — {footerCopy.slogan}
            </span>
            <span className="hidden md:inline">·</span>
            <span>{footerCopy.copyright}</span>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy-policy/" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms/" className="transition-colors hover:text-white">
              Terms
            </Link>
            <a
              href={whatsappLink("footer")}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
