# CMS Team Roles

## A constraint to understand before assigning anyone a role

Payload's `Users` collection (`payload/collections/Users.ts`) currently supports **exactly two technical permission levels**: `admin` and `editor`. Every access rule in every collection (`payload/access.ts`'s `adminOrEditor`/`adminOnly`) is built on just those two. The 4 business roles below (Founder, Marketing Manager, Editor, VA) are **organizational** roles — real distinctions in responsibility and trust — but only 2 of them can currently be distinct at the account-permission level. This document recommends how to map 4 people-roles onto 2 system-roles, and flags where that mapping is a compromise, not a perfect fit. A more granular permission model is a real candidate for a future phase (see `POST-PHASE4A-PRODUCTION-ACCEPTANCE-REVIEW.md`, Option F).

---

## Founder

**System role**: `admin`

**Access level**: Full — the only role that can manage Users, Navigation, and Site Settings; the only role that can delete anything.

**Permissions** (from `payload/access.ts`, verified against every collection's config):
- Full create/read/update/delete on every collection and global.
- Only role that can create/edit/delete other user accounts.
- Only role that can create/edit/delete Navigation items — a mistake here breaks the header/footer sitewide, so this is deliberately gated (see `payload/collections/Navigation.ts`'s own comment on this).
- Only role that can update Site Settings.
- Only role that can delete content anywhere (Services, Articles, Pages, Testimonials, Case Studies) — every other role can create/update but not delete.

**Responsibilities**:
- Final sign-off on anything structural: navigation changes, new user accounts, Site Settings.
- Owns the decision to delete content permanently (vs. just unpublishing/hiding it).
- The account of last resort — if every other account is locked out or unavailable, this is the one that can fix it.

---

## Marketing Manager

**System role**: `admin` — **recommendation, not the only defensible choice**

**Why admin rather than editor**: A Marketing Manager realistically needs to touch Navigation (adding a new campaign link, reorganizing the footer) and plausibly Site Settings (updating contact info, social links) — both are Admin-only. If this role is scoped tightly to content only, `editor` is the correct, more conservative choice instead; make that call based on how much you trust this specific person with site-wide structural changes, not based on their job title alone.

**Access level**: Full, if `admin`; content-only (see Editor below) if `editor`.

**Permissions if `admin`**: identical list to Founder above.

**Responsibilities** (regardless of which system role is chosen):
- Owns the content activation work in `CONTENT-ACTIVATION-PLAN.md` — sourcing and approving testimonials and case studies.
- Owns Homepage Global edits — this is the highest-traffic, highest-visibility surface on the site, and (per `POST-PHASE4A-PRODUCTION-ACCEPTANCE-REVIEW.md`) has no draft/publish safety net, so edits here should go through whoever has the most context on current messaging.
- Reviews and publishes Testimonials/Case Studies drafted by an Editor or VA (see Approval Workflow in `CONTENT-ACTIVATION-PLAN.md`).
- Second sign-off on Navigation changes even if not the one making them (if this role is `editor`, this becomes "requests the change from an Admin" instead of "makes it directly").

---

## Editor

**System role**: `editor`

**Access level**: Content-only. Cannot manage users, cannot touch Navigation or Site Settings, cannot delete anything.

**Permissions** (from `payload/access.ts`'s `adminOrEditor`, applied per-collection):
- Create/read/update on: Services, Articles, FAQs, Pages, Testimonials, Case Studies, Homepage.
- **Cannot**: create/edit Navigation, update Site Settings, manage Users, or delete anything anywhere (delete is `adminOnly` on every collection).
- Can Save Draft / Publish on Pages, Testimonials, Case Studies (the 3 collections with a real draft workflow).

**Responsibilities**:
- Day-to-day content creation and editing: new Articles, Service copy updates, drafting Testimonials/Case Studies for Marketing Manager review.
- Homepage edits within their judgment — same instant-live caveat as above applies to this role too.
- Flags anything that seems to need a Navigation change or Site Settings update to an Admin, rather than being able to make it directly.

---

## VA (Virtual Assistant)

**System role**: `editor` — **the honest limitation, stated plainly**

There is currently no way to give a VA a *more* restricted permission set than a full Editor. Organizationally, a VA is usually the highest-volume, lowest-judgment-required role (data entry, routine content collection) — but technically, once given an account, they have exactly the same write access as anyone else marked `editor`, including the ability to edit existing Services/Articles copy, not just add new Testimonials.

**Access level**: Same as Editor, technically — narrower in practice only through role discipline and training, not through anything the system enforces.

**Recommended scope of work** (enforced by process, not by permissions):
- Collecting and entering Testimonial/Case Study drafts from real client conversations (per `CONTENT-ACTIVATION-PLAN.md`'s workflow) — save as Draft, never Publish directly.
- Routine FAQ additions.
- **Should not**, by team agreement rather than system restriction: edit existing Service/Article copy, touch the Homepage Global, or Publish anything without a second person's review.

**If this gap matters enough to fix**: a narrower "contributor" role (create/draft only, no publish, no edit of others' content) would require a genuine schema change to `Users.ts`'s role field and every collection's access function — real but contained engineering work, a natural fit for the same future phase noted above.

---

## Summary table

| Role | System role | Can publish? | Can delete? | Can touch Navigation/Site Settings? | Can manage Users? |
|---|---|---|---|---|---|
| Founder | `admin` | Yes | Yes | Yes | Yes |
| Marketing Manager | `admin` (recommended) or `editor` | Yes | Yes if `admin` / No if `editor` | Yes if `admin` / No if `editor` | Yes if `admin` / No if `editor` |
| Editor | `editor` | Yes (own drafts) | No | No | No |
| VA | `editor` (no narrower option exists today) | Technically yes — restrict by team policy, not system | No | No | No |
