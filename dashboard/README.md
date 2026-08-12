# Web99 dashboard

The machinery behind the marketing site: Sarah's chat backend, the build
pipeline, and the operator screens that turn a conversation into a live
preview website.

The marketing site in the repo root stays exactly as it is — static, hand
written, no build step. This is a separate Next.js app, deployed separately,
talking to the marketing site's `/start/` page over `/api/chat`.

## The pipeline

Two different AI providers do two different jobs, split by an approval click
in between:

```
  Sarah (/start/, Claude)         dashboard (operator)
  ────────────────────────        ────────────────────
  collecting ──► ready ──► "Make the plan" ──► analysing ──► ready (plan attached)
                                                                    │
                                                     ┌──────────────┴──────────────┐
                                                     │   OPERATOR READS THE PLAN   │
                                                     └──────────────┬──────────────┘
                                                                    ▼
                                                    "Build + publish preview"
                                                                    │
                                                     generating (OpenAI builds
                                                     the site + images) ──► review
                                                                    │
                                                          pushed to <slug>.web99.ie
                                                                    ▼
                                                       live ──► sent ──► won / lost
```

**The approval boundary is the build plan, not the finished site.** Claude
(the same model Sarah runs on) turns the conversation into a build brief —
cheap, text-only, no site generated yet. An operator reads that plan. Only
after they click **"Build + publish preview"** does anything expensive
happen: OpenAI (`gpt-5.6`) writes the full HTML/CSS/JS and `gpt-image-2`
generates the logo and photos, and the result is pushed straight to
`<slug>.web99.ie` in the same action — `buildAndPublish()` in
`lib/pipeline.ts` calls `generate()` then `approve()` back to back.

There's still a manual, two-step path for when you want to see the built
files before they go live: `rebuild()` runs the OpenAI build and stops at
`review` without publishing, and a separate `approve()` call pushes it.
The order screen (`app/orders/[id]/actions.tsx`) exposes this as "Approve
and publish" vs "Build it again" when an order is sitting in `review`.

| State | Means |
|---|---|
| `collecting` | Sarah is still talking to them |
| `ready`, no plan | qualified lead, nobody has clicked "Make the plan" yet |
| `analysing` | Claude is turning the conversation into a build plan |
| `ready`, with plan | **plan built, waiting on an operator to read it** |
| `generating` | OpenAI is building the site and its images |
| `review` | site built, not yet pushed live (only reached via the manual `rebuild` path) |
| `live` | pushed to `<slug>.web99.ie`; customer not emailed yet |
| `sent` | preview link emailed |
| `won` / `lost` | they paid / they didn't |
| `failed` | the last plan or build attempt errored — retry from the same screen |

## The one file that matters

`lib/capabilities.ts` is the single source of truth for every promise made to
a customer. Sarah's prompt, the analyst/plan prompt and the OpenAI build
prompt are all built from it, so they cannot drift apart or offer something
you don't sell.

Every capability carries a `status`:

- `included` — part of the €99. Offered freely.
- `addon` — real, deliverable, costs extra. Offered with its price.
- `planned` — **never shown to any model.** Sits in the file so it isn't
  forgotten, but no customer can be promised it.

Selling something new is one line in that file. Pulling something is flipping
it to `planned`. Both take effect everywhere at once.

`neverPromise` is the hard list — injected verbatim into every prompt, and it
overrides everything including a customer asking directly.

The public site's own pricing/turnaround copy lives separately in
`site.config.mjs` at the repo root — that file is *not* read by anything in
here, so a change to `capabilities.ts` doesn't automatically update the
marketing site. If you change price, SLA or what's included, update both.

## How a customer site is stored and published

Every built site is a folder in one GitHub repo: `sites/<slug>/`. `lib/github.ts`
writes it as **one atomic commit** using the git data API (blobs → tree →
commit → ref) rather than the contents API, so a site is never left
half-written and a bad build is one revert away. The customer never touches
the files directly — every change is a commit.

Before a build goes live, `withPreviewFurniture()` injects a preview banner
and a buy-now closer into the HTML. Once they pay, `removePreviewFurniture()`
strips that block back out between the same fence markers it was inserted
between.

`lib/pipeline.ts`'s `validate()` runs a cheap safety net on every generated
build before it's shown as ready — checks for missing doctype/viewport/title,
wrong `<h1>` count, external script/image references, leftover placeholder
text, and language that reads like an invented claim (fake years of
experience, "award-winning", invented testimonials). Problems are logged
against the order but don't block the build; an operator sees the count.

## Running it

```bash
cp .env.example .env.local     # fill it in
npm install
npm run db:init                # creates the tables (needs psql — see below)
npm run dev
```

Node 20+. Postgres anywhere (Neon, Supabase, RDS).

```bash
npm run typecheck   # tsc --noEmit
npm test             # tsx --test test/*.test.mjs
```

### First-time setup from a phone, no terminal

`npm run db:init` needs `psql`, which isn't an option from a phone browser.
Once the app is deployed and every environment variable in `.env.example` is
set, log into the dashboard, then visit:

```
https://<your-deployment>/api/setup
```

in the same browser tab. It creates the tables and says so on the page.
Gated by `ADMIN_PASSWORD` like everything else, and safe to visit more than
once — hitting it twice by mistake does nothing harmful.

## What each provider is used for

Two AI providers, kept strictly separate (`lib/ai.ts` throws if an Anthropic
key ends up in the OpenAI slot or vice versa):

