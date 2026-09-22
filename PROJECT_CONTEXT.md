# Web99 — Project Context

Read this first. This is the decision history and business model — the
"why" behind the codebase. For the actual current architecture, READ
`README.md` and `dashboard/README.md` IN FULL before touching anything —
they're authoritative and detailed; this doc summarizes and points to
them rather than duplicating them, and they take priority over anything
here that conflicts. Also read `dashboard/lib/prompts/pricing-and-services.md`
and `dashboard/lib/prompts/pre-delivery-checklist.md` for the exact rules
Sarah runs on.

## What Web99 is

"Get your business online for €99" — a website-building business for
Irish SMEs. The €99 site is a low-friction acquisition product, not the
real revenue driver. The real business is Sarah acting as the ongoing
digital-services interface — once a customer has a site, they come back
to Sarah whenever they need something and pay per request. No
retainers, no accounts, no monthly fees.

## Real architecture — corrected, read the READMEs for full detail

Production is **one AWS server**, not Vercel. Nginx serves the static
marketing site (repo root, hand-written HTML/CSS, built by root
`build.mjs`) directly, and proxies everything dynamic to the `dashboard/`
Next.js app on `127.0.0.1:3000`. One origin, one domain, no CORS.

A finished build is **not deployed anywhere** — it's a JSON blob stored
in Postgres (`orders.generated`), served live at `/demo/<slug>`. No
wildcard DNS, no per-customer subdomain. **GitHub is not part of how
customer builds get served** — `lib/github.ts`'s `pushSite()` still
commits to `sites/<slug>/` as a mirror/backup, but the real preview URL
always points at `/demo/<slug>`.

The pipeline is agent-driven, not a fixed sequence:
`chooseNextAction()` in `lib/master-pipeline.ts` looks at an order's
state and decides the next step; a background worker executes it.
`make_plan → prepare_studio → generate_images → build_site → automatic
QA + repair → live`. The plan is the one hard approval gate — an
operator reads/edits it before anything else runs. `autopilot`
(`manual`/`assisted`/`full`) controls how much runs without another
click. Every build gets two automatic QA passes (source + optional
visual) with an auto-repair loop before an operator ever sees it.

Model stack is unified on **OpenAI's Responses API** (`lib/ai.ts`) —
fast/reasoning/build/image tiers via env vars, not a Claude+GPT split.

**`dashboard/lib/capabilities.ts` is the single source of truth for
every promise made to a customer.** Every capability has a status:
`included` (part of €99), `addon` (real, priced), or `planned` (never
shown to any model — exists so it isn't forgotten, but can't be
promised). Changing what's sold is one line in that file, and it
propagates to every prompt automatically. `neverPromise` is the hard
override list. Note: the marketing site's own pricing copy lives
separately in root `site.config.mjs`, which is NOT read by
`capabilities.ts` — the two can drift, check both after any price/SLA
change.

The **Ops Agent** (`lib/ops-agent.ts`) is a separate, non-customer-facing
chat tool for diagnosing/repairing the AWS box itself through a fixed,
privileged tool list — not related to Sarah or the sales pipeline.

## Known real gaps — their own docs flag these, not fixed yet

- **Post-purchase domain handover isn't built.** A payment just flips
  `state` to `won` — nothing registers a real domain or moves the site
  off `/demo/<slug>`. This is the biggest gap between "the demo works"
  and a customer actually being live on their own domain.
- **Follow-up cron may not actually be running.** The `followups` table
  and `/api/cron/followups` route exist, but nothing confirmed is
  calling it on a schedule on the AWS box — the repo's `vercel.json`
  cron entries do nothing since this isn't deployed on Vercel.
- SPF/DKIM/DMARC on the sending domain — not confirmed done.
- One shared `ADMIN_PASSWORD`, no per-person logins.
- GDPR 90-day deletion is promised on the marketing site's privacy
  policy but not enforced by any code.
- `site.config.mjs` vs `capabilities.ts` can silently drift — no
  build-time link between them.

## Decided, not yet built

A **Telegram bot** is the planned post-purchase channel — WhatsApp
stays pre-sale only (Sarah, enquiries). Telegram chosen because its Bot
API supports real per-customer sessions and in-chat payments without a
WhatsApp Business API contract. Not built — `TELEGRAM_BOT_TOKEN` is the
only credential needed to start.

## The funnel

Ad → lead lands with Sarah (no quiz, plain conversation) → scoped
preview built (skeleton, no backend) → instant confirmation email the
moment Sarah captures their email → preview live for 48h → customer
pays → full details collected in one pass → real build within 5
business days of details received (not from payment) → 3 free edits
after delivery, then everything is a priced request.

## The 5 trade categories

Built into the analyst logic, each with pre-decided default tech:

- **Emergency** (plumber, electrician) — WhatsApp + call + email alert
  only. No chat, no booking.
- **Appointment** (barber, dentist) — Cal.com booking is the upsell.
- **Walk-in/hospitality** (café, restaurant) — WhatsApp + alert, chat
  is a minor upsell.
- **Considered purchases** (solicitor, builder) — AI chat is the
  strongest upsell fit.
- **Product sellers** (florist, bakery) — WhatsApp + alert mainly.

Standard on every site: WhatsApp button, email form alerts, Privacy
Policy + Cookie Policy. AI chat with an owner dashboard is always a
paid add-on.

## Ecommerce

Currently **not offered** — status `planned` in `capabilities.ts`, not
`included` or `addon`, so no model can promise it. Went through
several rounds (a €299 Shop Setup via Stripe Connect was fully spec'd
at one point) before landing here in favor of volume with simple
sites. If it comes back, Stripe Connect (customer's own account, no
keys ever shared with Web99) is the already-decided approach — don't
reintroduce sharing a customer's Stripe secret key, that pattern was
explicitly corrected once already in real customer correspondence.

## Working style worth knowing

Alin works entirely from his phone, no laptop, runs Amazon delivery
full-time alongside this. Multiple AI sessions (this chat, terminal
Claude/Claude Code, Fable) work on this codebase in parallel — always
fetch the current remote state before assuming what's there. Decisions
move fast and sometimes reverse — trust the most recent state in
`capabilities.ts` and `pricing-and-services.md` over anything that
sounds outdated, including parts of this doc.
