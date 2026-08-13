# Web99 dashboard

The machinery behind the marketing site: Sarah's chat backend, the
plan/copy/image/build pipeline, and the operator screens at `/control` that
watch it happen.

The marketing site in the repo root stays exactly as it is — static, hand
written, no build step. This app is the dynamic half of the same domain: see
`../ops/README.md` for how one AWS box serves both from one Nginx front door.

## Where this actually runs

Production is **one AWS server**, not Vercel. Nginx serves the static
marketing site directly from the deployed release and proxies everything
dynamic straight through to this Next.js app on `127.0.0.1:3000`:

| URL | Served by |
|---|---|
| `web99.ie/` | the static marketing site |
| `web99.ie/start/` | the static site, chatting to Sarah over `/api/chat` |
| `web99.ie/control` | this app — the operator dashboard (`basePath: "/control"` in `next.config.mjs`) |
| `web99.ie/api/*` | this app, aliased at the root by Nginx so the marketing site can call it same-origin |
| `web99.ie/demo/<slug>` | this app, serving a generated site straight out of Postgres |
| `web99.ie/buy/<id>` | this app, Stripe checkout |

Because it's all one origin, `site.config.mjs`'s `dashboardUrl` at the repo
root is empty — no CORS, no wildcard DNS, no second hostname to keep in
sync. Deploys are `sudo /srv/web99/current/ops/deploy.sh`, which builds,
tests and smoke-tests a new release before an atomic symlink swap; nothing
here goes live from a `git push` alone. Read `../ops/README.md` first for
the full runtime shape (Nginx, the worker, backups, health checks) — this
file only covers the app itself.

## The pipeline

Nothing generated or spent happens without an operator approving the plan
first — that's still the one hard rule. Everything after it is driven by an
**agent controller** (`chooseNextAction` in `lib/master-pipeline.ts`) rather
than a fixed sequence of button clicks: given an order's current state it
decides the one next step, a background worker executes it, and the operator
screen just shows where things are and can steer or approve at any point.

```
 Sarah (OpenAI, /start/)
        │
        ▼
  collecting ──► ready (qualified lead)
        │
   operator clicks "Send to Web99" (or autopilot does it automatically)
        │
        ▼
  ┌─────────────────────────── background worker, one job at a time ──────────────────────────┐
  │                                                                                              │
  │  make_plan ──► prepare_studio ──► generate_images ──► build_site ──► automatic QA + repair   │
  │  (OpenAI writes  (turns the plan    (gpt-image-2,      (OpenAI writes            │           │
  │   the strategy    into final copy    one call per        the whole site,         ▼           │
  │   plan; operator   + image prompts)  asset)              file by file)     deployed, state='live'
  │   reads/edits it)                                                                             │
  └──────────────────────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
  sent ──► won / lost
```

The **plan** is still the approval gate: `makeMasterPlan()` is cheap
(text only), an operator reads and can edit `plan_text` before anything else
runs. Once approved, `autopilot` (`manual` / `assisted` / `full` on the
order) decides how much of the rest happens without another click —
`assisted` and `full` chain straight through image generation and the build;
`manual` stops after each step for a human to say go.

Every build gets **two rounds of QA for free**: `sourceQa()` (an OpenAI pass
over the generated code, chunked so large sites don't blow the context
window, plus the same static `validate()` checks the old pipeline used —
missing doctype, wrong `<h1>` count, external script/image refs, invented
claims like fake "years of experience" or testimonials) and, if
`VISUAL_QA_URL` is configured, a screenshot-based visual pass. If either
finds a critical/major issue, `repairFromQa()` sends the flagged files back
through OpenAI once with the QA report attached, then re-checks — this is
automatic and happens before the operator ever sees the build.

| `state` | Means |
|---|---|
| `collecting` | Sarah is still talking to them |
| `ready` | qualified lead — has a plan once `plan_text` is set |
| `analysing` | OpenAI is writing the plan |
| `generating` | OpenAI is building/repairing the site |
| `live` | deployed — `generated`, `preview_url` and `qa_report` are all set |
| `sent` | preview link emailed to the customer |
| `won` / `lost` | they paid / they didn't |
| `failed` | the last step errored — `failure_reason` says what; retry from the order screen |

`workflow_stage` is the finer-grained sibling of `state` (`planning`,
`plan_ready`, `building`, `qa`, `job_failed`, …) — what actually drives the
operator screen's copy; `state` is the coarser one other systems (Stripe,
email, the old `review`/`won`/`lost` reporting) key off.

## Where a build actually lives

There is **no wildcard DNS and no per-customer subdomain**. A finished build
is a JSON blob (`orders.generated`, one string per file) stored straight in
Postgres. `app/demo/[slug]/[[...path]]/route.ts` serves it live — publicly,
listed in `middleware.ts`'s `PUBLIC` array — rewriting root-relative URLs so
a site authored as if it lived at a domain root works correctly under
`/demo/<slug>/`. `app/preview/[slug]/...` is the same mechanism, gated
behind operator login, for looking at a build before it's sent.

