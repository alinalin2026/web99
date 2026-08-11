# Web99 — Pricing & Services Reference

This is the source of truth for what's included, what's extra, and what
things cost. Sarah quotes from this — nothing outside this list is ever
free, and nothing on this list is ever improvised.

## The rule

The €99 build is the acquisition product, not the business. Everything
past initial delivery is a paid request through Sarah. No retainers,
no accounts — customers pay only when they need something, and every
"something" has a fixed price here so it never has to be worked out live.

## Included in every €99 build (one-time, applies to any business type)

- The site itself — one front page + basic pages, built to what the
  customer describes
- Domain + hosting — first year included
- Facebook Page setup (logo, cover, category, basic info)
- Business email via Zoho (free tier — webmail, up to 5 addresses on
  their domain)
- 3 months of social content (written once, delivered as a batch)

This is the *entire* deliverable. No ecommerce, no bookings, no ongoing
edits, no admin panel for the customer to self-manage anything — all of
that is below.

## Renewal (starts at month 12)

- Domain + hosting renewal: **[SET PRICE]/year** — needs deciding before
  the first customer hits their 1-year mark, not after.

## Paid add-ons (quote these whenever a customer asks for more)

| Request | Price | Notes |
|---|---|---|
| Extra page | €49 | |
| Website content/copy update | €49–€99 | scope-dependent |
| SEO / content package | €99–€249 | |
| Landing page | €99–€149 | |
| 1 month of social posts (beyond the initial 3) | €49 | |
| One promotional article | €7 | |
| **Shop Setup** (ecommerce) | €149–€199 | see below — always separate from the base build |
| Additional products after Shop Setup | quote per batch | e.g. €29 per 5 extra products |
| AI chat / lead-gen tools | quote per project | |
| Ad campaign setup | quote per project | |
| Business email upgrade (IMAP/Outlook access) | ~€1/month | only if they specifically need it — Zoho Mail Lite |

Prices above are starting points — adjust as real jobs tell you what
things actually take, but never quote below cost.

## Ecommerce / "Shop Setup" — how it actually works

Ecommerce is **never** part of the €99 build. It's always a separate,
priced add-on, regardless of business type (shop, dance school selling
merch, whatever).

**Payments — always Stripe Connect (Express), never anything else:**
- The customer does Stripe's own guided onboarding via one link — email,
  bank details, basic ID. No API keys, no password ever shared with us.
- Money settles directly to their bank account. We are never in the
  payment flow and carry no payment liability.
- We build their product listings and Stripe Payment Links *for* them
  using their connected account.

**What's included in Shop Setup:**
- Stripe Connect onboarding walkthrough
- First batch of products built as static product cards linking to
  Stripe Payment Links (cap at ~10 products in the base Shop Setup price)

**What's explicitly not included, and not free:**
- No customer-facing admin/dashboard to self-manage products — that's
  real engineering we don't build per-customer yet. Every product
  change, price change, or new listing is a paid request through Sarah,
  same as everything else on this list.
- The customer is responsible for their own VAT/tax handling on sales
  through their own Stripe account — say this plainly up front so it's
  never a surprise later.

## What Sarah should never do

- Never promise something not on this list without a price attached
- Never treat "can you also add X" as free just because it sounds small
- Never quote ecommerce as part of the €99 — always name it as Shop
  Setup, separately priced
- Never accept or store a customer's Stripe API keys or password —
  Connect onboarding only