| Provider | Used for | Models |
|---|---|---|
| Anthropic | Sarah's chat, extracting the lead's details, the operator's build plan | `SARAH_MODEL`, `EXTRACT_MODEL`, `ANALYST_MODEL` in `.env.example` |
| OpenAI | The actual website (HTML/CSS/JS) and its images — only runs after an operator clicks "Build + publish" | `OPENAI_BUILD_MODEL` (`gpt-5.6`), `OPENAI_IMAGE_MODEL` (`gpt-image-2`) |

## DNS: the wildcard, explained

Every preview site needs its own address — `joes-barbers.web99.ie`,
`marys-florist.web99.ie` — one per order, created automatically, and there's
no way to add DNS records one at a time for each of them as orders come in.

A **wildcard record** says "anything dot web99.ie, send it here" in one line,
so every subdomain works before it even exists.

Where to add it: log into whoever **web99.ie is registered with** (not
Vercel — the domain's own registrar/DNS panel — Blacknight, Cloudflare,
GoDaddy, IE Domain Registry, wherever it was bought). Find the DNS records
page and add:

| Type | Name | Value |
|---|---|---|
| CNAME | `*` | `cname.vercel-dns.com` |

(`*` means "wildcard" — every subdomain, not the literal character.) Then in
the Vercel project that serves customer sites, add `*.web99.ie` as a domain —
Vercel will tell you if the CNAME target is different from the one above; use
whatever it shows you.

Same idea, one more row, for the dashboard:

| Type | Name | Value |
|---|---|---|
| CNAME | `dash` | `cname.vercel-dns.com` |

Then add `dash.web99.ie` as a domain on the **dashboard's** Vercel project,
and update `dashboardUrl` in the repo root's `site.config.mjs` to match once
it resolves — it currently points at the project's `*.vercel.app` URL as a
stopgap because the DNS record wasn't live yet.

DNS changes can take a few minutes to a few hours to take effect.

## Stripe webhook

Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

```
https://dash.web99.ie/api/stripe
```

(swap in whatever `APP_URL` actually is if `dash.web99.ie` isn't live yet —
the Vercel-assigned `*.vercel.app` URL works fine for testing). Select the
`checkout.session.completed` event. Stripe then shows you a signing secret
starting `whsec_` — that's `STRIPE_WEBHOOK_SECRET`.

## Meta Ads integration — built, off by default

`lib/meta.ts`, `lib/meta-conversions.ts` and `lib/meta-sales.ts` are a
server-only client for the Meta Marketing API (`app/meta/`, `/api/meta/*`),
used to create and review ad campaigns for web99.ie itself — not something
sold to customers.

Every campaign/ad set/ad it creates is created **paused**. Turning one live
needs `META_ALLOW_LAUNCH=true` in the environment *and* an explicit
confirmation at the API layer — a campaign cannot go live from a single
accidental click. Leave `META_ALLOW_LAUNCH` unset (or `false`) unless you're
deliberately about to spend money.

## The Telegram bot — planned, not built

Decision made: WhatsApp stays the pre-sale channel (Sarah, enquiries, the
free small updates). A **Telegram bot** is the post-purchase channel — tied to
one paying customer's one order — for editing the site and buying add-ons
(content assistant, articles, SEO once that's scoped). Telegram over WhatsApp
here because its Bot API supports real per-customer sessions and in-chat
payments without a WhatsApp Business API contract.

Not built yet. When it is: `TELEGRAM_BOT_TOKEN` in `.env.example` is the only
credential needed to start, a webhook at `/api/telegram`, and it reads the
same `lib/capabilities.ts` as everything else — so an add-on it can sell is
still just a status flip in one file, same as everywhere.

## What still needs doing before real customers

- [ ] **Sending domain.** SPF, DKIM and DMARC on whatever sends the email, or
      "your website is live" lands in spam. Not yet confirmed done.
- [ ] **Wildcard DNS** — see above.
- [ ] **Domain registration.** Still manual. The €99 includes a domain in the
      customer's name, and nothing here registers it yet.
- [ ] **Stripe webhook** — see above.
- [x] **Preview expiry.** `/api/cron/expire-previews`, scheduled daily in
      `vercel.json`. Set `CRON_SECRET` (any long random string) for it to run —
      Vercel sends it back as `Authorization: Bearer <value>` automatically once
      it's set. Once daily is Vercel Hobby's cron limit, so "48 hours" is
      enforced to within about a day, not to the minute.
- [ ] **The nudge email.** Written (`lib/email.ts`) but nothing schedules it.
- [ ] **The Telegram bot** — see above.
- [ ] **Per-person logins.** Access is currently one shared key
      (`ADMIN_PASSWORD`). Fine for two people who trust each other; replace it
      before it's more than that.
- [ ] **GDPR.** This stores names, emails, phone numbers and business details
      for EU citizens. There's a privacy policy on the marketing site but it's
      an unvetted draft, and the 90-day-deletion promise it makes isn't
      enforced by any code here yet.
- [ ] **`site.config.mjs` vs `capabilities.ts` drift.** They are two separate
      files with no build-time link between them — see "The one file that
      matters" above. Check them against each other after any pricing or SLA
      change.

## Costs, roughly

Each site costs one Claude call (the plan) and, only after an operator
approves it, one OpenAI call (the build) plus however many `gpt-image-2`
images it requests. The plan is cheap — a few thousand tokens of text. The
build call dominates because it emits a whole website's worth of HTML/CSS/JS
in one response; the images are priced per image on top of that. Worth
watching if volume climbs — the Sarah/extraction models already run on the
cheapest tier (`claude-haiku-4-5`) for exactly this reason.
