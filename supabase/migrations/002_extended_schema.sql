-- ============================================================
-- Davomat — Extended Schema (Migration 002)
-- Run this in Supabase SQL Editor AFTER migration 001
-- ============================================================

-- -------------------------------------------------------
-- TABLE: groups
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- ALTER TABLE: students — add new columns
-- -------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS group_id  UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index for group lookups
CREATE INDEX IF NOT EXISTS idx_students_group_id ON public.students(group_id);

-- -------------------------------------------------------
-- TABLE: sms_templates
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a default template
INSERT INTO public.sms_templates (name, body)
VALUES (
  'Standart xabar',
  'Hurmatli ota-ona, farzandingiz {student_name} bugun {date} kuni darsga kelmadi. Iltimos, sababini bildiring.'
)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- TABLE: sms_settings  (key-value store)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.sms_settings (key, value)
VALUES
  ('sender_name', '4546'),
  ('auto_send', 'false'),
  ('auto_send_time', '09:00')
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------
-- TABLE: sms_history
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES public.students(id) ON DELETE SET NULL,
  phone       TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('sent', 'failed')) DEFAULT 'sent',
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_history_student_id ON public.sms_history(student_id);
CREATE INDEX IF NOT EXISTS idx_sms_history_sent_at    ON public.sms_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_history_status     ON public.sms_history(status);

-- -------------------------------------------------------
-- ROW LEVEL SECURITY for new tables
-- -------------------------------------------------------
ALTER TABLE public.groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_history   ENABLE ROW LEVEL SECURITY;

-- Groups
CREATE POLICY "auth_select_groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_groups" ON public.groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_groups" ON public.groups FOR DELETE TO authenticated USING (true);

-- SMS Templates
CREATE POLICY "auth_select_sms_templates" ON public.sms_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sms_templates" ON public.sms_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sms_templates" ON public.sms_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sms_templates" ON public.sms_templates FOR DELETE TO authenticated USING (true);

-- SMS Settings
CREATE POLICY "auth_select_sms_settings" ON public.sms_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sms_settings" ON public.sms_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sms_settings" ON public.sms_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sms_settings" ON public.sms_settings FOR DELETE TO authenticated USING (true);

-- SMS History
CREATE POLICY "auth_select_sms_history" ON public.sms_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sms_history" ON public.sms_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sms_history" ON public.sms_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sms_history" ON public.sms_history FOR DELETE TO authenticated USING (true);
