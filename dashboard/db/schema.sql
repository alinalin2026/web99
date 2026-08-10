-- ===========================================================================
-- WEB99 MASTER DASHBOARD — SCHEMA
-- Sarah lead intake + operator approvals + AI studio + durable background jobs.
-- Safe to re-run.
-- ===========================================================================

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
  qualification   text NOT NULL DEFAULT 'incomplete',
  workflow_stage  text NOT NULL DEFAULT 'new',
  autopilot       text NOT NULL DEFAULT 'assisted',
  plan_text       text,
  studio_copy     text,
  studio_data     jsonb,
  build_provider  text,
  build_job_id    text,
  qa_report       jsonb,
  version_no      integer NOT NULL DEFAULT 0,
  customer_status text NOT NULL DEFAULT 'new',
  followup_enabled boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qualification text NOT NULL DEFAULT 'incomplete';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'new';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS autopilot text NOT NULL DEFAULT 'assisted';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS plan_text text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS studio_copy text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS studio_data jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS build_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS build_job_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qa_report jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version_no integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_status text NOT NULL DEFAULT 'new';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS followup_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS orders_state_idx ON orders (state, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_stage_idx ON orders (workflow_stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_qual_idx ON orders (qualification, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email);
CREATE INDEX IF NOT EXISTS orders_expires_idx ON orders (expires_at) WHERE state IN ('sent', 'live');

CREATE TABLE IF NOT EXISTS order_events (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_events_created_idx ON order_events (created_at DESC);

CREATE TABLE IF NOT EXISTS project_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  asset_key   text NOT NULL,
  title       text NOT NULL,
  kind        text NOT NULL DEFAULT 'photo',
  size        text,
  prompt      text NOT NULL,
  status      text NOT NULL DEFAULT 'prompt_ready',
  data_url    text,
  error       text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, asset_key)
);
CREATE INDEX IF NOT EXISTS project_assets_order_idx ON project_assets (order_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS project_versions (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version_no  integer NOT NULL,
  generated   jsonb NOT NULL,
  commit_sha  text,
  preview_url text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, version_no)
);
CREATE INDEX IF NOT EXISTS project_versions_order_idx ON project_versions (order_id, version_no DESC);

CREATE TABLE IF NOT EXISTS followups (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  due_at      timestamptz NOT NULL,
  kind        text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  subject     text,
  body        text,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS followups_due_idx ON followups (status, due_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS jobs (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action      text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  attempts    integer NOT NULL DEFAULT 0,
  error       text,
  result      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  started_at  timestamptz,
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status, created_at);
CREATE INDEX IF NOT EXISTS jobs_order_idx ON jobs (order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_active_order_action_idx
  ON jobs (order_id, action) WHERE status IN ('queued','running');

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_touch ON orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS project_assets_touch ON project_assets;
CREATE TRIGGER project_assets_touch BEFORE UPDATE ON project_assets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
