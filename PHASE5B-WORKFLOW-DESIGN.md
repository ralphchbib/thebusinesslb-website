# Phase 5B — Editorial Workflow Design

Describes how the Services/Articles editing experience changes for editors, and the exact preview/publish mechanics — the "what does this feel like to use" companion to the technical plan.

## 1. Before vs. after

| | Today | After Phase 5B |
|---|---|---|
| Publish control | Single "Published" checkbox | Native Payload Save Draft / Publish buttons |
| Saving an edit to a live record | Instantly public | Saved as a draft; live content unchanged until Publish |
| List view status indicator | `isPublished` boolean column | `_status` pill (Draft / Published), matching Pages/CaseStudies today |
| Reviewing an in-progress edit | Not possible without publishing it | Preview link via `admin.preview`, opens the live site in Draft Mode showing the draft content, `noindex`'d, with the existing preview banner (Phase 5A) |
| Version history | None | Full version history via Payload's native versions UI (already available on Pages/CaseStudies) |

## 2. Step-by-step editor flow (new)

1. Editor opens a Service or Article in `/admin`, makes changes, clicks **Save Draft**.
2. Public site is unaffected — the 5 existing Services / 3 existing Articles continue serving their last-published content.
3. Editor clicks the **Preview** link (Payload's built-in preview button, wired to `admin.preview`), which opens `/api/draft?secret=...&collection=services&slug=...` — identical mechanism to Pages/CaseStudies today, including the 3-layer security check (secret + session + collection whitelist) and the visible preview banner with its Exit Preview control.
4. Editor reviews the draft on the real site template (correct layout, real structured data, real related-content resolution) in a `noindex,nofollow` context — no risk of the draft being indexed or shown to the public.
5. When satisfied, editor clicks **Publish**. The document's `_status` becomes `"published"`, the change goes live immediately, and site-wide revalidation fires (same hook already in place today).

## 3. Admin list-view changes

`admin.defaultColumns` on both collections updated:
- Services: `["h1", "slug", "_status", "order"]` (replacing `isPublished`).
- Articles: `["title", "topic", "_status", "publishedAt"]` (replacing `isPublished`).

This is a cosmetic config change but a necessary one — leaving `isPublished` in `defaultColumns` after the field is no longer meaningfully written would show a stale/misleading column.

## 4. What does NOT change

- The overall page layout of the admin edit screens — all existing fields (packages, timeline, body blocks, SEO fields, etc.) remain exactly where they are; only the publish-state control changes shape.
- `order` (Services) and `publishedAt`/`topic` (Articles) remain plain fields, not versioned any differently than the rest of the document.
- Nothing changes for Homepage, Site Settings, FAQs, or Testimonials editing — out of scope for this phase.

## 5. Editor communication / training

Recommend a short update to the project's existing editor-facing documentation (mirroring the precedent set when Pages/CaseStudies gained this workflow in Phase 5A) covering:
- Save Draft vs. Publish now means something different than before (previously, saving = publishing).
- How to use the Preview link.
- That existing Services/Articles are unaffected on day one — no action required from editors unless they want to start using drafts.

This is a documentation update adjacent to, but not counted among, the 7 core Phase 5B planning deliverables — flagged here as a follow-up item for the implementation phase, not something this planning pass produces.

## 6. Rationale for extending this specifically to Services and Articles

Of all content types on the site, Services and Articles are edited most frequently and are the most commercially/SEO-sensitive (Services drive conversion, Articles drive organic search traffic). They are arguably a **stronger** case for draft protection than Homepage (deferred to a future tier per the original Phase 5 plan) — a mistaken instant-publish on a Service's pricing or a Article's claims carries more practical risk than a typo on the Homepage, which changes far less often and is more heavily reviewed by nature of being singular.
