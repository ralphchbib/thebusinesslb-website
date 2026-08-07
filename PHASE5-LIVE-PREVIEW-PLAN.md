# Phase 5 — Draft Mode & Live Preview: Planning Package

Planning only, per explicit instruction: no code, no branch, no schema pushed, no PR. Grounded in a direct audit of the current codebase (`payload/collections/*.ts`, `payload/globals/*.ts`, `payload/access.ts`, `payload/hooks/revalidate.ts`, `middleware.ts`, `lib/cms/client.ts`, the installed `payload`/`@payloadcms/next` packages) — every claim below about "what exists today" was verified by reading the actual file or package contents, not assumed from memory of earlier phases.

## Objectives, as given

Draft Mode · Preview URLs · Homepage Preview · Services Preview · Articles Preview · Pages Preview · Case Studies Preview.

## The single most important finding, stated up front

**The 5 target content types are not in the same starting state, and that difference should drive the whole plan — not be discovered midway through.** Verified directly:

| Content type | Current draft/publish model | Preview readiness |
|---|---|---|
| `Pages` | `versions: { drafts: true }` — full Payload draft/publish workflow, already access-gated (`_status`) | **Ready** — only needs Draft Mode plumbing added on top |
| `CaseStudies` | `versions: { drafts: true }` — same as Pages | **Ready** — same |
| `Services` | A single `isPublished` boolean checkbox. **No versioning at all** — there is no separate "draft" document distinct from the live one | **Not ready** — must gain real draft/publish versioning first, which is a schema *and* editor-workflow change, not a pure addition |
| `Articles` | Same `isPublished`-boolean-only model as Services | **Not ready** — same prerequisite as Services |
| `Homepage` (global, not a collection) | **No draft concept whatsoever.** Every save today is instantly, sitewide live — this is documented as an intentional design choice in the field's own code comments from Phase 4A | **Least ready** — enabling preview here means changing the one thing editors currently rely on ("I hit Save and it's live"), not just adding a feature |

This is why the plan below is sequenced in tiers by current readiness, not delivered as one flat feature across all 5 types at once (§4).

---

## 1. Architecture Review

### 1.1 What already exists and can be reused

