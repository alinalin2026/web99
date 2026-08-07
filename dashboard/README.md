# Web99 dashboard

The machinery behind the marketing site: Sarah's backend, the build pipeline,
and the review gate a person clicks before any generated website reaches a
customer.

The marketing site in the repo root stays exactly as it is — static, hand
written, no build step. This is a separate Next.js app, deployed separately.

## The pipeline

```
  Sarah (/start/)              dashboard
  ────────────────             ─────────
  collecting  ──► ready ──► analysing ──► generating ──► review
                                                            │
                                             ┌──────────────┴──────────────┐
                                             │        A PERSON LOOKS       │
                                             └──────────────┬──────────────┘
                                                            ▼
                                              live ──► sent ──► won / lost
```

Everything left of `review` is private and reversible. Everything right of it
is a real business's public website. Nothing crosses without a click.

| State | Means |
|---|---|
| `collecting` | Sarah is still talking to them |
| `ready` | every required field answered |
| `analysing` | turning the conversation into a build brief |
| `generating` | building the site |
| `review` | **built, waiting on a human** |
| `live` | approved and pushed; customer not emailed yet |
| `sent` | preview link emailed |
| `won` / `lost` | they paid / they didn't |
| `failed` | something broke |

## The one file that matters

`lib/capabilities.ts` is the single source of truth for every promise made to a
customer. Sarah's prompt, the analyst prompt and the generator prompt are all
built from it, so they cannot drift apart or offer something you don't sell.

Every capability carries a `status`:

- `included` — part of the €99. Offered freely.
- `addon` — real, deliverable, costs extra. Offered with its price.
- `planned` — **never shown to any model.** Sits in the file so it isn't
  forgotten, but no customer can be promised it.

Selling something new is one line in that file. Pulling something is flipping
it to `planned`. Both take effect everywhere at once.

`neverPromise` is the hard list — injected verbatim into every prompt, and it
overrides everything including a customer asking directly.

## Running it

```bash
cp .env.example .env.local     # fill it in
npm install
npm run db:init                # creates the tables
npm run dev
```

Node 20+. Postgres anywhere (Neon, Supabase, RDS).

## What still needs doing before real customers

- [ ] **Sending domain.** SPF, DKIM and DMARC on whatever sends the email, or
      "your website is live" lands in spam.
- [ ] **Preview subdomains.** `*.web99.ie` needs a wildcard DNS record and the
      hosting for `sites/<slug>/` wired up.
- [ ] **Domain registration.** Still manual. The €99 includes a domain in the
      customer's name, and nothing here registers it yet.
- [ ] **Stripe webhook.** Point it at `/api/stripe` and set
      `STRIPE_WEBHOOK_SECRET`.
- [ ] **Preview expiry.** `expires_at` is set but nothing acts on it yet — a
      cron needs to move stale `sent` orders to `lost`.
- [ ] **The nudge email.** Written (`lib/email.ts`) but nothing schedules it.
- [ ] **Per-person logins.** Access is currently one shared key. Fine for two
      people who trust each other; replace it before it's more than that.
- [ ] **GDPR.** This stores names, emails, phone numbers and business details
      for EU citizens. There's a privacy policy on the marketing site but it's
      an unvetted draft, and it predates this database existing.

## Costs, roughly

Each site is one analyst call and one generator call. On `gpt-4o` that's a few
cents of tokens per site — the generator call dominates because it emits a
whole website. Worth watching if volume climbs; the analyst can drop to a
smaller model long before the generator can.
