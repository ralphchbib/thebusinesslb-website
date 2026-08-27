import type { CollectionConfig, Endpoint, PayloadHandler } from "payload";
import { adminOnly } from "../access";
import { ownAccountOrStaff, staffOnlyCreate, staffOnlyField } from "../access-network";
import { siteConfig } from "@/lib/config";

/**
 * Phase 9A — the public-facing login identity for THE BUSINESS Network,
 * deliberately separate from the `users` collection (which is for
 * THE BUSINESS lb's own admin/editor staff). Blueprint v3 §51: "The
 * current Payload admin login is for authorized administrators. Public
 * users should receive a separate, simpler Network dashboard."
 *
 * `auth: true` reuses Payload's own password hashing, JWT signing, lockout
 * and verification/reset-token logic unchanged — no new auth library.
 * Login/logout/registration are NOT handled through the REST endpoints
 * this generates, though — see lib/network/session.ts and
 * PHASE9A-TECHNICAL-DESIGN.md §A.1 for why: Payload's session-cookie name
 * is a single global `cookiePrefix` value (verified against the installed
 * package source), so a second auth collection using the auto-generated
 * REST login would silently share — and overwrite — the `users` admin
 * cookie.
 *
 * §A.1's fix (a distinct `network-token` cookie + Bearer-bridge, see
 * lib/network/session.ts) only protects the app's own Server Actions,
 * though — PR #16's independent release review (PHASE9A-RELEASE-REVIEW.md,
 * finding D.1) found the collision was still live-reproducible by calling
 * Payload's auto-generated REST endpoints directly (`POST
 * /api/network-accounts/login` sets the exact same `payload-token` cookie
 * the `users` collection's login sets — confirmed with a real request, not
 * just source-reading), and that the same endpoints bypass this app's own
 * throttle protection entirely (confirmed on forgot-password). Fixed below
 * by shadowing those five endpoints with a blocking handler at the exact
 * same {method, path} — `handleEndpoints` resolves the first array match
 * (`node_modules/payload/dist/utilities/handleEndpoints.js`), and a
 * collection's own `endpoints` entries are placed before Payload's
 * auto-generated auth ones in the merged array
 * (`collections/config/sanitize.js`), so ours wins. `verify` is
 * deliberately left alone — it never sets a cookie, so it was never part
 * of the collision surface, and the app doesn't call it via REST anyway
 * (lib/network/verify.ts uses the Local API directly).
 *
 * admin.hidden — a network account must never appear in or authenticate
 * into Payload's /admin panel; that surface is for staff only.
 */
const blockedAuthOperation: PayloadHandler = async (req) => {
  console.warn(`[network-accounts:blocked-rest-auth-endpoint] ${req.method} ${req.url}`);
  return Response.json({ message: "Not found" }, { status: 404 });
};

const blockedAuthEndpoints: Endpoint[] = (
  ["login", "logout", "refresh-token", "forgot-password", "reset-password"] as const
).map((path) => ({
  path: `/${path}`,
  method: "post",
  handler: blockedAuthOperation,
}));