- **Payload 3.87's own draft infrastructure is already installed and proven**: `node_modules/payload/dist/admin/elements/PreviewButton.js`, `SaveDraftButton.js`, and `node_modules/payload/dist/versions/drafts/*` (including `replaceWithDraftIfAvailable`) all ship with the version already in `package.json` — no new dependency is needed for the "Preview" button or draft querying itself.
- **The access-control pattern for drafts is already established and proven in production**: `Pages`/`CaseStudies`/`Testimonials` all use the identical `read: ({ req: { user } }) => user ? true : { _status: { equals: "published" } }` shape. Any new drafted collection (Services, Articles) or global (Homepage) should reuse this exact pattern, not invent a new one.
- **Payload runs in-process with Next.js** (`lib/cms/client.ts`'s `getCms()` calls `getPayload({ config })` directly, no separate server) — meaning Next's native `draftMode()` (from `next/headers`, stable in the installed Next 15.4.11) is trivially readable from any Server Component or Route Handler, and a `draft: true` flag can be passed straight into `payload.find()`/`findByID()` calls in the existing `lib/cms/*.ts` data-layer functions. No cross-service round trip is needed.
- **Role model already fits**: `payload/access.ts`'s `adminOrEditor`/`adminOnly` and the `Users.role` field (`admin`/`editor`) are the natural gate for "who can generate a preview link" — no new role or permission concept is needed.

### 1.2 What does not exist yet (fully greenfield — verified, not assumed)

Grepped the entire `payload/` and `app/` directories for `preview:`, `admin.preview`, `draftMode`, `/api/draft`, `/api/preview` — **zero matches, anywhere.** This confirms:
- No collection or global has an `admin.preview` URL-generator configured.
- No Draft Mode route (`/api/draft`, `/api/exit-draft`, or equivalent) exists.
- No page's `generateMetadata()`/data-fetching currently branches on draft state — every fetch function today unconditionally filters to published-only content (`_status: { equals: "published" }` or `isPublished: { equals: true }`).

This is comparable to how Phase 4C's Site Settings "SEO Defaults" tab was fully greenfield before that phase — there is precedent in this project for building a fully new capability cleanly, without legacy assumptions to work around.

### 1.3 A real interaction with the existing revalidation hooks (verified, not theoretical)

`payload/hooks/revalidate.ts`'s `revalidateAfterChange`/`revalidatePageAfterChange` fire on **every** `afterChange` event — they do not check `doc._status`. This means, today, saving a *draft* on Pages/CaseStudies/Testimonials already triggers `revalidatePath()` on the live public route. This is currently harmless (the public fetch functions still filter to published-only, so the revalidated page just re-renders with the same already-published content — no draft content leaks), but it is a wasted cache invalidation on every draft save. Phase 5 does not need to fix this, but any new drafted collection (Services, Articles) or global (Homepage) will inherit the identical behavior unless deliberately scoped — worth a conscious decision, not a silent inheritance (§3.3).

### 1.4 A concrete, already-verified blocker for one specific preview architecture

`middleware.ts`'s Content-Security-Policy sets `frame-ancestors 'none'` **and** `X-Frame-Options: DENY`, site-wide, on every response. This is directly relevant: Payload also offers a fancier "Live Preview" feature (real-time, no-save-required, via an iframe embedded inside the admin panel, using `@payloadcms/live-preview-react` or equivalent) — but that package **is not installed**, and more importantly, **this site's own CSP currently forbids the site from being framed by anything, including its own admin panel, same-origin or not.** Enabling iframe-based Live Preview would require deliberately loosening `frame-ancestors`/`X-Frame-Options` — a real security trade-off, not a config toggle to flip casually.

**Recommendation, stated explicitly**: this plan scopes Phase 5 to the simpler, well-established **"Preview" pattern** — an editor clicks a Preview link/button in the Payload admin, which opens the actual site in a **new browser tab** in Next.js Draft Mode. This requires **no CSP change, no new npm dependency, and no iframe** — it's the lower-risk of the two legitimate approaches, and it directly avoids re-opening the CSP that was deliberately hardened in this codebase's existing `middleware.ts`. Iframe-based Live Preview is explicitly **out of scope** for this phase; flagged as a possible future phase if real-time no-save preview becomes a real editorial need, with its own dedicated security review.

---

## 2. Security Assessment

| Risk | Detail | Mitigation |
|---|---|---|
| **Draft-content exposure to anonymous users** | If the Draft Mode route or data-layer branching is implemented incorrectly, unpublished content could become publicly fetchable | Reuse the exact `user ? true : published-only` access pattern already proven on 3 collections (§1.1). The new `/api/draft` route must itself require a shared secret (below) — Draft Mode's cookie alone is not sufficient, since anyone could otherwise call `draftMode().enable()`-equivalent behavior if the enabling route had no gate |
| **Preview-secret handling** | Next.js's standard Draft Mode pattern uses a shared secret in the enabling route's query string (`/api/draft?secret=...`). Payload's Local API (used by every existing `lib/cms/*.ts` function) **bypasses document-level access control by default** for server-side calls — meaning, in this architecture, the secret is the *real* gate protecting draft content, not Payload's per-document `read` access function | Store the secret as a server-only environment variable (e.g. `PREVIEW_SECRET`), never expose it client-side, never log it. Treat it with the same handling discipline as any other secret in this project (no committed values, no client bundle inclusion — verified via `NEXT_PUBLIC_`-prefix convention already used correctly elsewhere in `lib/config.ts`) |
| **Defense in depth beyond the secret** | A leaked preview link alone would let anyone view draft content, even without a Payload login | Recommend the `/api/draft` route *additionally* check for an authenticated Payload session (reusing the same `user` check already used by the drafts access-control pattern) before enabling Draft Mode — not just the secret. This is a deliberate design decision to surface now, not default silently to secret-only |
| **CSP / clickjacking (§1.4)** | Iframe-based Live Preview would require loosening `frame-ancestors`/`X-Frame-Options`, weakening a real, already-hardened protection | Avoided entirely by scoping to tab-based Preview (§1.4) — no CSP change needed for this phase |
| **Draft content and search engines** | A leaked or bookmarked preview URL should never be indexable | Next's Draft Mode itself doesn't add a `noindex` tag automatically — recommend the preview-rendering path explicitly sets `robots: { index: false, follow: false }` when `draftMode().isEnabled` is true, reusing the exact mechanism already shipped in Phase 4C (`Pages.noindex` → `metadata.robots`), applied conditionally rather than as a stored field |
| **Revalidation hook scope creep (§1.3)** | Adding drafts to Services/Articles/Homepage without reviewing the revalidation hooks could cause more frequent unnecessary cache invalidation, or — if implemented carelessly — accidentally revalidate with draft content | Explicit design rule for this phase: **the public (non-draft-mode) data-layer functions must never be given a code path that can return unpublished content.** Draft-aware fetching must be a separate, additive branch (e.g., a `draft` parameter defaulting to `false`), never a default-on behavior change to the existing published-only functions |
| **`isPublished` → drafts migration risk (Services/Articles)** | Converting a boolean-flag collection to `versions: { drafts: true }` is a genuine schema/behavior change, not a purely additive field — closer in risk profile to Phase 4B's field-*type-conversion* work (which hit the dev-mode schema-push TTY blocker) than to Phase 4C's purely-additive fields | Plan for the same "extract Payload's own computed schema, verify before applying" discipline already proven in Phase 4B/4C.3, not a plain field addition. Budget real testing time for the *editorial* behavior change too (§3.2), not just the schema |
| **Homepage drafts — the biggest behavioral risk in this phase** | Changing a Global from "every save is instantly live" to a draft/publish workflow changes a standing assumption the whole editorial team currently relies on | Requires explicit human sign-off on the *product* decision before implementation, separate from the engineering review — flagged as a go/no-go gate in §4's Tier 3, not assumed as automatically wanted just because it's technically feasible |

**Overall security posture of this plan: the scoped (tab-based Preview, no iframe) approach keeps risk low** — it avoids the one real structural conflict this codebase already has (the CSP), reuses already-proven access patterns, and adds exactly one new secret to manage. The main residual risk is procedural (making sure the secret-only gate has a second, session-based layer) rather than architectural.

---

## 3. Database & CMS Impact (feeds §4's sequencing)

### 3.1 Purely additive (no schema-affecting risk)

- Nothing for `Pages`/`CaseStudies` — they already have `versions: { drafts: true }`. Only `admin.preview` (a config function, not a field) needs adding to each collection.

### 3.2 Schema-affecting (real risk, needs its own care)

- `Services`: add `versions: { drafts: true }`. This is **not** a simple additive field — it changes how Payload stores every existing Services document (adds a parallel `_services_v` versions table, mirroring the `_pages_v` pattern already live in production per Phase 4C.5's report) and changes the collection's `read` access function from `anyone` to the `user ? true : published-only` pattern. The existing `isPublished` checkbox's *meaning* would need a deliberate decision: keep it alongside `_status` (redundant, confusing) or retire it in favor of Payload's native publish workflow (cleaner, but a data-migration question for existing records — every current Service is presumably `isPublished: true` and would need to map to `_status: "published"`).
- `Articles`: identical shape and identical open question as Services.
- `Homepage` (global): add `versions: { drafts: true }`. Globals support Payload drafts too, but this is the first global in this project to ever use them (`SiteSettings` remains a simple always-live global, and should stay that way — no reason to add drafts to settings/config data). This also changes `Homepage`'s `access.read` from `anyone` to the same gated pattern.

### 3.3 New environment variable (not a database change, but a required addition)

- `PREVIEW_SECRET` (server-only, no `NEXT_PUBLIC_` prefix) — required for the `/api/draft` route. Per the standing Vercel-access rules already established for this project, adding this is a "change to production environment variables" and requires the same explicit authorization already required for any other env var change — noted here as a dependency of implementation, not something this planning phase adds.

---

## 4. Implementation Sequence

Three tiers, ordered by current readiness (§0) and risk (§2/§3) — not by the order the objectives were listed in the brief. Each tier is independently shippable, following this project's established "small, additive, sequenced by risk" discipline (the same discipline that produced Phase 4C's 7 independently-validated sub-phases).

### Tier 0 — Shared Draft Mode infrastructure (prerequisite for every other tier)
- `/api/draft` route handler: verify `PREVIEW_SECRET` (and, per §2, an authenticated session), enable Next's Draft Mode, redirect to the target content's real URL.
- `/api/exit-draft` route handler: disable Draft Mode, return to normal browsing.
- A small shared helper (e.g. `lib/seo/preview.ts` or similar) that any page's `generateMetadata()`/data fetch can call to check `draftMode().isEnabled` and apply the `noindex` behavior from §2.
- No collection/global changes in this tier — pure application code, but it has nothing to attach to yet (Tier 1 provides the first real target).

### Tier 1 — Pages & Case Studies preview (lowest risk — both already have drafts)
- Add `admin.preview` config to `Pages` and `CaseStudies`, generating a link to `/api/draft?...&redirect=/{slug}/` (Pages) and `/case-studies/{slug}/` (CaseStudies).
- Update `getPageBySlug`/`getCaseStudyBySlug` (and their `generateMetadata()` callers) to accept a draft-aware path, gated behind `draftMode().isEnabled`, never changing the existing published-only default behavior.
- This tier proves the entire Tier 0 mechanism end-to-end against real, already-drafted content before any schema change is attempted — the safest possible place to find integration problems first.

### Tier 2 — Services & Articles preview (requires the schema/workflow change from §3.2)
- Add `versions: { drafts: true }` to both collections; resolve the `isPublished`-vs-`_status` question from §3.2 as an explicit decision before implementation (recommend retiring `isPublished` in favor of `_status`, for consistency with every other drafted collection in this project — but this is a product decision to confirm, not assume).
- Apply the schema change using the same "extract Payload's own computed shape, verify before applying" technique already proven in Phase 4B and Phase 4C.3–4C.5, given the real precedent for this exact class of change hitting friction.
- Wire `admin.preview` + draft-aware fetching, same pattern as Tier 1.
- **Editor-facing change management**: the Services/Articles admin screens change from a single checkbox to a Save Draft / Publish workflow. Recommend a short note in `EDITOR-ONBOARDING-GUIDE.md` (already established in this project from Phase 4B) before this ships.

### Tier 3 — Homepage preview (highest behavioral change — needs a product decision, not just engineering)
- Explicit go/no-go check with stakeholders first: confirm the team actually wants "save now goes to draft by default" for the homepage specifically, given it's the one place in this CMS where instant-live has been true since Phase 4A.
- If confirmed: add `versions: { drafts: true }` to the `Homepage` global, wire `admin.preview`, apply the same draft-aware fetching pattern to `lib/cms/homepage.ts`/`app/(app)/page.tsx`.
- If not confirmed: this tier is deferred indefinitely without blocking Tiers 0–2, which already deliver 4 of the 5 requested preview surfaces (Pages, Case Studies, Services, Articles).

---

## 5. Validation Strategy

For each tier, once implemented:
- `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` — the same required gate every phase in this project has used.
- **Draft-isolation check (the one that matters most for this feature)**: with Draft Mode disabled, confirm a document's *unpublished* changes are never visible on the public URL — save a draft-only edit, hit the live page anonymously (no draft cookie), confirm the old published content still renders. This is the single test that, if it fails, means the feature is actively dangerous, not just incomplete.
- **Draft-visibility check**: with Draft Mode enabled (via the real `/api/draft` link, not a manual cookie hack), confirm the unpublished edit *is* visible, and that the page carries `noindex`.
- **Secret-gate check**: confirm `/api/draft` without a valid secret (and, per §2, without an authenticated session) does not enable Draft Mode.
- **Exit-draft check**: confirm `/api/exit-draft` correctly returns the browser to normal (published-only) browsing.
- **Regression sweep**: full 31-route build (or however many routes exist at implementation time) to confirm no existing published-content rendering changed.
- **Revalidation-hook check** (per §1.3/§2): confirm draft saves on the newly-drafted collections (Services/Articles/Homepage) don't cause any public-facing content to change before an explicit Publish.

---

## 6. Rollback Strategy

- **Tier 0/1** (new routes, `admin.preview` config, draft-aware fetch branches): all additive — `git revert` removes the preview routes and config; Pages/CaseStudies' existing drafts functionality (already in production since before this phase) is completely unaffected, since it predates Phase 5.
- **Tier 2** (Services/Articles gain `versions: { drafts: true }`): schema-affecting, so rollback needs more care than a pure `git revert` — the new `_services_v`/`_articles_v` tables and the `_status` column would need to either stay (orphaned, harmless, matching this project's established "tolerate orphaned nullable additions" precedent) or be explicitly reverted at the database level if reverting all the way. Recommend: keep the schema, revert only the application code and `admin.preview` config, if a rollback is ever needed — reverting the schema itself is a bigger, separate decision.
- **Tier 3** (Homepage global gains drafts): same shape of consideration as Tier 2, with the added note that reverting Homepage's `access.read` back to `anyone`-always-live is the actual behavior rollback that matters most to editors, more than the schema itself.

---

## 7. Effort Estimate

| Work item | Estimate |
|---|---|
| Tier 0 — shared Draft Mode infrastructure | 2.5–3 hours |
| Tier 1 — Pages + Case Studies preview | 2 hours (low risk, proves the mechanism) |
| Tier 2 — Services + Articles: schema change + preview wiring + editor-workflow update | 4–5 hours (includes the `isPublished`→`_status` migration decision and its implementation) |
| Tier 3 — Homepage: schema change + preview wiring (engineering only; excludes stakeholder decision time) | 2.5–3 hours |
| Validation (all tiers, per §5) | 2–2.5 hours |
| Implementation + validation reports (matching this project's established documentation discipline) | 1.5 hours |
| **Total (Tiers 0–2, the confidently-scoped portion)** | **~12–13.5 hours** |
| **Total including Tier 3** | **~14.5–17 hours**, plus unbounded stakeholder-alignment time before Tier 3 can start |

Comparable in size to Phase 4C overall, but with a materially different risk shape: Phase 4C was almost entirely additive; roughly a third of this phase (Tier 2) and all of Tier 3 involve genuine schema/behavior changes, not pure additions — reflected throughout §2/§3/§6 above, not just in this estimate.
