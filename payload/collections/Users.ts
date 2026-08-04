import type { CollectionConfig } from "payload";

/**
 * Phase 1 role model: exactly two roles, per the approved CMS architecture
 * decision. Admin can do everything; Editor can edit content but not
 * users, site settings, or navigation.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "role"],
  },
  access: {
    // Admins can list every account; editors can only read their own —
    // returning a `Where` constraint (rather than a plain boolean) scopes
    // the query instead of exposing every admin/editor's email to anyone
    // logged in. Payload's own admin-panel UI (e.g. "logged in as") still
    // works for editors since it reads the current user directly, not
    // through this list query.
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return { id: { equals: user.id } };
    },
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => user?.role === "admin",
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      access: {
        // Only an existing admin can change someone's role — an editor
        // can't promote themselves.
        update: ({ req: { user } }) => user?.role === "admin",
      },
    },
  ],
};
