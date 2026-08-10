# Phase 7 — Risk Assessment

Risks specific to migrating an already-working lead-capture system into a new storage backend and adding a Lead Dashboard/pipeline, grounded in the concrete gaps found in `PHASE7-ARCHITECTURE-REVIEW.md` — not generic lead-gen risk boilerplate.

## Spam risk

| Risk | Severity | Assessment |
|---|---|---|
| In-memory throttle doesn't survive Vercel's serverless cold starts / multiple instances | **Medium-High**, already real today | Confirmed via code reading (Architecture Review §1.4): `lib/actions.ts`'s `throttleLog` is a plain `Map` scoped to one process. This is not a new risk Phase 7 introduces — it already exists in production — but Phase 7 is the natural point to fix it, since a new `Leads` collection means new write volume/visibility that makes an under-throttled spam wave more consequential (it now clutters a dashboard staff actually look at, not just an invisible table). **Mitigation**: move the throttle to a persistent store — a small `RateLimitEvents` Payload collection (or a lightweight Redis/Upstash addition) keyed by hashed IP, queried before each write. Scoped as part of Phase 7, not deferred, given the dashboard makes spam visible/annoying for the first time. |
| Newsletter form has no honeypot | Medium | Confirmed (Architecture Review §1.4) — Contact and Assessment both have a honeypot field, Newsletter doesn't. A single-field email-only form is an easy bot target. **Mitigation**: add the same honeypot pattern already proven on the other two forms — trivial, consistent fix. |
| Quote Request form (new) needs the same protections from day one | Medium | Not a migration risk but a build-it-right-the-first-time item — the new Quote form must ship with honeypot + throttle from day one, not added later as an afterthought, matching the bar already set by Contact/Assessment. |
| CRM webhook (future) as a new spam-amplification vector | Low, future-only | If a future CRM integration auto-creates deals/contacts from every new Lead, a successful spam submission now also pollutes the CRM, not just the local dashboard. Not an MVP risk (CRM integration is explicitly deferred), but worth remembering when that work is scoped — the throttle/honeypot fixes above should land *before* any CRM webhook, not after. |

## Data privacy

