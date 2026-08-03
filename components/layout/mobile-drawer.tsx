"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { megaMenuServices } from "@/content/site";
import { whatsappLink, siteConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
      <div className="flex h-12 items-center justify-between border-b border-n200 px-6">
        <span className="text-sm font-semibold text-ink">Menu</span>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-md text-ink"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <details className="border-b border-n200 py-3" open>
          <summary className="cursor-pointer list-none py-2 text-lg font-semibold text-ink marker:content-none">
            Services
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pb-2">
            {megaMenuServices.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex min-h-12 items-center text-[15px] text-n700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>

        <Link href="/pricing/" onClick={onClose} className="flex min-h-12 items-center border-b border-n200 text-lg font-semibold text-ink">
          Pricing
        </Link>
        <Link href="/insights/" onClick={onClose} className="flex min-h-12 items-center border-b border-n200 text-lg font-semibold text-ink">
          Insights
        </Link>
        <Link href="/about/" onClick={onClose} className="flex min-h-12 items-center border-b border-n200 text-lg font-semibold text-ink">
          About
        </Link>
        <Link href="/contact/" onClick={onClose} className="flex min-h-12 items-center text-lg font-semibold text-ink">
          Contact
        </Link>

        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/digital-assessment/" onClick={onClose}>
            Get your assessment
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 border-t border-n200 px-6 py-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <Button asChild variant="secondary" size="md" className="flex-1">
          <a href={whatsappLink("mobile menu")} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </Button>
        <Button asChild variant="ghost" size="md" className="flex-1">
          <a href={`mailto:${siteConfig.email}`}>Email us</a>
        </Button>
      </div>
    </div>
  );
}
