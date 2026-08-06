-- ============================================================
--  AFLEWO - YEAR-JOINED ONBOARDING + min_tier BACKFILL FIX
--  Run AFTER migration-access-tiers-qr.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  0. FIX: resources.min_tier must reflect existing
--     allowed_role per row, not a flat 'member' default
-- ────────────────────────────────────────────────────────────

UPDATE public.resources
SET min_tier = 'public'
WHERE allowed_role = 'applicant';

UPDATE public.resources
SET min_tier = 'member'
WHERE allowed_role IN ('choir_member', 'band_member', 'volunteer');

-- volunteer/chapter_admin/super_admin scoped resources: leave at
-- the 'member' default - reachable by member tier and above.

-- ────────────────────────────────────────────────────────────
--  1. profiles.year_joined - required onboarding field
--     Nullable intentionally: adding NOT NULL now would break
--     existing rows before the app can backfill via the modal.
--     Enforce "required" at the app layer (YearJoinedModal)
--     until every active profile has a value, then tighten.
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS year_joined INT
    CHECK (year_joined >= 2004 AND year_joined <= EXTRACT(YEAR FROM NOW())::INT);

-- ────────────────────────────────────────────────────────────
--  2. onboarding_completed_at - cheap flag the modal checks
--     instead of re-deriving from year_joined every render
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────
--  3. Write-once guard - user can set year_joined once;
--     only a chapter_admin or super_admin can change it after.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_year_joined_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  IF OLD.year_joined IS NOT NULL AND NEW.year_joined IS DISTINCT FROM OLD.year_joined THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'super_admin'
      AND v_caller_role IS DISTINCT FROM 'chapter_admin' THEN
      RAISE EXCEPTION 'year_joined can only be corrected by an admin once set';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_year_joined_edit ON public.profiles;
CREATE TRIGGER guard_year_joined_edit
  BEFORE UPDATE OF year_joined ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_year_joined_edit();

-- ────────────────────────────────────────────────────────────
--  4. Sync year_joined → service_history
--     This is the ONLY path that writes service_history from
--     a user action. No direct self-insert RLS policy exists
--     on service_history - that would let users self-promote
--     into alumni tier by inserting arbitrary prior years.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_year_joined_to_service_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.year_joined IS NOT NULL
    AND (OLD.year_joined IS NULL OR OLD.year_joined IS DISTINCT FROM NEW.year_joined) THEN
    INSERT INTO public.service_history (user_id, chapter_id, year, role_at_time)
    VALUES (NEW.id, NEW.chapter_id, NEW.year_joined, NEW.role)
    ON CONFLICT (user_id, year) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_year_joined_to_service_history ON public.profiles;
CREATE TRIGGER sync_year_joined_to_service_history
  AFTER INSERT OR UPDATE OF year_joined ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_year_joined_to_service_history();

-- ────────────────────────────────────────────────────────────
--  5. Auto-stamp onboarding_completed_at on first year_joined write
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_onboarding_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.year_joined IS NOT NULL AND NEW.onboarding_completed_at IS NULL THEN
    NEW.onboarding_completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_onboarding_complete ON public.profiles;
CREATE TRIGGER mark_onboarding_complete
  BEFORE UPDATE OF year_joined ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_onboarding_complete();
