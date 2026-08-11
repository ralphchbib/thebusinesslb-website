"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/track";

/**
 * Phase 8 — fires scroll_75 once per page when the visitor scrolls past
 * 75% of document height. Mounted once, site-wide, in the root layout;
 * the pathname-keyed ref resets the "already fired" guard on navigation.
 */
export function ScrollDepthTracker() {
  const pathname = usePathname();
  const firedForPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    function onScroll() {
      if (firedForPath.current === pathname) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;
      const progress = (window.scrollY / scrollable) * 100;
      if (progress >= 75) {
        firedForPath.current = pathname;
        track("scroll_75", { path: pathname || "" });
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