`lib/github.ts`'s `pushSite()` still runs on every deploy and still writes
`sites/<slug>/` as one atomic commit — but per `.env.example` ("GitHub is
NOT part of customer builds or preview publishing anymore") and
`worker.ts`'s `normalizePreviewUrl()` (which immediately overwrites
`preview_url` back to the `/demo/<slug>` form and clears `commit_sha`), the
GitHub push is no longer what a customer's preview link actually points at.
Leave `GITHUB_TOKEN` unset unless you're deliberately using it as a
mirror/backup — it isn't required for the pipeline to work.

**What happens after a customer pays is still manual.** The Stripe webhook
only flips `state` to `won`; nothing here registers a real domain or moves
the site off `/demo/<slug>` onto it. That handover is the biggest gap
between "the demo works" and "a customer is actually live on their own
domain" — see the checklist at the bottom.

## The one file that matters

`lib/capabilities.ts` is the single source of truth for every promise made
to a customer. Sarah's prompt, the plan prompt, the Studio copy prompt and
the build prompt are all built from it, so they cannot drift apart or offer
something you don't sell.

Every capability carries a `status`:

- `included` — part of the €99. Offered freely.
- `addon` — real, deliverable, costs extra. Offered with its price.
- `planned` — **never shown to any model.** Sits in the file so it isn't
  forgotten, but no customer can be promised it.

Selling something new is one line in that file. Pulling something is
flipping it to `planned`. Both take effect everywhere at once.

`neverPromise` is the hard list — injected verbatim into every prompt, and
it overrides everything including a customer asking directly.

The public site's own pricing/turnaround copy lives separately in
`site.config.mjs` at the repo root — that file is *not* read by anything in
here, so a change to `capabilities.ts` doesn't automatically update the
marketing site. If you change price, SLA or what's included, update both.

## What each model tier is for

One provider now — OpenAI's Responses API for everything, `lib/ai.ts`. Two
cost tiers, picked per call:

| Env var | Used for |
|---|---|
| `OPENAI_FAST_MODEL` (`gpt-5-mini`) | Sarah's chat, extracting lead details |
| `OPENAI_REASONING_MODEL` (`gpt-5.1`) | the strategy plan, Studio copy, QA, `chooseNextAction`'s controller |
| `OPENAI_BUILD_MODEL` | writing the site's actual code |
| `OPENAI_IMAGE_MODEL` (`gpt-image-2`) | logos and photos |

`OPENAI_STUDIO_MODEL`, `OPENAI_QA_MODEL` and `OPENAI_AGENT_MODEL` each fall
back to `OPENAI_REASONING_MODEL` if unset, so one env var can move the whole
system to a new default model.

## The Ops Agent — a chat console for the server itself

`lib/ops-agent.ts` + `/api/ops-agent` is a *second*, separate assistant —
not customer-facing at all. It's a chat interface an operator can use to
diagnose and repair the AWS box itself (release status, logs, restarts,
config restore, deploys) through a fixed tool list, calling a small
privileged helper script (`WEB99_OPS_HELPER`,
`/usr/local/libexec/web99-ops-tool` by default) rather than an open shell.
It deliberately refuses to read or reveal secrets, and mutating actions only
run when the operator actually asked for a fix/restart/deploy. Bypasses the
normal login redirect in `middleware.ts` (it does its own bearer/cookie
check and needs to return JSON, not an HTML redirect) but is not public —
see `requireOperator`-equivalent checks inside the route itself.

## Running it locally

```bash
cp .env.example .env.local     # fill it in
npm install
npm run db:init                # creates the tables (needs psql — see below)
npm run dev                    # the app, port 3000
npm run worker                 # separately: the background worker
```

Node 20+. Postgres anywhere (Neon, Supabase, RDS, or the same box as
production).

```bash
npm run typecheck   # tsc --noEmit
npm test             # tsx --test test/*.test.mjs
npm run build        # next build — also what ops/deploy.sh runs before going live
```

### First-time setup from a phone, no terminal

`npm run db:init` needs `psql`, which isn't an option from a phone browser.
Once the app is deployed and every environment variable in `.env.example` is
set, log into `/control`, then visit:

```
https://web99.ie/control/api/setup
```

in the same browser tab. It creates the tables and says so on the page.
Gated by `ADMIN_PASSWORD` like everything else, and safe to visit more than
once — hitting it twice by mistake does nothing harmful. In production,
`ensureMasterSchema()` in `lib/db.ts` also runs the migration automatically
on first request, so a fresh database self-heals without this either.

## Stripe webhook

Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

