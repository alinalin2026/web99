-- ===========================================================================
-- WEB99 DASHBOARD — SCHEMA
-- ---------------------------------------------------------------------------
-- One order per business that talks to Sarah. The order carries the whole
-- pipeline: the conversation, the extracted brief, the analyst's read, the
-- generated files, and every state change along the way.
--
-- Run once:  psql "$DATABASE_URL" -f db/schema.sql
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The pipeline, in order. An order only ever moves forward, except that
-- 'review' can send it back to 'generating' for a rebuild.
--
--   collecting  Sarah is still talking to them
--   ready       every required field answered; queued for the analyst
--   analysing   analyst is turning the conversation into a brief
--   generating  generator is building the site
--   review      BUILT, WAITING FOR A HUMAN. Nothing reaches a customer here.
--   live        approved, pushed, preview deployed
--   sent        preview link emailed to the customer
--   won         they paid
--   lost        they declined, or the preview expired unanswered
--   failed      something broke; needs a person
CREATE TYPE order_state AS ENUM (
  'collecting', 'ready', 'analysing', 'generating',
  'review', 'live', 'sent', 'won', 'lost', 'failed'
);

CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state           order_state NOT NULL DEFAULT 'collecting',

  -- Identity, as far as we know it. All nullable: Sarah fills these in over
  -- the course of a conversation and an abandoned chat is still a row.
  business_name   text,
  trade           text,
  location        text,
  email           text,
  phone           text,

  -- The full Sarah conversation: [{ role, content, at }]
  conversation    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Structured extraction, refreshed on every turn (see prompts/sarah.ts)
  brief           jsonb,
  -- The analyst's output (see prompts/analyst.ts)
  analysis        jsonb,
  -- The generator's file map: { "index.html": "...", ... }
  generated       jsonb,
  -- What the generator wanted a human to know
  generator_notes text,

  -- Logos, photos, documents they attached from /start:
  -- [{ url, filename, contentType, size, uploadedAt }]
  assets          jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Where it ended up
  slug            text UNIQUE,          -- barbers-drumcondra
  preview_url     text,                 -- https://barbers-drumcondra.web99.ie
  commit_sha      text,

  -- Money
  stripe_session_id       text,
  stripe_payment_intent   text,
  paid_at                 timestamptz,

  -- After they pay: did they stay with us or take it elsewhere?
  retention       text CHECK (retention IN ('stayed', 'left')),

  -- Ops
  failure_reason  text,
  approved_by     text,
  approved_at     timestamptz,
  sent_at         timestamptz,
  expires_at      timestamptz,          -- previews don't live forever
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Covers a table created before `assets` existed, since CREATE TABLE IF NOT
-- EXISTS above is a no-op against one that's already there.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assets jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS orders_state_idx    ON orders (state, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx    ON orders (email);
CREATE INDEX IF NOT EXISTS orders_expires_idx  ON orders (expires_at)
  WHERE state IN ('sent', 'live');

-- Every state change, every model call, every push. This is the audit trail —
-- when a site goes out wrong, this is how we find out which step did it.
CREATE TABLE IF NOT EXISTS order_events (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind        text NOT NULL,        -- state_change | model_call | push | email | error
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_touch ON orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
