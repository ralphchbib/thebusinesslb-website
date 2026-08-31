import type { CollectionConfig } from "payload";
import { readPublicDeclaration, createOwnDeclaration, updateOwnDeclaration, deleteOwnDeclaration } from "../access-diaspora";
import { noUpdateAfterCreate } from "../access-trust";
import { assertDeclarationEligibility } from "../diaspora-eligibility";

/**
 * Phase 18B — Blueprint §33 (Diaspora Bridge), §4.6 (Lebanese Diaspora)
 * (PHASE18B-TECHNICAL-DESIGN.md §C/§D). A standing declaration of intent —
 * one row per account, self-authored, publicly readable for discovery.
 * Deliberately the smallest new surface this phase adds: everything that
 * actually happens after a declaration is discovered (request, approval,
 * introduction, messaging) reuses `Connections`/`Conversations`/`Messages`
 * unmodified — see `Connections.ts`'s own header for the two optional
 * fields this phase adds there instead of inventing a parallel "Bridge
 * Request" object.
 *
 * `declarations` is a closed multi-select spanning both sides of §33's
 * list — which side an account may select from is validated server-side in
 * `beforeValidate` (`payload/diaspora-eligibility.ts`), never trusted from
 * client input, mirroring `InstitutionMemberships`' own
 * `assertAccountType` precedent.
 */
export const DiasporaDeclarations: CollectionConfig = {
  slug: "diaspora-declarations",
  labels: { singular: "Diaspora Declaration", plural: "Diaspora Declarations" },
  admin: {
    group: "Network",
    useAsTitle: "id",
    defaultColumns: ["account", "declarations", "updatedAt"],
  },
  indexes: [{ fields: ["account"], unique: true }],
  access: {
    read: readPublicDeclaration,
    create: createOwnDeclaration,
    update: updateOwnDeclaration,
    delete: deleteOwnDeclaration,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data;
        if (operation === "create" || data.declarations !== undefined) {
          const accountId = data.account ?? (originalDoc as { account?: unknown } | undefined)?.account;
          await assertDeclarationEligibility({ req, accountId, declarations: data.declarations ?? (originalDoc as { declarations?: unknown } | undefined)?.declarations });
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "account",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "The declaring account. Must be business, professional, or diaspora — validated server-side, never trusted from client input." },
    },
    {
      name: "declarations",
      type: "select",
      hasMany: true,
      required: true,
      options: [
        { label: "Seeking buyers", value: "seeking-buyers" },
        { label: "Seeking distributors", value: "seeking-distributors" },
        { label: "Export ready", value: "export-ready" },
        { label: "Seeking mentors", value: "seeking-mentors" },
        { label: "Open to partnerships", value: "open-to-partnerships" },
        { label: "Available for remote services", value: "available-remote" },
        { label: "Can mentor", value: "can-mentor" },
        { label: "Can distribute", value: "can-distribute" },
        { label: "Can introduce buyers", value: "can-introduce-buyers" },
        { label: "Looking for suppliers", value: "looking-for-suppliers" },
        { label: "Want to hire Lebanese talent", value: "want-hire-lebanese-talent" },
        { label: "Want to discover Lebanese products", value: "want-discover-products" },
      ],
      admin: { description: "Blueprint §33 — which side's options are valid depends on the declaring account's own accountType, enforced server-side." },
    },
    { name: "note", type: "textarea", maxLength: 500, admin: { description: "Optional free text, e.g. \"Based in Montreal, focused on food & beverage exports.\"" } },
  ],
};
