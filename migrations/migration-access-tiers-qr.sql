-- ============================================================
--  AFLEWO - ACCESS TIER + QR TOKEN RECONCILIATION MIGRATION
--  Brings the live schema up to the governing-ruleset spec.
--  Additive only: no existing column is dropped or renamed,
--  no existing row's visible behavior changes on apply.
--
--  Run in: Supabase SQL Editor > New query > Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. ACCESS TIER - derived enum, never stored as a column
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE access_tier AS ENUM (
    'anonymous',
    'public',          -- signed in, no service history for any year
    'member',          -- signed in, service_history row for current_service_year
    'alumni',          -- signed in, prior service_history row(s) but none for current_service_year
    'chapter_admin',   -- profiles.role = 'chapter_admin'
    'super_admin'      -- profiles.role = 'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
--  2. SERVICE HISTORY - year-scoped membership record
--     Deliberately NOT named "alumni" - public.alumni already
--     exists as a curated showcase table, unrelated to tiers.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id   UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  year         INT NOT NULL CHECK (year >= 2004),
  role_at_time user_role,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, year)
);

ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;

-- User can read their own service history
DROP POLICY IF EXISTS "service_history_self_read" ON public.service_history;
CREATE POLICY "service_history_self_read"
  ON public.service_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all service history
DROP POLICY IF EXISTS "service_history_admin_manage" ON public.service_history;
CREATE POLICY "service_history_admin_manage"
  ON public.service_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_service_history_user_id ON public.service_history(user_id);
CREATE INDEX IF NOT EXISTS idx_service_history_year    ON public.service_history(year);

-- ────────────────────────────────────────────────────────────
--  3. SYSTEM SETTINGS - current_service_year lives here,
--     not hardcoded in a function body
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;
CREATE POLICY "system_settings_public_read"
  ON public.system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "system_settings_super_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_super_admin_write"
  ON public.system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

