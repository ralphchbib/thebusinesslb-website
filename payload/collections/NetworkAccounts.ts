import type { CollectionConfig } from "payload";
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
 * cookie. Verification (`/verify/:token`) is the one auth operation safe
 * to leave on the standard REST endpoint, since it never sets a cookie.
 *
 * admin.hidden — a network account must never appear in or authenticate
 * into Payload's /admin panel; that surface is for staff only.
 */
export const NetworkAccounts: CollectionConfig = {
  slug: "network-accounts",
  labels: { singular: "Network Account", plural: "Network Accounts" },
  admin: {
    hidden: true,
    useAsTitle: "email",
    defaultColumns: ["email", "accountType", "status"],
  },
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
  ],
};
