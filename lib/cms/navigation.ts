import { cache } from "react";
import { getCms } from "./client";
import type { PayloadNavigationItemDoc } from "./types";

export type NavMenu =
  | "header_primary"
  | "header_mega_col1"
  | "header_mega_col2"
  | "footer_services"
  | "footer_company"
  | "footer_start_here";

export interface NavItem {
  label: string;
  href: string;
}

// Wrapped in React's cache() — see the equivalent note in lib/cms/services.ts.
export const getNavItems = cache(async (menu: NavMenu): Promise<NavItem[]> => {
  const payload = await getCms();
  const result = await payload.find({
    collection: "navigation-items",
    where: { menu: { equals: menu } },
    sort: "order",
    depth: 0,
    limit: 50,
  });
  const docs = result.docs as unknown as PayloadNavigationItemDoc[];
  return docs.map((d) => ({ label: d.label, href: d.href }));
});
