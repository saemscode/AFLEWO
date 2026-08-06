-- ============================================================
--  AFLEWO FOUNDATION MIGRATION
--  Run this entire script in the Supabase SQL Editor.
--  Project: rdovwkzopojjdupickri
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  0. CLEAN SLATE (Idempotency) - Drops everything before recreating
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.log_audition_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

DROP TABLE IF EXISTS public.donation_ledger CASCADE;
DROP TABLE IF EXISTS public.system_audit_logs CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.chapter_events CASCADE;
DROP TABLE IF EXISTS public.auditions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS audition_status CASCADE;
DROP TYPE IF EXISTS audition_category CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS donation_status CASCADE;

-- ────────────────────────────────────────────────────────────
--  1. ENUMS - Strict typing for roles and statuses
-- ────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'chapter_admin',
  'choir_member',
  'band_member',
  'volunteer',
  'applicant'
);

CREATE TYPE audition_status AS ENUM (
  'pending',
  'shortlisted',
  'accepted',
  'rejected'
);

CREATE TYPE audition_category AS ENUM (
  'choir_soprano',
  'choir_alto',
  'choir_tenor',
  'choir_bass',
  'band_keys',
  'band_guitar',
  'band_drums',
  'band_bass',
  'band_strings',
  'band_wind',
  'production_camera',
  'production_sound',
  'production_livestream',
  'volunteer_ushering',
  'volunteer_security',
  'volunteer_hospitality',
  'dance'
);

CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent',
  'excused',
  'late'
);

CREATE TYPE resource_type AS ENUM (
  'lyrics_pdf',
  'chord_chart_pdf',
  'vocal_stem_audio',
  'backing_track_audio',
  'rehearsal_video',
  'announcement',
  'other'
);

CREATE TYPE event_type AS ENUM (
  'main_event',
  'rehearsal',
  'audition',
  'prayer_circle',
  'outreach',
  'other'
);

CREATE TYPE donation_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'cancelled'
);

-- ────────────────────────────────────────────────────────────
--  2. CHAPTERS - Decentralization base
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.chapters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(100) UNIQUE NOT NULL,
  country      VARCHAR(100) NOT NULL DEFAULT 'Kenya',
  flag         VARCHAR(10),
  venue        TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  whatsapp_link TEXT,
  description  TEXT,
  status       VARCHAR(100) DEFAULT 'Active',
  established  VARCHAR(10),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
--  3. PROFILES - Linked to Supabase Auth users
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id           UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name    VARCHAR(255) NOT NULL DEFAULT '',
  email        VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(50),
  avatar_url   TEXT,
  role         user_role NOT NULL DEFAULT 'applicant',
  chapter_id   UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  bio          TEXT,
  privacy_consent BOOLEAN DEFAULT FALSE,
  privacy_consent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
--  CHAPTERS SECURITY POLICIES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Public can read chapters
CREATE POLICY "chapters_public_read"
  ON public.chapters FOR SELECT
  USING (true);

-- Only super_admins can insert/update/delete chapters
CREATE POLICY "chapters_super_admin_write"
  ON public.chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ────────────────────────────────────────────────────────────
--  PROFILES SECURITY POLICIES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profiles_self_read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Chapter admins can view profiles in their chapter
CREATE POLICY "profiles_chapter_admin_read"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS admin
      WHERE admin.id = auth.uid()
      AND admin.role IN ('chapter_admin', 'super_admin')
      AND (admin.chapter_id = profiles.chapter_id OR admin.role = 'super_admin')
    )
  );

-- Users can update their own profile
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Super admins can do everything
CREATE POLICY "profiles_super_admin_all"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ────────────────────────────────────────────────────────────
--  4. AUTO-PROVISION PROFILE ON SIGNUP (Trigger)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'AFLEWO Member'),
    NEW.email,
    'applicant'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
--  5. AUDITIONS TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.auditions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id   UUID NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
  category     audition_category NOT NULL,
  audio_url    TEXT,                         -- Cloudinary secure_url
  audio_public_id TEXT,                      -- Cloudinary public_id for deletion
  notes        TEXT,                         -- Applicant self-description
  status       audition_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes  TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, chapter_id, category)     -- One audition per person per role per chapter
);