INSERT INTO public.system_settings (key, value)
VALUES ('current_service_year', '2026'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
--  4. resolve_access_tier() - SINGLE SOURCE OF TRUTH
--     Called by every RLS policy AND by the Next.js QR route.
--     Never re-implement tier logic anywhere else.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resolve_access_tier(uid UUID)
RETURNS access_tier
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role         user_role;
  v_current_year INT;
  v_has_current  BOOLEAN;
  v_has_any      BOOLEAN;
BEGIN
  -- No session = anonymous
  IF uid IS NULL THEN
    RETURN 'anonymous';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = uid;

  -- Profile not found = anonymous
  IF v_role IS NULL THEN
    RETURN 'anonymous';
  END IF;

  -- Privileged roles resolved first
  IF v_role = 'super_admin'   THEN RETURN 'super_admin';   END IF;
  IF v_role = 'chapter_admin' THEN RETURN 'chapter_admin'; END IF;

  -- Read current service year from settings (falls back to extract(year from now()) if missing)
  SELECT COALESCE(
    (SELECT (value ->> '{}')::INT FROM public.system_settings WHERE key = 'current_service_year'),
    EXTRACT(YEAR FROM NOW())::INT
  ) INTO v_current_year;

  -- Member: has a service_history row for this year
  SELECT EXISTS (
    SELECT 1 FROM public.service_history
    WHERE user_id = uid AND year = v_current_year
  ) INTO v_has_current;

  IF v_has_current THEN RETURN 'member'; END IF;

  -- Alumni: has any prior service_history row
  SELECT EXISTS (
    SELECT 1 FROM public.service_history WHERE user_id = uid
  ) INTO v_has_any;

  IF v_has_any THEN RETURN 'alumni'; END IF;

  RETURN 'public';
END;
$$;

-- ────────────────────────────────────────────────────────────
--  5. VISIBILITY STATE MACHINE - added to chapter_events
--     and resources. Defaults keep all existing rows at their
--     current visible behavior.
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE visibility_state AS ENUM (
    'hidden',              -- only visible to min_tier and above; below min_tier it doesn't exist
    'announced_not_open',  -- visible at min_tier+ with countdown; not yet actionable
    'open',                -- actionable (QR renders, link resolves) at min_tier+
    'closed'               -- archived; visible read-only to whoever saw it while open
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.chapter_events
  ADD COLUMN IF NOT EXISTS visibility_state visibility_state NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS min_tier access_tier NOT NULL DEFAULT 'public';

-- Backfill: existing is_public = false events must not suddenly become public-visible
UPDATE public.chapter_events
SET min_tier = 'member'
WHERE is_public = FALSE;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS visibility_state visibility_state NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS min_tier access_tier NOT NULL DEFAULT 'member';
-- resources already gated via allowed_role; min_tier defaults to 'member'
-- to match the existing RLS policy requiring auth.uid() IS NOT NULL.
-- allowed_role stays authoritative until explicit migration to min_tier.

-- ────────────────────────────────────────────────────────────
--  6. QR TOKENS - opaque lookup key + stable identity
--     fingerprint. Schema designed to never be changed once
--     real tokens exist in production.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.qr_tokens (
  -- The opaque lookup key: 22-char base62 random (~131 bits entropy).
  -- This is all that goes in the QR code - nothing decodable.
  token          TEXT PRIMARY KEY,

  -- HMAC-SHA256(SERVER_SECRET, user_id), base32-encoded, truncated to 16 bytes.
  -- Stable forever per user; safe to log and join on for analytics.
  -- At 128-bit output space, collision risk is negligible at any realistic AFLEWO scale.
  identity_fp    TEXT NOT NULL,

  -- Raw user_id - NEVER returned to the client or logged in analytics.
  -- Only identity_fp crosses the qr_tokens boundary in query results.
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  resource_type  TEXT NOT NULL
                   CHECK (resource_type IN ('chapter_registration', 'chapter_event', 'resource')),
  resource_id    UUID NOT NULL,

  tier_at_issue  access_tier NOT NULL,

  -- Stored per-token so individual resources can differ without a code branch.
  single_use     BOOLEAN NOT NULL DEFAULT TRUE,

  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ,       -- NULL until scanned (if single_use = true)
  scan_count     INT NOT NULL DEFAULT 0,

  -- Version the schema from day one so future migrations are unambiguous.
  schema_version SMALLINT NOT NULL DEFAULT 1
);

ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_tokens_self_read" ON public.qr_tokens;
CREATE POLICY "qr_tokens_self_read"
  ON public.qr_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "qr_tokens_admin_read" ON public.qr_tokens;
CREATE POLICY "qr_tokens_admin_read"
  ON public.qr_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin')
    )
  );

-- Insert is handled by the server-side route using the service-role key,
-- which bypasses RLS - this is intentional and safe because the route
-- re-checks tier via resolve_access_tier() immediately before any insert.

CREATE INDEX IF NOT EXISTS idx_qr_tokens_user_id     ON public.qr_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_identity_fp ON public.qr_tokens(identity_fp);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_resource    ON public.qr_tokens(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires_at  ON public.qr_tokens(expires_at);

-- ────────────────────────────────────────────────────────────
--  7. PER-CHAPTER ROLLOUT FLAG - lets each chapter migrate
--     off its Google Form link individually, no hard cutover.
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS qr_mode TEXT NOT NULL DEFAULT 'external'
  CONSTRAINT chapters_qr_mode_check CHECK (qr_mode IN ('external', 'internal'));

-- All existing chapters keep qr_mode = 'external' - their current forms.gle
-- links remain active until an admin flips a chapter to 'internal'.

-- ────────────────────────────────────────────────────────────
--  8. AFLEWO NIGHT Oct 2, 2026 - template only
--     Real venue + times must be confirmed before inserting.
--     Uncomment and fill in when confirmed.
-- ────────────────────────────────────────────────────────────

-- INSERT INTO public.chapter_events
--   (chapter_id, title, description, event_type, location, starts_at, ends_at,
--    is_public, visibility_state, min_tier)
-- SELECT
--   id,
--   'AFLEWO Night 2026',
--   'Continental all-night worship event - One God. One People. One Africa.',
--   'main_event',
--   'REPLACE_WITH_REAL_VENUE',
--   '2026-10-02 TT:TT:00+03',
--   '2026-10-03 TT:TT:00+03',
--   TRUE,
--   'announced_not_open',
--   'public'
-- FROM public.chapters WHERE slug = 'nairobi';
