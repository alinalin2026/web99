/* Runtime copy of schema.sql, for the browser-based /api/setup route.
   Kept as a TS string rather than reading schema.sql off disk, because a
   file read at request time isn't guaranteed to survive into the serverless
   bundle — a string literal always does.

   Must be kept in sync with schema.sql by hand. The only real difference is
   that CREATE TYPE is wrapped so this can be run safely more than once — the
   operator hitting the setup page twice by mistake must be harmless. */

export const SETUP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE order_state AS ENUM (
    'collecting', 'ready', 'analysing', 'generating',
    'review', 'live', 'sent', 'won', 'lost', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state           order_state NOT NULL DEFAULT 'collecting',

  business_name   text,
  trade           text,
  location        text,
  email           text,
  phone           text,

  conversation    jsonb NOT NULL DEFAULT '[]'::jsonb,
  brief           jsonb,
  analysis        jsonb,
  generated       jsonb,
  generator_notes text,

  slug            text UNIQUE,
  preview_url     text,
  commit_sha      text,

  stripe_session_id       text,
  stripe_payment_intent   text,
  paid_at                 timestamptz,

  retention       text CHECK (retention IN ('stayed', 'left')),

  failure_reason  text,
  approved_by     text,
  approved_at     timestamptz,
  sent_at         timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_state_idx    ON orders (state, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx    ON orders (email);
CREATE INDEX IF NOT EXISTS orders_expires_idx  ON orders (expires_at)
  WHERE state IN ('sent', 'live');

CREATE TABLE IF NOT EXISTS order_events (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind        text NOT NULL,
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
`;