```
https://web99.ie/api/stripe
```

Select the `checkout.session.completed` event. Stripe then shows you a
signing secret starting `whsec_` — that's `STRIPE_WEBHOOK_SECRET`.

## Add-on Payment Links

Everything a customer buys after the initial €99 site (an extra page, a
renewal, a one-off Facebook post…) is a plain Stripe **Payment Link**, not
the dynamic Checkout Session `buy/[id]/route.ts` uses for the site itself —
fixed price, no per-order line items needed.

- `lib/payment-links.ts` — the catalogue (`ADDONS`), source-priced from
  `lib/prompts/pricing-and-services.md`, plus `paymentLinkUrl(key, orderId)`
  which appends `?client_reference_id=<orderId>` so the webhook knows which
  order paid. Always use that helper when showing a link to a specific
  customer (email, the site, wherever) — a bare Payment Link URL can't be
  traced back to an order.
- `scripts/setup-addon-links.ts` (`npm run setup:addon-links`) creates the
  actual Product/Price/Payment Link in Stripe for anything in `ADDONS` that
  doesn't have one yet (or whose price changed), and writes the result into
  `lib/payment-links.generated.ts`. Safe to rerun — it only touches what's
  missing or stale. Needs `STRIPE_SECRET_KEY`.
- The webhook (`app/api/stripe/route.ts`) checks `session.payment_link`
  against that generated file first, before falling through to the original
  €99-purchase handling. A match enqueues `addon_<key>` on the paying
  order (`enqueueJob`) and logs an `addon_paid` event — it does **not**
  change the order's `state`.
- `worker.ts` picks up `addon_<key>` jobs, but there's no automated
  fulfilment behind them yet — it just logs an `addon_purchased` event on
  the order (visible on `/orders/[id]`) and completes the job. Writing the
  actual Facebook post, extra page, etc. is still a person's job for now;
  this only guarantees a paid add-on is never silently missed.
- **`email-upgrade` (~€1/month) is a judgement call, not a confirmed
  decision.** It's set up as a one-time €1 Payment Link the customer would
  repeat manually, matching every other item here and the site's
  "no subscriptions" stance — but if the intent was a real auto-billed
  monthly subscription, that needs a different setup (a Stripe subscription
  Price, a Customer object, `invoice.paid` webhook handling) that doesn't
  exist yet. Confirm which one before relying on it.

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
free small updates). A **Telegram bot** is the post-purchase channel — tied
to one paying customer's one order — for editing the site and buying
add-ons. Telegram over WhatsApp here because its Bot API supports real
per-customer sessions and in-chat payments without a WhatsApp Business API
contract.

Not built yet. When it is: `TELEGRAM_BOT_TOKEN` in `.env.example` is the
only credential needed to start, a webhook at `/api/telegram`, and it reads
the same `lib/capabilities.ts` as everything else.

## What still needs doing before real customers

- [ ] **Post-purchase domain handover.** `won` only flips a database column.
      Nothing here registers a real domain or moves the site off
      `/demo/<slug>` — this is the single biggest gap between "the demo
      works" and "a paying customer is actually live on their own domain."
- [ ] **Sending domain.** SPF, DKIM and DMARC on whatever sends the email, or
      "your website is live" lands in spam. Not yet confirmed done.
- [ ] **The nudge/follow-up email.** `followups` table and
      `/api/cron/followups` exist; confirm something is actually calling
      that route on a schedule on the AWS box (the repo's `vercel.json`
      cron entries do nothing here — this isn't deployed on Vercel).
- [ ] **The Telegram bot** — see above.
- [ ] **Per-person logins.** Access is currently one shared key
      (`ADMIN_PASSWORD`). Fine for two people who trust each other; replace
      it before it's more than that.
- [ ] **GDPR.** This stores names, emails, phone numbers and business
      details for EU citizens. There's a privacy policy on the marketing
      site but it's an unvetted draft, and the 90-day-deletion promise it
      makes isn't enforced by any code here yet.
- [ ] **`site.config.mjs` vs `capabilities.ts` drift.** They are two
      separate files with no build-time link between them — see "The one
      file that matters" above. Check them against each other after any
      pricing or SLA change.
- [x] **Sarah/dashboard business-model consistency.** Two-phase prompt,
      48h/5-day SLAs, no ecommerce, free-forever small edits, €45/€15
      renewals — matched between `capabilities.ts`, `sarah.ts` and the
      repo-root marketing site as of this commit.

## Costs, roughly

Every order costs at minimum one plan call and one build call, both on the
reasoning-tier model, plus one image call per asset. QA adds one or two more
reasoning-tier calls, and a failed QA pass adds one repair call. The build
call dominates — it emits a whole website's source in one response. Sarah
and extraction stay on the fast/cheap tier deliberately, since those run on
every single lead regardless of whether they ever convert.
