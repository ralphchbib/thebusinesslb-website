"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

/**
 * Phase 9D — replaces the previous three-links-in-a-header-bar layout with
 * a real sidebar nav (PHASE9D-TECHNICAL-DESIGN.md §K/§L). `items` is built
 * by the server-rendered layout from the account type (business/professional
 * get Profile + Portfolio; every other type only gets Overview + Settings,
 * matching current behavior for those account types — unchanged, out of
 * this phase's scope). Active-state highlighting needs the current path,
 * which is why this one piece of the dashboard shell is a client component;
 * everything it renders inside is still server-rendered as before.
 */
export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3.5 py-2.5 text-[14px] font-medium transition-colors",
              active ? "bg-petrol-tint text-petrol" : "text-n600 hover:bg-n100 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