ALTER TABLE public.auditions ENABLE ROW LEVEL SECURITY;

-- Applicants can see only their own auditions
CREATE POLICY "auditions_self_read"
  ON public.auditions FOR SELECT
  USING (auth.uid() = user_id);

-- Applicants can insert their own auditions
CREATE POLICY "auditions_self_insert"
  ON public.auditions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Applicants can update their own pending auditions
CREATE POLICY "auditions_self_update_pending"
  ON public.auditions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Chapter admins can view/update auditions in their chapter
CREATE POLICY "auditions_chapter_admin_manage"
  ON public.auditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin')
      AND (profiles.chapter_id = auditions.chapter_id OR profiles.role = 'super_admin')
    )
  );

-- ────────────────────────────────────────────────────────────
--  6. EVENTS / REHEARSALS TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.chapter_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  event_type   event_type NOT NULL DEFAULT 'rehearsal',
  location     TEXT,
  venue_url    TEXT,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ,
  is_virtual   BOOLEAN DEFAULT FALSE,
  virtual_link TEXT,
  is_public    BOOLEAN DEFAULT FALSE,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chapter_events ENABLE ROW LEVEL SECURITY;

-- Public events are visible to everyone
CREATE POLICY "events_public_read"
  ON public.chapter_events FOR SELECT
  USING (is_public = TRUE);

-- Authenticated choir/band members can see their chapter's events
CREATE POLICY "events_member_read"
  ON public.chapter_events FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.chapter_id = chapter_events.chapter_id
      AND profiles.role IN ('choir_member', 'band_member', 'chapter_admin', 'super_admin', 'volunteer')
    )
  );

-- Chapter admins can manage events in their chapter
CREATE POLICY "events_admin_manage"
  ON public.chapter_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin')
      AND (profiles.chapter_id = chapter_events.chapter_id OR profiles.role = 'super_admin')
    )
  );

-- ────────────────────────────────────────────────────────────
--  7. ATTENDANCE TRACKING
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.chapter_events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       attendance_status NOT NULL DEFAULT 'absent',
  marked_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes        TEXT,
  marked_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, user_id)               -- No double-marking
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Members can view their own attendance
CREATE POLICY "attendance_self_read"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

-- Chapter admins can manage attendance for their chapter
CREATE POLICY "attendance_admin_manage"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      JOIN public.chapter_events ON chapter_events.id = attendance.event_id
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin', 'volunteer')
      AND (profiles.chapter_id = chapter_events.chapter_id OR profiles.role = 'super_admin')
    )
  );

-- ────────────────────────────────────────────────────────────
--  8. RESOURCE LIBRARY - Access-tiered file vault
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.resources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  resource_type resource_type NOT NULL,
  file_url     TEXT NOT NULL,              -- Cloudinary secure_url
  file_public_id TEXT,                    -- Cloudinary public_id
  thumbnail_url TEXT,                     -- Auto-generated by Cloudinary
  file_size_bytes BIGINT,
  mime_type    VARCHAR(100),
  allowed_role user_role NOT NULL DEFAULT 'choir_member',
  chapter_id   UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  -- NULL chapter_id = global resource visible to all qualifying members
  song_title   VARCHAR(255),              -- If resource belongs to a specific song
  event_id     UUID REFERENCES public.chapter_events(id) ON DELETE SET NULL,
  uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Access control: role hierarchy check
CREATE POLICY "resources_role_access"
  ON public.resources FOR SELECT
  USING (
    is_active = TRUE AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Super admin sees all
        profiles.role = 'super_admin'
        -- Chapter admin sees all in their chapter + global
        OR (profiles.role = 'chapter_admin' AND (resources.chapter_id IS NULL OR profiles.chapter_id = resources.chapter_id))
        -- Choir member access
        OR (profiles.role IN ('choir_member', 'band_member') AND resources.allowed_role IN ('choir_member', 'band_member', 'applicant'))
        -- Applicant access (public resources)
        OR (profiles.role = 'applicant' AND resources.allowed_role = 'applicant')
      )
    )
  );

-- Admins can manage resources
CREATE POLICY "resources_admin_manage"
  ON public.resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin')
    )
  );

