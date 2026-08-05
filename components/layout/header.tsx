"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { MegaMenu } from "./mega-menu";
import { MobileDrawer } from "./mobile-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/cms/navigation";

export function Header({
  primaryNav,
  megaMenuServices,
  megaMenuStartHere,
}: {
  primaryNav: NavItem[];
  megaMenuServices: NavItem[];
  megaMenuStartHere: NavItem[];
}) {
  const [condensed, setCondensed] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setMenuOpen(true), 120);
  };
  const closeMenu = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 200);
  };

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b border-transparent bg-white/95 backdrop-blur transition-all duration-200",
          condensed && "border-n200 shadow-tb-1",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-content items-center justify-between px-6 transition-all duration-200 lg:px-10",
            condensed ? "h-[60px]" : "h-[72px]",
          )}
        >
          <Logo width={132} priority className="hidden md:inline-flex" />
          <Logo width={104} priority className="md:hidden" />

          <nav className="hidden items-center gap-1 md:flex" ref={navRef}>
            <div
              className="relative"
              onMouseEnter={openMenu}
              onMouseLeave={closeMenu}
            >
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-mist"
              >
                Services
              </button>
              {menuOpen && (
                <div className="fixed inset-x-0 top-[72px]" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
                  <MegaMenu
                    services={megaMenuServices}
                    startHere={megaMenuStartHere}
                    onNavigate={() => setMenuOpen(false)}
                  />
                </div>
              )}
            </div>
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-mist"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild size="md" className="hidden md:inline-flex">
              <Link href="/digital-assessment/">Get your assessment</Link>
            </Button>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 top-[72px] z-30 bg-ink/40"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        primaryNav={primaryNav}
        megaMenuServices={megaMenuServices}
      />
    </>
  );
}
