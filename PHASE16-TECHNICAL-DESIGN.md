# Phase 16 Technical Design — CRM Lite

**Status: design only.** No code was written, no branch was created, no PR was opened for this document. Per instruction, this is a design artifact to be reviewed before any implementation work begins.

**Source of truth:** `Master Plan/THE_BUSINESS_Network_Blueprint_v3.docx`, read in full for this document (extracted directly from the docx and searched, not recalled from memory). `PHASE13-COMPLETION-REPORT.md`, `PHASE14-COMPLETION-REPORT.md`, and `PHASE15-COMPLETION-REPORT.md` were also read fresh. Every collection, field, and access-control function cited below was verified against the current codebase (`payload/collections/Connections.ts`, `Conversations.ts`, `Messages.ts`, `MarketPostings.ts`, `NetworkAccounts.ts`, `Leads.ts`, `payload/access-network.ts`), not assumed from memory of earlier phases.

---

## A. Executive Summary

The Network now has everything a lead-generation engine needs — Connections (Phase 12, mutual, reason/value/outcome-structured), Conversations and Messages (Phase 12), and Market Postings with a Respond flow that creates Connections carrying `originPosting` provenance (Phase 13) — but nothing a business does *with* an inbound relationship once it exists. The only trace of commercial follow-up anywhere in the schema today is a single boolean: `Conversations.businessContacted`. Its own code comment names exactly what this phase is:

> "`businessContacted` is the explicit seam for a future CRM Lite promotion (§39, deliberately not built here) — a simple boolean for this phase, not yet the New/Qualified/Contacted/... pipeline."

This document designs **CRM Lite** (Blueprint §39): a private, ownership-scoped workspace where a business account manages leads, contacts, a seven-stage pipeline, follow-up tasks, and notes — built entirely on top of data the platform already has, with zero new external dependencies and zero new staff roles. It is deliberately **not** a rebuild of Connections/Conversations/MarketPostings — those stay exactly as they are; CRM Lite is a layer a business account can *promote* an existing relationship into, or seed manually for a contact who was never a Network member at all.

Also disambiguated up front, because the codebase already has a same-named trap: this project's existing `Leads` collection (Phase 7) is THE BUSINESS lb's **own internal sales pipeline** — Assessment/Contact/Quote submissions from the *corporate marketing site*, owned by `adminOrEditor` staff. Blueprint §39 CRM Lite is a **network business account's own customer pipeline** — a completely different owner, a completely different access model, and (per this design) a completely different, distinctly-named collection family. Reusing or extending `Leads.ts` for this phase would be a genuine naming/ownership collision, not just a style choice — see §D.

**Recommendation: Go**, scoped as designed in §C–§L. §Alternative Analysis compares this against Market Pulse and recommends CRM Lite as the next phase on dependency, complexity, and Blueprint release-sequence grounds.

## B. Blueprint Alignment

Verbatim, the sections this phase is grounded in:

**§39, CRM Lite — the section this phase implements, in full:**
> "Business subscribers can manage leads, contacts, customers, opportunities, tasks, notes, follow-up reminders, lead sources, deal statuses and basic reporting. The pipeline stages are: New, Qualified, Contacted, Proposal Sent, Negotiating, Won, Lost."
>
> "The objective is not to compete with large enterprise CRM systems. It is to give SMEs a straightforward workspace for managing Network inquiries."

That closing line is load-bearing for this whole design: every "should we add X" decision below (team seats, drip email automation, custom pipeline stages, multi-currency deal value) is resolved by asking whether it serves "a straightforward workspace for managing Network inquiries" or starts drifting toward "enterprise CRM system." The answer is consistently no, and §D–§L are scoped accordingly.

**§5, Complete Ecosystem Structure — the MANAGEMENT pillar CRM Lite belongs to:**
> "MANAGEMENT: Lead Inbox, CRM Lite, Contacts, Proposals, Appointments, Reviews, Analytics"

Lead Inbox, Contacts, and Analytics are named as siblings of CRM Lite in the same pillar — this design treats "Lead Inbox" as CRM Lite's entry surface (§L) and "Contacts" as one of its core collections (§D), rather than separate undertakings. Proposals and Appointments (Blueprint §40/§41) are explicitly out of scope for this phase — see the EXCLUDE-adjacent note in §D.