-- ────────────────────────────────────────────────────────────
--  9. REGISTRATIONS - Event attendee sign-ups + skeleton ticketing
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.chapter_events(id) ON DELETE CASCADE,
  full_name    VARCHAR(255) NOT NULL,
  email        VARCHAR(255),
  phone_number VARCHAR(50),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_in   BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ticket_ref   VARCHAR(20) UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Public: anyone can register for a public event
CREATE POLICY "registrations_public_insert"
  ON public.registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chapter_events
      WHERE chapter_events.id = registrations.event_id
      AND chapter_events.is_public = TRUE
    )
  );

-- Users can see their own registration
CREATE POLICY "registrations_self_read"
  ON public.registrations FOR SELECT
  USING (auth.uid() = user_id);

-- Admins/volunteers can manage check-ins
CREATE POLICY "registrations_admin_manage"
  ON public.registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('chapter_admin', 'super_admin', 'volunteer')
    )
  );

-- ────────────────────────────────────────────────────────────
--  10. SYSTEM AUDIT LOGS - Unalterable accountability trail
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.system_audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       VARCHAR(100) NOT NULL,      -- e.g. 'AUDITION_STATUS_UPDATE'
  target_table VARCHAR(100) NOT NULL,
  target_id    UUID NOT NULL,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can read audit logs
CREATE POLICY "audit_logs_super_admin_read"
  ON public.system_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Chapter admins can read their own chapter's logs
CREATE POLICY "audit_logs_chapter_admin_read"
  ON public.system_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = system_audit_logs.performed_by
      AND profiles.role = 'chapter_admin'
    )
  );

