import type { CollectionConfig } from "payload";
import { anyone, adminOnly } from "../access";

export const Navigation: CollectionConfig = {
  slug: "navigation-items",
  labels: { singular: "Navigation Item", plural: "Navigation" },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "menu", "href", "order"],
  },
  access: {
    read: anyone,
    // Navigation structure is Admin-only per the CMS spec — a mistake here
    // breaks the header/footer on every page of the site.
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: "menu",
      type: "select",
      required: true,
      options: [
        { label: "Header — primary nav", value: "header_primary" },
        { label: "Header — mega menu, column 1 (services)", value: "header_mega_col1" },
        { label: "Header — mega menu, column 2 (start here)", value: "header_mega_col2" },
        { label: "Footer — services column", value: "footer_services" },
        { label: "Footer — company column", value: "footer_company" },
        { label: "Footer — start here column", value: "footer_start_here" },
      ],
    },
    { name: "label", type: "text", required: true },
    { name: "href", type: "text", required: true },
    { name: "order", type: "number", defaultValue: 0 },
    { name: "isExternal", type: "checkbox", defaultValue: false },
  ],
};