| Risk | Severity | Assessment |
|---|---|---|
| Newsletter unsubscribe path may not actually be reachable | Medium, **unverified — flagged for confirmation before implementation** | Architecture Review §1.8: a working `unsubscribeNewsletter()` query function exists, but no route/link was found calling it. If confirmed missing, this is a real CAN-SPAM/GDPR-adjacent compliance gap (any commercial email needs a working opt-out), not just a nice-to-have. Must be confirmed and, if missing, fixed as part of Phase 7 — not deferred. |
| PII now visible to more staff via a dashboard, where before it was DB-access-only | Low-Medium | Today, seeing a lead's full name/email/business details requires direct database access (a de facto access restriction, even if unintentional). A Payload dashboard makes this data visible to anyone with `editor` role. This is the intended outcome (staff need to work leads) but is worth naming: the existing `adminOrEditor` access pattern is the same bar every other content type in this CMS uses, and is judged sufficient here for the same reason — a small team, already trusted with all other business content. |
| Lead PII now travels through Payload's admin UI, GraphQL API, and REST API surface (all pre-existing, proven-secure infrastructure) rather than being isolated in a table only reachable by direct SQL | Low | Payload's existing access-control layer (confirmed correctly enforced across every drafts-enabled collection in this project's history) applies identically to the new `Leads`/`NewsletterSubscribers` collections — no new attack surface beyond what's already proven safe for Testimonials, Case Studies, etc. `create` access must be scoped correctly (server-action-only, not publicly writable) — this is the one access-control point that needs explicit attention during implementation, not assumed correct by analogy. |
| Attribution data (UTM/referrer) is marketing metadata, not sensitive PII, but is being newly activated (Architecture Review §1.3) | Low | Worth a one-line privacy-policy check (does `/privacy-policy/` already disclose analytics/attribution tracking?) — likely yes already, given UTM params are extremely standard, but a cheap confirmation step before shipping the fix. |

## Operational complexity

| Risk | Severity | Assessment |
|---|---|---|
| Two lead-storage systems coexisting during migration (old Drizzle tables + new Payload collections) | Medium, temporary | Unavoidable during a transition — mitigated by keeping the migration window short (per the Effort Estimate, this is a small, low-volume, one-time migration, not a long-running dual-write period) and by the Validation Plan's explicit before/after record-count reconciliation. |
| Drizzle infrastructure (`lib/db/*`, `drizzle.config.ts`, the `drizzle-kit` scripts) becomes dead weight after migration | Low | Once migrated, these files/dependencies are no longer load-bearing. Recommend explicit removal (not just abandonment) once the migration is validated and stable — leaving unused infrastructure around is exactly the kind of thing this project's own conventions (CLAUDE.md-equivalent guidance) argue against. Scoped as a cleanup step in the Effort Estimate, not left implicit. |
| A unified `Leads` collection with conditional per-type fields adds admin-UI complexity relative to three separate simple tables | Low | Directly mitigated by reusing an already-proven pattern (`FaqPageBlock`'s scope-conditional field, `RichContent`'s blockType-conditional fields) — this is a well-trodden path in this specific codebase, not a novel risk. |
| CRM integration deferred to a future phase means a real "we don't have a CRM yet" gap persists through Phase 7 | Low-Medium, accepted | Named explicitly rather than hidden — the Payload dashboard is a genuine, real improvement over today's "no visibility at all," even without CRM sync. Not a Phase 7 blocker; a scoping choice the Final Recommendation states plainly. |

## Maintenance burden

| Risk | Severity | Assessment |
|---|---|---|
| One fewer system to maintain, not more, once migration completes | N/A (net positive) | Today's architecture requires understanding two separate data layers (Payload's Local API and Drizzle's query builder) to work on anything lead-related. Post-migration, there's one system (Payload) for all content and lead data — a genuine simplification, not added burden, once the one-time migration cost is paid. |
| The persistent-throttle fix (spam risk, above) adds a small new piece of infrastructure (a rate-limit collection or external service) | Low | Scoped as a small, contained addition — a `RateLimitEvents` Payload collection with a TTL-style cleanup (or a scheduled admin script, matching this project's existing script-based maintenance pattern) is proportionate; an external Redis service would be disproportionate at this traffic volume and is not recommended. |
| Ongoing: someone needs to actually work the leads in the new dashboard for it to matter | Medium, **not an engineering risk** | The single biggest determinant of whether Phase 7 delivers real business value is whether staff actually adopt the new dashboard/pipeline workflow — a process/adoption risk, not a technical one, and outside engineering's ability to fully control. Named explicitly in the Final Recommendation's success metrics rather than assumed away. |

## Scalability

| Risk | Severity | Assessment |
|---|---|---|
| Payload/Postgres write throughput at this business's actual scale | Very Low | Every prior phase's direct data checks confirm very low current content/traffic volume (dozens of pages/services, not thousands). Lead volume will be commensurately low. Payload's write overhead vs. raw Drizzle inserts is immaterial at this scale — a non-issue, named only to close the question explicitly rather than leave it unaddressed. |
| `Leads` collection growing large over years without any archival strategy | Low, future-only | Not a Phase 7 concern given current/projected volume, but worth a one-line forward note: Payload has no built-in data-retention/archival tooling, so a multi-year-old `Leads` collection with thousands of closed-lost records would eventually be a "someone should think about archiving this" conversation — flagged for future awareness, not designed for now (designing retention policy for data that doesn't exist yet would be premature). |
| Reusing the `select`-based status pipeline vs. a more complex workflow-state-machine library | Very Low | A plain `select` field is correctly scoped for a 6-stage linear-ish pipeline at this volume; a dedicated workflow engine would be over-engineering for a solo-founder-scale sales process. |

## Overall risk posture

**Medium**, driven almost entirely by two concrete, already-real (not newly-introduced) issues this phase is the right moment to fix: the non-persistent spam throttle and the unverified newsletter-unsubscribe path. Both have small, well-scoped mitigations already identified. No risk here argues against proceeding — every item has either a proportionate, low-effort fix or is explicitly, deliberately deferred with the reasoning stated plainly rather than left implicit.
