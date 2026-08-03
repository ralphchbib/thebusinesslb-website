# Deployment checklist

Status as of last verification run — update the checkboxes as you complete
each section. Sections are ordered by dependency; don't skip ahead.

- [x] **Supabase** — connected, migrated, 3 tables verified, write-tested
- [x] **Resend** — API key valid, sandbox delivery confirmed
- [ ] **Resend domain** — `thebusinesslb.com` not yet verified (blocks real sends)
- [x] **Git** — repo initialized locally, initial commit made, branch `main`
- [ ] **GitHub** — not yet pushed
- [ ] **Vercel** — not yet deployed
- [ ] **DNS (GoDaddy)** — domain purchased, no records added yet

---

## 1. Supabase (database) — ✅ done

Connected to `aws-0-ap-southeast-2.pooler.supabase.com:6543` via the
transaction pooler. Migrations applied. Verified live: all 3 tables, all 5
enums, all constraints/indexes, and real write-then-read round trips for
all three forms. Nothing left to do here before launch.

## 2. Resend (email) — API works, domain doesn't yet

The API key sends successfully — confirmed with real test deliveries. What's
outstanding is domain verification, without which any send `from` an
`@thebusinesslb.com` address fails with a 403.

**To fix:**
1. [resend.com/domains](https://resend.com/domains) → **Add Domain** →
   `thebusinesslb.com`.
2. Resend will show you 2–3 DNS records (typically one `TXT` for SPF, one
   or two `CNAME`/`TXT` for DKIM). **Copy the exact values Resend shows —
   they're unique to your account, don't reuse the ones below.**
3. Add them in GoDaddy: **godaddy.com → My Products → DNS** next to
   `thebusinesslb.com` → **Add** a record for each one Resend gave you,
   matching Type/Name/Value exactly. GoDaddy's "Name" field usually wants
   just the subdomain part (e.g. `resend._domainkey`, not the full
   `resend._domainkey.thebusinesslb.com`) — Resend's instructions page
   tells you which format it expects.
4. Back in Resend, click **Verify**. DNS propagation is usually minutes,
   occasionally up to ~30–60 min with GoDaddy specifically.
5. Once verified, in Vercel's env vars (see §5) set
   `RESEND_FROM_EMAIL=hello@thebusinesslb.com` — remove the sandbox value.

## 3. Git — ✅ done

Repository initialized at `web/` (this is the repo root — no monorepo
subfolder to configure later in Vercel). Initial commit made on branch
`main`. Confirmed clean: no `.env*` secrets, no `node_modules`, no `.next`
build output tracked.

## 4. GitHub — next action is yours

I don't have the GitHub CLI available in this environment, so repo creation
needs to happen in your browser. Exact steps:

1. Go to [github.com/new](https://github.com/new).
2. Repository name: `the-business-lb` (or your preference).
3. **Private** (recommended — it's your commercial codebase).
4. **Do not** check "Add a README" / "Add .gitignore" / "Choose a license"
   — this repo already has all of those; adding them on GitHub's side
   creates conflicting history with what's already committed locally.
5. Click **Create repository**. GitHub will show you a page with commands —
   ignore them, use these instead (they match what's already done locally):

   ```bash
   cd "C:\Users\Ralph Chbib\Desktop\THE-BUSINESS-LB\web"
   git remote add origin https://github.com/<your-username>/the-business-lb.git
   git push -u origin main
   ```

   Replace `<your-username>` with your actual GitHub username/org. If you'd
   rather use SSH: `git@github.com:<your-username>/the-business-lb.git`.

**Tell me once the repo exists on github.com and I'll run the two commands
above** (with your real username) — I won't push without you confirming the
repo is created and you're ready, per your instruction.

## 5. Vercel — after GitHub push

1. [vercel.com/new](https://vercel.com/new) → **Import** the GitHub repo you
   just created. (First time: Vercel will ask to install its GitHub App —
   that's a normal OAuth-style authorization on GitHub's side, done in your
   browser, not something I can or should do for you.)
2. Framework preset: **Next.js** — auto-detected, no changes needed. Root
   Directory: leave as `.` (default) — since the repo root *is* `web/`,
   there's no subfolder to point at.
3. **Environment Variables** — add each of these (Production environment;
   add to Preview too only if you're OK preview deploys writing real rows
   to the same Supabase project):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase pooler string (same one in `.env.local`) |
   | `RESEND_API_KEY` | same as `.env.local` |
   | `RESEND_FROM_EMAIL` | `hello@thebusinesslb.com` **once §2 is verified** — until then, `onboarding@resend.dev` |
   | `NOTIFICATION_EMAIL` | `ralphchbib2003@gmail.com` (or `hello@thebusinesslb.com` once that inbox exists) |
   | `NEXT_PUBLIC_SITE_URL` | `https://thebusinesslb.com` |
   | `NEXT_PUBLIC_WHATSAPP_NUMBER` | `96176126860` |
   | `IP_HASH_SALT` | `e64b40f7c436c65fb4c4573eb09436f42e800cee9708f421562b5b325612e52a` (already generated) or your own via `openssl rand -hex 32` |
   | `NEXT_PUBLIC_GA4_ID` | leave blank for now |
   | `NEXT_PUBLIC_META_PIXEL_ID` | leave blank for now |
   | `CALENDAR_BOOKING_URL` | leave blank for now |

4. Click **Deploy**. Build takes ~1–2 minutes. This will succeed even before
   DNS/domain is attached — Vercel gives you a working
   `the-business-lb-xxxx.vercel.app` URL immediately.
5. **Run the migration against production** (Vercel doesn't do this
   automatically — migrations are a deliberate, separate step):
   ```bash
   npm run db:migrate
   ```
   from your local machine with `.env.local`'s `DATABASE_URL` — since it's
   the same Supabase project, this has already been done. No action needed
   unless the schema changes later.

## 6. DNS at GoDaddy — connecting the domain to Vercel

Do this after the Vercel project exists (step 5), not before — Vercel needs
to know about the domain first so it can tell you the exact target values.

1. In Vercel: **Project → Settings → Domains** → type `thebusinesslb.com` →
   **Add**.
2. Vercel will show you exactly what to add — it's typically:

   | Type | Name | Value |
   |---|---|---|
   | `A` | `@` | `76.76.21.21` |
   | `CNAME` | `www` | `cname.vercel-dns.com` |

   **Use the exact values Vercel's dashboard shows you at that moment** —
   these are Vercel's standard values but they occasionally change or vary
   per account; don't copy the table above blindly without checking.
3. In GoDaddy: **My Products → DNS** next to `thebusinesslb.com**:
   - Find any existing `A` record on `@` (GoDaddy adds a parking-page one
     by default) → **Edit** → replace the value with Vercel's `A` record
     value. Don't add a second `@` record — GoDaddy only allows one `A`
     record per name.
   - **Add** a new record: Type `CNAME`, Name `www`, Value
     `cname.vercel-dns.com` (or whatever Vercel showed).
   - Remove/ignore GoDaddy's default "Parked" forwarding if it's still
     active (**Domain Settings → Forwarding**) — it will otherwise compete
     with the DNS records.
4. Back in Vercel, it auto-checks DNS every so often, or click **Refresh**.
   Typically 10–60 minutes with GoDaddy; can take up to 24–48h in rare cases
   if GoDaddy's own nameservers are slow to propagate.
5. Decide `www` vs apex as canonical: Vercel lets you set one as the
   primary and redirect the other. `NEXT_PUBLIC_SITE_URL` should match
   whichever you choose (affects canonical tags, sitemap, OG URLs).

## 7. HTTPS

No action needed beyond correct DNS. Once Vercel sees the domain's DNS
pointing at it, it automatically provisions a free TLS certificate via
Let's Encrypt and enables HTTPS — usually within minutes of DNS resolving
correctly. Vercel also auto-redirects `http://` → `https://`. You'll see a
padlock and "Valid Configuration" in **Settings → Domains** once it's done;
no separate action, no cost.

## 8. Post-deploy verification (on the real production URL)

Do these once DNS has propagated, in order:

1. Load `https://thebusinesslb.com` — confirm it renders (not the Vercel
   default page), padlock shows valid HTTPS.
2. Submit the assessment form with clearly-marked test data (e.g.
   `TEST — <your name>`). Confirm redirect to `/thank-you/assessment/`.
3. Supabase → **Table Editor → assessment_applications** → confirm the row
   landed with correct data.
4. Check the `NOTIFICATION_EMAIL` inbox for the notification. If it's
   missing, check **Vercel → Project → Logs** (or the specific function's
   logs) for a `[email:failed]` / `[email:error]` line — it names the exact
   reason.
5. Repeat steps 2–4 for the contact form and the newsletter form (footer).
6. Delete the test rows from Supabase (Table Editor → select → delete) so
   they don't sit alongside real leads.
7. Test on an actual phone, and specifically inside the Instagram/Facebook
   in-app browser if you'll be driving traffic from Instagram DMs — the
   spec calls this out explicitly as a common breakage point for other
   agency sites and it's worth the two minutes to confirm.

## Ongoing

- `npm run db:generate` after any change to `lib/db/schema.ts`, commit the
  new file under `drizzle/`, then `npm run db:migrate` against production
  before or right after deploying the code change that depends on it.
- Rotate `RESEND_API_KEY` and the Supabase database password periodically —
  both are plain secrets with full read/write access to real customer data.
- `.env.local` never leaves this machine unless you deliberately share it —
  it's gitignored and was never staged or committed (verified).