export const NetworkAccounts: CollectionConfig = {
  slug: "network-accounts",
  labels: { singular: "Network Account", plural: "Network Accounts" },
  admin: {
    hidden: true,
    useAsTitle: "email",
    defaultColumns: ["email", "accountType", "status"],
  },
  endpoints: blockedAuthEndpoints,
  auth: {
    verify: {
      generateEmailSubject: () => `Verify your ${siteConfig.name} Network account`,
      generateEmailHTML: ({ token, user }) => {
        const name = typeof user?.name === "string" && user.name ? user.name : "there";
        const verifyUrl = `${siteConfig.url}/verify-email?token=${token}`;
        return `
          <p>Hi ${name},</p>
          <p>Confirm your email address to activate your ${siteConfig.name} Network account.</p>
          <p><a href="${verifyUrl}">Verify my email</a></p>
          <p>If you didn't create this account, you can ignore this email.</p>
        `;
      },
    },
    forgotPassword: {
      generateEmailSubject: () => `Reset your ${siteConfig.name} Network password`,
      generateEmailHTML: ({ token, user } = {}) => {
        const name = typeof user?.name === "string" && user.name ? user.name : "there";
        const resetUrl = `${siteConfig.url}/reset-password?token=${token}`;
        return `
          <p>Hi ${name},</p>
          <p>Click below to choose a new password for your ${siteConfig.name} Network account.</p>
          <p><a href="${resetUrl}">Reset my password</a></p>
          <p>If you didn't request this, you can ignore this email — your password won't change.</p>
        `;
      },
    },
  },
  access: {
    read: ownAccountOrStaff,
    create: staffOnlyCreate,
    update: ownAccountOrStaff,
    delete: adminOnly,
  },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user?.status === "suspended") {
          throw new Error("This account has been suspended.");
        }
      },
    ],
    beforeChange: [
      // Phase 17 — PHASE17-TECHNICAL-DESIGN.md §F/§G: auto-stamps the audit
      // trail when staff grants/revokes institutional Market Pulse access,
      // the same "side-effect only, sets a derived field on a state
      // transition" shape CrmLeads.ts's `closedAt` hook already established
      // (its `access.update: noUpdateAfterCreate` field guard is what makes
      // this the ONLY path either field can ever change through — staff
      // toggles `marketPulseAccessGranted`, never these two directly).
      ({ data, originalDoc, operation, req }) => {
        if (operation !== "update") return data;
        const nextGranted = data?.marketPulseAccessGranted;
        if (nextGranted === undefined) return data;
        const prevGranted = originalDoc?.marketPulseAccessGranted ?? false;
        if (nextGranted === prevGranted) return data;
        if (nextGranted) {
          // `req.user` is typed by Payload's generated per-collection types,
          // which don't include the runtime-only `collection` discriminator
          // — the same gap access-network.ts's `isStaff`/`isNetworkAccount`
          // already cast around.
          const actingUser = req.user as unknown as { collection?: string; id?: string | number } | null | undefined;
          data.marketPulseAccessGrantedAt = new Date().toISOString();
          data.marketPulseAccessGrantedBy = actingUser?.collection === "users" ? actingUser.id : null;
        } else {
          data.marketPulseAccessGrantedAt = null;
          data.marketPulseAccessGrantedBy = null;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "Person name for Professional/Consumer/Diaspora accounts; organization name for Business/Institution.",
      },
    },
    {
      name: "accountType",
      type: "select",
      required: true,
      options: [
        { label: "Business", value: "business" },
        { label: "Professional", value: "professional" },
        { label: "Consumer", value: "consumer" },
        { label: "Institution", value: "institution" },
        { label: "Diaspora", value: "diaspora" },
      ],
      admin: {
        description: "Set once at registration. No self-service account-type change in Phase 9A.",
      },
      access: {
        // Set at create time by the registration action; only staff can
        // correct it afterward (support use), never the account itself.
        update: staffOnlyField,
      },
    },
    {
      name: "diasporaCountry",
      type: "text",
      admin: {
        condition: (_, siblingData) => siblingData?.accountType === "diaspora",
        description: "Country of residence — captured for the future Diaspora Bridge (Blueprint v3 §33, Release 5).",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
      ],
      access: {
        update: staffOnlyField,
      },
      admin: {
        description: "Suspended accounts cannot log in. Groundwork for Phase 9's reactive-moderation model.",
      },
    },
    {
      name: "messageEmailNotifications",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Phase 12 — Blueprint §56: \"Users must control communications and notifications.\" Gates the new-message email only; owner-editable via /dashboard/settings.",
      },
    },
    {
      name: "marketPulseAccessGranted",
      type: "checkbox",
      defaultValue: false,
      access: { update: staffOnlyField },
      admin: {
        description: "Phase 17 — Blueprint §37 \"Paid Institutional Dashboards.\" Staff-granted only (no self-service, no billing integration in this phase — see PHASE17-TECHNICAL-DESIGN.md §F). Only meaningful when accountType is 'institution'; the read-access gate in access-market-pulse.ts checks both.",
      },
    },
    {
      name: "marketPulseAccessGrantedAt",
      type: "date",
      access: { update: () => false },
      admin: { description: "Set automatically when a staff member checks marketPulseAccessGranted above — never client-writable directly, including by staff. Audit trail." },
    },
    {
      name: "marketPulseAccessGrantedBy",
      type: "relationship",
      relationTo: "users",
      access: { update: () => false },
      admin: { description: "The staff user who granted institutional Market Pulse access — set automatically, never client-writable directly. Audit trail." },
    },
  ],
};
