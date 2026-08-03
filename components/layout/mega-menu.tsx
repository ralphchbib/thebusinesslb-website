"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { megaMenuServices, megaMenuStartHere } from "@/content/site";

export function MegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t border-n200 bg-white shadow-tb-3">
      <div className="mx-auto grid max-w-content grid-cols-2 gap-12 px-6 py-10 lg:px-10">
        <div>
          <p className="eyebrow mb-4">
            <span className="tb-rule tb-rule--petrol" />
            What we do
          </p>
          <ul className="grid grid-cols-1 gap-1">
            {megaMenuServices.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-mist"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">
            <span className="tb-rule tb-rule--petrol" />
            Start here
          </p>
          <ul className="mb-4 grid grid-cols-1 gap-1">
            {megaMenuStartHere.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-mist"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/digital-assessment/"
            onClick={onNavigate}
            className="flex items-center justify-between rounded-lg bg-petrol-veil p-5 transition-colors hover:bg-petrol-tint"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">
                Not sure what you need?
              </span>
              <span className="mt-0.5 block text-sm text-n600">Get your assessment</span>
            </span>
            <ArrowRight className="h-4 w-4 flex-none text-petrol" />
          </Link>
        </div>
      </div>
    </div>
  );
}
