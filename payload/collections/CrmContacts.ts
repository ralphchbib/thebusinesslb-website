import type { CollectionConfig } from "payload";
import { readOwnCrmRecord, createOwnCrmRecord, updateOwnCrmRecord, deleteOwnCrmRecord } from "../access-crm";
import { noUpdateAfterCreate } from "../access-trust";

/**
 * Phase 16 — Blueprint §39 CRM Lite's address-book entity
 * (PHASE16-TECHNICAL-DESIGN.md §D/§E). Deliberately distinct from — and
 * never reusing — the existing `Leads` collection (Phase 7), which is
 * THE BUSINESS lb's own internal sales pipeline from the corporate
 * marketing site's Assessment/Contact/Quote forms, owned by staff. This
 * collection is a network *business account's own* customer address book,
 * owned by that account — a different domain entirely, hence the distinct
 * `crm-` slug prefix rather than any attempt to widen `Leads`.
 *
 * `networkAccount` is nullable by design (§H): a contact can be a real
 * Network member (linked via an accepted Connection) or a person/business
 * who has never registered at all (a phone inquiry, a walk-in, a
 * referral). `name`/`email`/`phone` are always denormalized, even when
 * `networkAccount` is set, so a contact survives intact if the linked
 * account is later deleted or anonymized — the same reasoning
 * `Messages.accountA`/`accountB` already uses for its own denormalized
 * copy.
 */
export const CrmContacts: CollectionConfig = {
  slug: "crm-contacts",
  labels: { singular: "CRM Contact", plural: "CRM Contacts" },
  admin: {
    group: "CRM",
    useAsTitle: "name",
    defaultColumns: ["name", "companyName", "source", "owner", "createdAt"],
  },
  access: {
    read: readOwnCrmRecord,
    create: createOwnCrmRecord,
    update: updateOwnCrmRecord,
    delete: deleteOwnCrmRecord,
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "network-accounts",
      required: true,
      access: { update: noUpdateAfterCreate },
      admin: { description: "The business account this contact belongs to. Set once at creation, never client-editable after." },
    },
    {
      name: "networkAccount",
      type: "relationship",
      relationTo: "network-accounts",
      access: { update: noUpdateAfterCreate },
      admin: { description: "Set only when this contact is a real Network member (via §H's Add to CRM flow). Null for a manually-entered, non-member contact." },
    },
    { name: "name", type: "text", required: true, maxLength: 150 },
    { name: "email", type: "text" },
    { name: "phone", type: "text" },
    { name: "companyName", type: "text", maxLength: 150 },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "manual",
      options: [
        { label: "Network Connection", value: "network-connection" },
        { label: "Market Posting Response", value: "market-posting" },
        { label: "Manual Entry", value: "manual" },
        { label: "Referral", value: "referral" },
        { label: "Other", value: "other" },
      ],
      access: { update: noUpdateAfterCreate },
    },
    {
      name: "originConnection",
      type: "relationship",
      relationTo: "connections",
      access: { update: noUpdateAfterCreate },
      admin: { description: "Provenance — set only when source is network-connection or market-posting (§H)." },
    },
  ],
};
