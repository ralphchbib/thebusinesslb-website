import type { Access, FieldAccess } from "payload";

/** Public marketing content — anyone (including the unauthenticated Next.js app) can read. */
export const anyone: Access = () => true;

/** Admin or Editor can create/update; only Admin can delete or touch settings/navigation. */
export const adminOrEditor: Access = ({ req: { user } }) =>
  user?.role === "admin" || user?.role === "editor";

export const adminOnly: Access = ({ req: { user } }) => user?.role === "admin";

export const adminOnlyField: FieldAccess = ({ req: { user } }) => user?.role === "admin";
