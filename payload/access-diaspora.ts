import type { Access } from "payload";
import { isStaff, isNetworkAccount } from "./access-network";

/**
 * Phase 18B — access control for `diaspora-declarations`
 * (PHASE18B-TECHNICAL-DESIGN.md §I). Deliberately the same shape as CRM
 * Lite's self-authored-only model (access-crm.ts) for write access — a
 * declaration is a statement about your own account, no counterparty
 * consent needed — but with public read instead of owner-only read, since
 * §C's entire purpose is discovery: a business can't browse diaspora
 * declarations, or vice versa, if only the declaring account could read
 * them.
 */

/** diaspora-declarations read — public, matching the Bridge Directory's discovery purpose. */
export const readPublicDeclaration: Access = () => true;

/**
 * diaspora-declarations create — any network account, but the submitted
 * `account` must actually be the acting account (same "don't trust a
 * client-supplied ownership claim" reasoning as `createConnection`/
 * `createPosting`). Account-type eligibility and declaration-side
 * validation happen server-side in the collection's own `beforeValidate`
 * hook (`payload/diaspora-eligibility.ts`), not here — this only guards
 * self-authorship.
 */
export const createOwnDeclaration: Access = ({ req: { user }, data }) => {
  if (isStaff(user)) return true;
  if (!isNetworkAccount(user)) return false;
  return String(data?.account) === String(user.id);
};

/** diaspora-declarations update — declaring account only, matching create's self-authorship requirement. No staff bypass on write, mirroring CRM Lite's own "staff support is read-only" scoping (PHASE16-TECHNICAL-DESIGN.md §J) — a declaration is the account's own statement, not something staff should edit on their behalf. */
export const updateOwnDeclaration: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { account: { equals: user.id } };
  return false;
};

/** diaspora-declarations delete — declaring account only (withdrawing a declaration entirely), same no-staff-bypass reasoning as update. */
export const deleteOwnDeclaration: Access = ({ req: { user } }) => {
  if (isNetworkAccount(user)) return { account: { equals: user.id } };
  return false;
};