**§43, Membership Plans — CRM Lite's named commercial home:**
> "Business Growth — $49–$99/month — CRM Lite, proposal builder, advanced analytics, loyalty tools, branch management, priority matching, monthly report."

CRM Lite is the headline feature of a specific, already-named paid tier. No billing/plan-enforcement infrastructure exists anywhere in this codebase today (`PHASE13-COMPLETION-REPORT.md`'s Remaining Blueprint Work: "Payments/monetization — no pricing enforcement, paid tiers, or billing integration on the network side," unchanged through Phase 14/15). This phase does not build that infrastructure — Monetization is explicitly excluded from this task's scope — so this design makes CRM Lite available to every business account and flags plan-gating as deliberately deferred (§N).

**§53, Recommended Release Sequence — where this sits relative to everything already shipped:**
> "Release 3 — Engagement and SaaS: Analytics, AI tools, booking, lead inbox, opportunity alerts, paid plans."

Releases 1 (Identity and Discovery), 2 (Trust), and most of 4 (Market Connections — Connections/Messaging/Market Postings, Phases 12–13) are already shipped. CRM Lite's home release (3) sits *before* Release 5 (Market Infrastructure, which includes Market Pulse) — this is the decisive input to the Alternative Analysis below.

**§52, What to Build This Month** lists CRM Lite under "Build Interface, Label Coming Soon" — a feature the Blueprint always intended to land after the identity/trust/connection layers it depends on were real, which they now are.

**What already exists, checked directly against the running code:**

| Blueprint concept | Current state |
|---|---|
| Lead source: direct connection (§34 Business Circles) | `Connections` (Phase 12): mutual, `reason`/`valueOffered`/`expectedOutcome` required, `status` (pending/accepted/declined), normalized `accountA`/`accountB` pair, `requestedBy`. |
| Lead source: Market Posting response (§18) | `Connections.originPosting` (Phase 13, nullable) — set when a Connection was created by responding to a `market-postings` listing. |
| Messaging (§39 "Network inquiries") | `Conversations` (1:1 with an accepted `Connection`) + `Messages`. `Conversations.businessContacted` — **the explicit, already-built seam for this phase**, per its own code comment. |
| Contacts / Customers (§39) | Does not exist. A business today has no address book — only a live list of accepted `Connections`, with no way to add a note, tag a source, or track a contact who was never a Network member. |
| Pipeline / deal statuses (§39) | Does not exist anywhere in the schema. `MarketPostings.status` (active/fulfilled/expired/closed) is a **public listing lifecycle**, not a private deal pipeline — see §F/§G for why these must not be conflated. |
| Tasks / follow-up reminders (§39) | Does not exist. No task/reminder collection anywhere in the codebase. |
| Notes (§39) | Does not exist as a first-class entity. |
| Lead source tracking (§39) | Does not exist as a field; only implicitly derivable today from whether a `Connection.originPosting` is set. |
| Basic reporting (§39) | Does not exist for network business accounts. (Phase 15 established a *staff-facing* reporting pattern — Payload admin list-view sort/filter/group — but CRM Lite reporting must be business-facing, on the dashboard, which is a new UI surface — see §L.) |
| `Leads` collection (Phase 7) | Exists, but is **THE BUSINESS lb's own internal sales pipeline** (Assessment/Contact/Quote submissions from the corporate marketing site), owned by `adminOrEditor` staff. Not the same domain, not reusable — see §D. |

Conclusion: this phase is not speculative scope-invention. Every core entity (leads, contacts, pipeline, tasks, notes) is named explicitly in Blueprint §39, and the seam to build it on (`businessContacted`) was left in the codebase by name, in a code comment, specifically anticipating this phase.

## C. CRM Architecture

CRM Lite is designed as a **thin, ownership-scoped layer bolted onto existing infrastructure**, not a parallel relationship system. The guiding precedent is Phase 13's own reasoning for reusing `Connections`/`Conversations` rather than inventing a parallel response mechanism for Market Postings — the same "everything downstream is inherited unmodified" principle applies here in the other direction: CRM Lite consumes Connections/Conversations/MarketPostings as read-only source material and adds nothing to their access-control surface.

```
Existing relationship layer (Phases 12–13, unmodified by this phase)
┌─────────────────────────────────────────────────────────────────┐
│  Connections  (mutual, structured intro, originPosting)           │
│  Conversations (1:1 thread, businessContacted seam)                │
│  MarketPostings (public offer/need board)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  owner-triggered "Add to CRM"
                              │  (never automatic — see §H)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CRM Lite layer (new, this phase)                                  │
│                                                                      │
│  CrmContacts  ──1:N──▶  CrmLeads  ──1:N──▶  CrmActivity            │
│       │                      │                                     │
│       └──────────1:N─────────┴──────────────▶  CrmTasks            │
└─────────────────────────────────────────────────────────────────┘
```

Two architectural decisions, stated up front because they resolve most of the "should X be a separate collection" questions in §D:

1. **A "Lead" and an "Opportunity" are the same object, at different lifecycle points.** Blueprint §39 lists "leads... opportunities" as if they were separate nouns, but gives exactly one pipeline (`New → ... → Won/Lost`) for both. Building two collections for what is mechanically one state machine would contradict the section's own closing instruction not to over-build. This design treats `CrmLeads` as the single pipeline entity; "Customer" is not a separate row type but a saved view/filter (`stage: Won`) over the same collection — the standard shape for an SME-scale CRM, and the one Blueprint's own single pipeline-stage list implies.
2. **A "Contact" always exists independently of any Lead**, the same way a real address book works: a business can have a contact with no open pursuit (a past customer, someone they met but haven't pitched yet), and a contact can accumulate multiple Leads over time (a repeat customer pursued for a second project). `CrmContacts` is therefore the durable identity; `CrmLeads` is the disposable-per-deal pipeline row referencing it — never the other way around.

## D. Collections Required

Four new collections, all under a `crm-` slug prefix to make the domain boundary unmistakable in the admin sidebar and in code — deliberately not reusing or extending the existing `Leads` collection (Phase 7's internal sales pipeline; see §B) or `ContentReports`/`ModerationAuditLog` (staff-domain governance infrastructure with an entirely different, role-based access model — see §J for why CRM Lite's ownership-based model cannot be layered onto that infrastructure without recreating Phase 14's `isStaff()` over-broadening mistake in reverse).

| Collection | Purpose | Owner |
|---|---|---|
| `CrmContacts` | The durable address-book entry — a specific person/organization a business tracks, whether or not they're a Network member. | `network-accounts` (the business) |
| `CrmLeads` | The pipeline entity — one row per active or closed pursuit of a contact. This is Blueprint's "lead"/"opportunity"/"customer" (via stage), unified per §C. | `network-accounts` (the business) |
| `CrmActivity` | An append-only, per-contact-or-lead timeline: manually logged notes, plus system-logged stage-change entries. Serves both "Notes" and "Contact Timeline" from the EVALUATE list — see §C's reasoning against building two collections for what is one reverse-chronological feed. | `network-accounts` (the business) |
| `CrmTasks` | Follow-up tasks and reminders, optionally linked to a Lead and/or a Contact. | `network-accounts` (the business) |

**Deliberately not built this phase** (per the EXCLUDE list and §39's own "not enterprise CRM" instruction):

- **Proposals/Quotations** (Blueprint §40) — a distinct Blueprint section with its own PDF-export and client-approval-link requirements; a natural *future* consumer of `CrmLeads` (a proposal would attach to a Lead), but out of this phase's scope.
- **Team seats / multi-user CRM access** — Blueprint §43 lists "team seats" as a separate paid capability; every dashboard action in this codebase today is single-account-scoped (no delegated staff-login concept exists for network accounts at all), and introducing one here would be new authentication infrastructure, not CRM design. `CrmContacts`/`CrmLeads` are owned by the network account itself, full stop.
- **Custom/configurable pipeline stages** — the seven stages are Blueprint-fixed; making them per-business-configurable is exactly the enterprise-CRM direction §39 warns against.

## E. Data Model

```
CrmContacts
  id
  owner                 relationship → network-accounts   required, immutable after create
  networkAccount         relationship → network-accounts   nullable — set when the contact IS a
                                                             Network member (see §H)
  name                    text                              required (denormalized even when
                                                             networkAccount is set, so a contact
                                                             survives if the linked account is
                                                             later deleted/anonymized)
  email                   text                              optional
  phone                   text                              optional
  companyName             text                              optional
  source                  select                            network-connection | market-posting |
                                                             manual | referral | other
  originConnection        relationship → connections        nullable, set only when source is
                                                             network-connection or market-posting
                                                             (provenance chain — see §H)
  createdAt / updatedAt

CrmLeads
  id
  owner                   relationship → network-accounts   required, immutable after create
  contact                 relationship → crm-contacts        required, immutable after create
  title                   text                              required (e.g. "Website redesign — Q3")
  stage                   select                            new | qualified | contacted |
                                                             proposal-sent | negotiating |
                                                             won | lost
                                                             default: new
  estimatedValue           number                            optional, no currency enforcement
                                                             this phase (see §N)
  lostReason               text                              optional, shown only when stage=lost
  closedAt                 date                              set automatically on transition into
                                                             won or lost (see §F)
  createdAt / updatedAt

CrmActivity
  id
  owner                   relationship → network-accounts   required, immutable after create
  contact                 relationship → crm-contacts        required, immutable after create
  lead                     relationship → crm-leads           nullable — set when the entry is
                                                             lead-specific rather than contact-level
  entryType                select                            note | stage-change | system
  body                     textarea                          required for `note`; system-generated
                                                             for `stage-change`/`system`
  createdAt

CrmTasks
  id
  owner                   relationship → network-accounts   required, immutable after create
  contact                 relationship → crm-contacts        nullable
  lead                     relationship → crm-leads           nullable (at least one of
                                                             contact/lead required — validated
                                                             at the hook level, mirroring
                                                             VerificationEvidence's owner/
                                                             field-presence validation pattern)
  title                    text                              required
  dueAt                    date                              required
  status                   select                            open | done | dismissed
                                                             default: open
  reminderSentAt            date                              set once an email reminder has
                                                             fired, preventing duplicate sends
  createdAt / updatedAt
```

Relationships are kept shallow and reference-only, matching the existing codebase's own established discipline (`Messages.conversation` references rather than duplicates; `Conversations.connection` references rather than copies). `CrmActivity` never duplicates message content from `Messages` — a lead's timeline can *reference* its originating conversation (via `contact.originConnection → conversation`, resolved live) without copying any message body into CRM storage.

## F. Pipeline Design

The seven stages are exactly Blueprint §39's list, in order, with two forward-only transition rules — the only pipeline logic this phase enforces server-side, deliberately minimal:

```
New → Qualified → Contacted → Proposal Sent → Negotiating → Won
                                                            → Lost
```

- **`won` and `lost` are terminal.** No transition out of either is permitted (mirrors `MarketPostings`' `active → closed/fulfilled` terminal-state precedent, `payload/access-market.ts`'s `statusTransitionFieldAccess`). Re-opening a lost deal is a *new* `CrmLeads` row against the same `CrmContact` — this is deliberate, not an oversight: it keeps win/loss reporting (§L) honest by never letting a "Lost" statistic silently un-happen, and it matches how a repeat pursuit of the same contact is already modeled (§C).
- **Stages otherwise move freely, including backward.** Unlike verification/moderation workflows, a sales pipeline is not a governance process — there is no segregation-of-duties concern (single owner, no adversarial second party), so this phase does not gate stage transitions behind any approval step. A business moving a lead from "Negotiating" back to "Qualified" because a prospect went quiet is normal CRM usage, not something to prevent.
- **Every transition writes a `CrmActivity` entry** (`entryType: stage-change`, system-generated body e.g. "Moved from Qualified to Contacted"), automatically, in the same `beforeChange`/`afterChange` hook that performs the transition — this is what makes the Contact Timeline (§C) a real, complete record without the business having to remember to log anything.
- **`closedAt` is set automatically** on the transition into `won` or `lost`, never client-writable directly — mirrors `VerificationRequests.revokedAt`'s "hook-set, never client-editable" pattern.

## G. Opportunity Integration

This section exists specifically to prevent a real conflation risk: the codebase already has a dashboard route named `/dashboard/opportunities`, and it is **Phase 13's Market Postings board**, not a CRM pipeline. Blueprint itself uses "Opportunities" for two different things — the public OPPORTUNITIES pillar (§5: Jobs, Freelance Projects, Customer Requests, Supplier Requests, Partnerships, Tenders — a public marketplace surface) and the private "opportunities" noun inside §39's CRM prose (which this design has already resolved as = `CrmLeads`, §C).

**These stay two separate concepts with two separate lifecycles, deliberately not merged:**

| | `MarketPostings.status` (Phase 13, unchanged) | `CrmLeads.stage` (this phase) |
|---|---|---|
| What it tracks | Is this **public listing** still open for new respondents | Is **this business's private pursuit** of one respondent progressing |
| Who sees it change | Anyone browsing `/network/opportunities` | Only the owning business |
| Cardinality | One posting → many possible respondents | One respondent (via a `Connection`) → at most one *active* Lead per pursuit, but a new Lead can be opened later (§F) |
| Values | active / fulfilled / expired / closed | new / qualified / ... / won / lost |

A single Market Posting can legitimately have several respondents at once, each becoming an independent `CrmLead` in the poster's pipeline, progressing at different rates — while the posting itself stays `active` until the owner explicitly closes or fulfills it (unaffected by any individual Lead's stage). No code path in this design ever writes to `MarketPostings.status` from CRM logic, and none ever reads `CrmLeads.stage` to decide a posting's public state.

## H. Connection Integration

A `Connection` becomes CRM Lite's primary lead-source, via one explicit, owner-triggered action — **never automatic**. Auto-creating a Lead for every accepted connection would be noisy (many connections are non-commercial relationship-building, not sales pursuits) and would contradict Blueprint §58's "Introduction Economy" framing of connections as purposeful but not presumptively transactional.

**"Add to CRM" flow**, available on any `accepted` Connection the business account is party to:

1. If no `CrmContacts` row exists yet for the other party's `network-accounts` id (scoped to this owner — see §J), create one: `networkAccount` set, `name`/`email` denormalized from the account, `source` set from whether `Connection.originPosting` is set (`market-posting`) or not (`network-connection`), `originConnection` set to this Connection.
2. Create a `CrmLeads` row: `contact` = the (new-or-existing) contact, `stage: new`, `title` defaulted from the connection's `connectionType`/`reason` (editable immediately after).
3. Set `Conversations.businessContacted = true` on the associated conversation (if one exists) — this keeps the existing pre-CRM signal consistent for any other surface that already reads it (§I), rather than leaving two systems telling different stories about the same relationship.

A `CrmContact` can also be created **manually**, with `networkAccount` left null and `source: manual` or `referral` — covering the address-book case explicitly named in §39 ("contacts, customers") for a person or business who has never registered on the Network at all (a phone inquiry, a walk-in customer, a referral from an existing client).

## I. Messaging Integration

`Conversations.businessContacted` is not removed or repurposed by this phase — it remains the lightweight signal available to *every* business account, including one that never adopts CRM Lite (recall §N: no plan-gating exists yet, but the design should not assume every business wants the fuller workspace even once gating exists). CRM Lite subscribers get the richer pipeline; everyone else keeps the boolean they already have, and §H keeps the two in sync one direction (CRM → boolean) so a business that starts using CRM Lite on some conversations and not others never sees a contradictory "not contacted" flag on a conversation it has actively promoted to a Lead.

Within a Lead's detail view (§L), the associated `Conversation`/`Messages` thread is shown by reference (a live query through `CrmContacts.originConnection → conversations.connection`), never copied into CRM storage — consistent with §E's "reference, don't duplicate" rule and avoiding any risk of the CRM timeline drifting out of sync with the actual message history.

## J. Access Control Model

CRM Lite's access model is deliberately the *simplest* of any phase in this project's history, for a structural reason: unlike `Connections`/`Appeals`/`ModerationCases`, every CRM Lite collection is **one-sided by design**. A `Connection` needs both parties to read it (it's mutual); a `CrmLead` about a prospect is the *seller's* private tool, and the prospect has no legitimate reason to ever see it — there is no "other side" access grant to design at all, which removes an entire category of bugs this project has repeatedly found and fixed elsewhere (Phase 14's segregation-of-duties gap, Phase 15's stale-review-note bug — both arose from multi-party state).

Following `payload/access-network.ts`'s existing `ownAccountOrStaff` shape exactly (no new pattern invented):

| Collection | `read` | `create` | `update` | `delete` |
|---|---|---|---|---|
| `CrmContacts` | Owner only, or staff (`isStaff()`, support purposes) | Owner (self, matching `MarketPostings.owner`'s `noUpdateAfterCreate` field guard) | Owner only; `owner` field immutable after create | Owner only, hard delete (matches `MarketPostings`' precedent — a mistaken manual contact entry should be fully removable, not status-flagged) |
| `CrmLeads` | Owner only, or staff | Owner (self); `contact` must belong to the same owner (validated server-side, not trusted from client) | Owner only; `owner`/`contact` immutable after create | Owner only, hard delete |
| `CrmActivity` | Owner only, or staff | Owner (self) for `note` entries; system-only (`overrideAccess`, from the stage-change hook) for `stage-change`/`system` entries — mirrors `Conversations`' `denyCreate`-then-hook-only pattern | Deny — append-only, matching `ModerationAuditLog`'s immutability precedent, scoped down to owner-domain rather than staff-domain | Deny (append-only) |
| `CrmTasks` | Owner only, or staff | Owner (self) | Owner only; `owner` immutable | Owner only, hard delete |

No new `Users.role` value is introduced. Staff read access is included only for support-ticket investigation (mirroring `isStaff()`'s existing reach into `Reviews`/`Messages`/`MarketPostings` for moderation purposes) and is explicitly **read-only, never write** — staff should never be able to edit a business's own pipeline data.

## K. Security Model

- **Cross-account isolation is the only property that actually matters here**, and it reduces to one check repeated four times: every query and mutation is scoped to `owner == req.user.id` (network account) or `isStaff(req.user)`, with no exceptions. There is no cross-account read path to design defensively against, unlike Evidence/Appeals/ModerationCases — there is no second party to isolate *from* the first (§J).
- **`contact`/`lead` ownership must be re-validated server-side on every write that references them**, not trusted from client input — e.g. creating a `CrmLead` with a `contact` id must confirm that contact's `owner` matches the acting account, exactly the class of check `access-market.ts`'s hard-delete function re-derives server-side rather than trusting the UI (Phase 13's own precedent, called out explicitly in `PHASE13-COMPLETION-REPORT.md`'s Security Findings). Skipping this would let account A attach a lead to account B's contact by guessing an id.
- **No new PII is collected.** `CrmContacts.name`/`email`/`phone` for a linked Network member is a denormalized copy of data the business could already see via the accepted `Connection`; for a manual entry, it's data the business is entering about someone it already has an offline relationship with — no new consent surface is introduced (contrast Blueprint §42 Loyalty's explicit "consumers must opt in" requirement, which does not apply here since CRM Lite has no outbound communication feature this phase — see §N).
- **Reminder emails (`CrmTasks`) go to the business account itself, never to the contact.** This phase builds no contact-facing messaging — no drip campaigns, no automated outreach — deliberately, both because it's out of Blueprint §39's stated scope and because Blueprint §56's "Users must control communications and notifications" principle would require a real opt-in model this phase doesn't build. A future phase that wants CRM-driven contact-facing email needs its own design pass against that principle.
- **Deliberately no plan-gating this phase** (§B/§N) — every business account gets CRM Lite. This is a real, disclosed scope decision, not an oversight: building enforcement against a plan concept with zero actual billing infrastructure behind it would be unverifiable theater, not real gating.

## L. Dashboard Requirements

New surface: `/dashboard/leads`, added to the Business Dashboard's route set (Blueprint §38's own dashboard-sections list already names "Leads" — this design fills that named, previously-unbuilt section, distinct from the existing `/dashboard/opportunities` route which stays as Phase 13's Market Postings board, per §G).

| View | Purpose |
|---|---|
| **Pipeline board** (`/dashboard/leads`) | Kanban-style, one column per stage (§F), leads as cards showing contact name, title, estimated value. Drag-or-click stage transitions call the same server-side transition logic §F describes — no client-side-only stage changes. |
| **Contacts** (`/dashboard/leads/contacts`) | Flat, searchable address-book list; "Add contact" (manual entry, §H) and, on any accepted Connection elsewhere in the dashboard, an "Add to CRM" action (§H) that lands here plus a new pipeline card. |
| **Lead detail** (`/dashboard/leads/[id]`) | Contact info, stage control, estimated value, the Contact Timeline (`CrmActivity`, newest first — notes and stage-changes interleaved), a note-composer, linked conversation reference (§I), and this lead's open/done `CrmTasks`. |
| **Tasks / Follow-ups** (`/dashboard/leads/tasks`) | Flat list of open tasks across all leads/contacts, sorted by `dueAt` — the "what do I need to do today" surface Blueprint's "follow-up reminders" names directly. |
| **Basic reporting** (a panel on the pipeline board, not a separate page) | Lead count per stage, win rate (`won / (won + lost)` over closed leads), and average time-in-stage-to-close — all computed live from existing fields, no new aggregation infrastructure, matching §39's explicit "basic reporting," not an analytics platform. |

## M. Validation Plan

This section describes the plan for the implementation phase that would follow approval of this design — nothing here has been executed, per this phase's design-only scope.

**Automated:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` — the same four-gate baseline every prior phase has run clean.

**Live production validation**, following this project's established methodology (real accounts, real REST/UI exercise, no mocking) once implemented:

- Contact creation (manual and via "Add to CRM" from a real accepted Connection) and correct `source`/`originConnection` provenance.
- Full pipeline traversal for one lead (`new → qualified → contacted → proposal-sent → negotiating → won`) confirming a `CrmActivity` stage-change entry is written at every step, and `closedAt` is set only on the terminal transition.
- Terminal-state enforcement: an attempt to transition a `won`/`lost` lead to any other stage is correctly rejected server-side, not merely hidden in the UI (matching `MarketPostings`' proven verification technique).
- Cross-account isolation: a second network account cannot read, list, or write any of a first account's `CrmContacts`/`CrmLeads`/`CrmActivity`/`CrmTasks` via direct REST — including guessing a real id (the single highest-value check, per §K).
- `contact`/`lead` cross-ownership rejection: an attempt to attach a `CrmLead` to another account's `CrmContact` id is rejected server-side.
- `CrmActivity` immutability: `PATCH`/`DELETE` against a `stage-change` or `note` entry both correctly return `403` for every actor including the owner.
- Task reminder: a task with `dueAt` in the past correctly triggers exactly one reminder email, and `reminderSentAt` correctly prevents a duplicate on a second check.
- Regression sweep: Connections, Conversations, Messages, MarketPostings, and every other Phase 9–15 surface continue to function unmodified (this phase touches none of their files).

## N. Risk Assessment

| Risk | Assessment | Mitigation |
|---|---|---|
| No plan-gating (§K) — every business gets a paid-tier feature free | Real, deliberate, disclosed | Explicitly out of this phase's scope (Monetization excluded); flagged for a dedicated billing-and-gating phase once payment infrastructure exists anywhere in the codebase |
| Confusing `MarketPostings.status` with `CrmLeads.stage` | Real, but structurally mitigated | §G draws the boundary explicitly in code comments and this design; no shared field, no shared code path between the two |
| No team-seat support — a business with multiple staff shares one login for all CRM data | Real, matches every other dashboard surface in this codebase today | Consistent with existing platform-wide limitation, not a regression introduced by this phase; §43's "team seats" is separately-scoped future work |
| `CrmActivity` row growth (one entry per stage change, indefinitely) | Low, at SME scale | No cleanup/archival mechanism this phase — acceptable given the platform's typical account activity volume; revisit only if evidence of real growth pressure emerges |
| Reminder-email volume | Low | Reuses the existing Resend integration (already proven for verification/password-reset email); one email per overdue task, deduplicated via `reminderSentAt` |
| Field-level ownership-reassignment vector (the exact class of bug Phase 13's first review found on `MarketPostings`) | Real if not built defensively | §K requires the same field-level `access.update` guards (`noUpdateAfterCreate`-style) on `owner`/`contact`/`lead` from the first draft, not discovered in a later review cycle |

## O. Effort Estimate

Comparable in scope to Phase 12 (which introduced three new collections — `Connections`, `Conversations`, `Messages` — plus their access-control module and dashboard surfaces), somewhat larger in UI effort specifically: this is the first phase whose primary dashboard surface is a genuinely new interaction pattern (a drag/click Kanban board) rather than a list-and-detail pattern every prior network-side phase has reused. Backend/schema work (four collections, one access-control module, hook-driven activity logging) is of a similar order to Phase 13's `MarketPostings` plus its `access-market.ts`. Relative sizing: **larger than Phase 15** (one collection, reused existing UI patterns), **comparable to Phase 12–13 combined** on the backend, with additional, not-previously-needed frontend investment for the pipeline board specifically.

## P. Go / No-Go Recommendation

**Go.** CRM Lite is explicitly named in the Blueprint, has a pre-built code seam anticipating it, requires zero new external dependencies or infrastructure, introduces zero new staff roles, and has the simplest access-control model of any phase to date (§J) because it is structurally one-sided. The only real open scope question — plan-gating — is explicitly out of this phase's mandate and does not block a correct, useful implementation; every business account having early access to CRM Lite before billing exists is a reasonable, reversible business decision, not a technical risk.

---

## Alternative Analysis: CRM Lite vs. Market Pulse

| | **Option A — CRM Lite** | **Option B — Market Pulse** |
|---|---|---|
| **Dependencies** | None beyond what's shipped (Connections, Conversations, MarketPostings, network accounts — all live in production). | Hard dependency on data this platform does not yet collect (search-query volume, category view/engagement tracking — no analytics/event pipeline exists anywhere in this codebase), **and** on Institution accounts having a real differentiated portal to sell the paid dashboard into — `PHASE13-COMPLETION-REPORT.md` and `PHASE14-COMPLETION-REPORT.md` both still list "Institution and Diaspora account-type-specific features... no differentiated dashboard experience" as open Remaining Blueprint Work, unresolved through three subsequent phases. |
| **Business value** | Direct: converts every already-shipped Connection/MarketPosting-response into something a business can actually work with, closing a loop the platform has been building toward since Phase 12. Named as the headline feature of a specific, already-priced paid tier (§43). | Indirect and longer-horizon: valuable once there's enough aggregate search/engagement volume to make "most searched services" or "fast-growing categories" meaningful — a cold-start problem this platform's current scale doesn't yet solve, and the paid-institutional-dashboard revenue path is gated behind Institution accounts that don't yet have anywhere to view it. |
| **Complexity** | Low-moderate: four ownership-scoped collections, one access-control module, one new (Kanban) dashboard pattern. No new infrastructure. | High: requires new event-tracking/analytics infrastructure from scratch, privacy-preserving aggregation logic (Blueprint §37's own explicit "never sell private or individually identifiable personal information" constraint demands real anonymization design, not just a report), and a new institutional-account portal to sell dashboards into. |
| **Blueprint alignment** | §53 Release 3 ("Engagement and SaaS... lead inbox... paid plans") — the release immediately following what's already shipped (Releases 1–2 and most of 4). | §53 Release 5 ("Market Infrastructure... Market Pulse") — explicitly the *last* named release, behind Digital Neighborhoods, Diaspora Bridge, institutional portals, and Market Missions, none of which exist yet either. |
| **Recommended order** | **Next.** | After institutional-portal and analytics-infrastructure phases exist to support it — likely several releases out, consistent with the Blueprint's own sequencing. |

**Recommendation: CRM Lite is the correct next phase.** The Blueprint's own release sequence places it three releases ahead of Market Pulse, it has zero unmet dependencies (Market Pulse has two significant ones — an analytics pipeline and an Institution portal, neither of which this project has built), it is lower-complexity and lower-risk (no new infrastructure, the simplest access-control model of any phase to date), and it has a direct, already-named commercial home (§43's Business Growth tier) rather than Market Pulse's longer, colder path to institutional revenue. Building Market Pulse before CRM Lite would mean building analytics infrastructure to measure engagement with a platform that still has no tool for a business to act on the engagement it already receives — solving a second-order problem before the first-order one is closed.

---

*Per instruction: design only. No branch was created, no code was written, no PR was opened. Stopping after this document.*