-- ────────────────────────────────────────────────────────────
--  11. AUDIT TRIGGER - Auto-log audition status changes
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audition_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.system_audit_logs (
      performed_by, action, target_table, target_id, old_values, new_values
    )
    VALUES (
      auth.uid(),
      'AUDITION_STATUS_UPDATE',
      'auditions',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'reviewed_at', NEW.reviewed_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audition_status_audit
  AFTER UPDATE ON public.auditions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audition_status_change();

-- ────────────────────────────────────────────────────────────
--  12. MPESA DONATION LEDGER - Async webhook capture
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.donation_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpesa_request_id VARCHAR(255) UNIQUE,     -- CheckoutRequestID from STK Push
  mpesa_receipt    VARCHAR(255),            -- MpesaReceiptNumber from callback
  amount_kes       NUMERIC(12, 2),
  phone_number     VARCHAR(20),
  account_ref      VARCHAR(100),            -- 'AFLEWO' or chapter name
  status           donation_status DEFAULT 'pending',
  raw_callback     JSONB,                   -- Full webhook payload (never lose data)
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  chapter_id       UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  matched_at       TIMESTAMPTZ,             -- When we matched it to a user profile
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.donation_ledger ENABLE ROW LEVEL SECURITY;

-- Users can see their own donations (after matching)
CREATE POLICY "donations_self_read"
  ON public.donation_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins see all
CREATE POLICY "donations_super_admin_all"
  ON public.donation_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ────────────────────────────────────────────────────────────
--  13. UPDATED_AT TRIGGER - Auto-update timestamps
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER auditions_updated_at BEFORE UPDATE ON public.auditions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.chapter_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER donations_updated_at BEFORE UPDATE ON public.donation_ledger FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
--  14. PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_profiles_chapter_id     ON public.profiles(chapter_id);
CREATE INDEX idx_profiles_role           ON public.profiles(role);
CREATE INDEX idx_auditions_user_id       ON public.auditions(user_id);
CREATE INDEX idx_auditions_chapter_id   ON public.auditions(chapter_id);
CREATE INDEX idx_auditions_status        ON public.auditions(status);
CREATE INDEX idx_attendance_event_id     ON public.attendance(event_id);
CREATE INDEX idx_attendance_user_id      ON public.attendance(user_id);
CREATE INDEX idx_resources_chapter_id   ON public.resources(chapter_id);
CREATE INDEX idx_resources_allowed_role ON public.resources(allowed_role);
CREATE INDEX idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX idx_events_chapter_id      ON public.chapter_events(chapter_id);
CREATE INDEX idx_events_starts_at       ON public.chapter_events(starts_at);
CREATE INDEX idx_audit_logs_target_id   ON public.system_audit_logs(target_id);
CREATE INDEX idx_audit_logs_created_at  ON public.system_audit_logs(created_at DESC);
CREATE INDEX idx_donations_mpesa_req    ON public.donation_ledger(mpesa_request_id);

-- ────────────────────────────────────────────────────────────
--  15. SEED: Initial AFLEWO Chapters
-- ────────────────────────────────────────────────────────────

INSERT INTO public.chapters (name, slug, country, flag, venue, contact_email, contact_phone, description, status, established) VALUES
  ('Nairobi',   'nairobi',   'Kenya',    '🇰🇪', 'Winners'' Chapel International, Likoni Road', 'nairobi@aflewo.org',   '+254 722 819 867', 'The inaugural chapter and global headquarters of the AFLEWO movement. Established in 2004.', 'Mother Chapter', '2004'),
  ('Mombasa',   'mombasa',   'Kenya',    '🇰🇪', 'JCC Bamburi Centre, Mombasa',                 'mombasa@aflewo.org',   '+254 741 200 009', 'Founded in 2009, AFLEWO Mombasa is the movement''s coastal pillar.', 'Prayer Circle', '2009'),
  ('Nakuru',    'nakuru',    'Kenya',    '🇰🇪', 'Deliverance Church Nakuru, Westside',         'nakuru@aflewo.org',    '+254 710 130 013', 'Birthed during the celebrated 1,000-Voice National Choir event of 2013.', 'Registration Open', '2013'),
  ('Eldoret',   'eldoret',   'Kenya',    '🇰🇪', 'Eldoret Regional Hub, Uganda Road',           'eldoret@aflewo.org',   '+254 725 314 500', 'Established in 2014 to extend the prophetic sound into the North Rift region.', 'Auditions Open', '2014'),
  ('Nyeri',     'nyeri',     'Kenya',    '🇰🇪', 'PCEA Nyamachaki, Nyeri',                      'nyeri@aflewo.org',     '+254 718 056 700', 'AFLEWO Nyeri was established in 2015 as the voice of the Mt. Kenya region.', 'Mt. Kenya Region', '2015'),
  ('Meru',      'meru',      'Kenya',    '🇰🇪', 'AIC Cathedral Meru',                          'meru@aflewo.org',      '+254 726 107 600', 'AFLEWO Meru was established in 2016 to give the Eastern Region a permanent place.', 'Eastern Region', '2016'),
  ('Machakos',  'machakos',  'Kenya',    '🇰🇪', 'Machakos People''s Park Grounds',             'machakos@aflewo.org',  '+254 733 450 011', 'Established in 2017, AFLEWO Machakos serves the Ukambani region.', 'Ukambani Region', '2017'),
  ('Kisumu',    'kisumu',    'Kenya',    '🇰🇪', 'Milimani SDA Church, Kisumu',                 'kisumu@aflewo.org',    '+254 700 572 000', 'AFLEWO Kisumu was established in 2015 as the movement''s anchor in the Lake Region.', 'Lake Region', '2015'),
  ('Tanzania',  'tanzania',  'Tanzania', '🇹🇿', 'CCC Upanga Church, Dar es Salaam',            'tanzania@aflewo.org',  '+255 754 810 200', 'AFLEWO Tanzania is the movement''s first international chapter, established in 2010.', 'Dar es Salaam', '2010'),
  ('Rwanda',    'rwanda',    'Rwanda',   '🇷🇼', 'Christian Life Assembly, Kigali',             'rwanda@aflewo.org',    '+250 788 314 567', 'AFLEWO Rwanda was established in 2014, the year of the 20th commemoration of the Rwandan Genocide.', 'Kigali Chapter', '2014'),
  ('Kampala',   'kampala',   'Uganda',   '🇺🇬', 'Watoto Church Kampala',                       'kampala@aflewo.org',   '+256 701 820 200', 'AFLEWO Kampala was established in 2018 as the movement''s Ugandan anchor.', 'Uganda Chapter', '2018')
ON CONFLICT (slug) DO NOTHING;
