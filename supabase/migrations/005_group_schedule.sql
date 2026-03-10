-- 005_group_schedule.sql
-- Add schedule columns to groups and admin_phone to sms_settings

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS schedule_days   INTEGER[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_start  TIME,
  ADD COLUMN IF NOT EXISTS schedule_end    TIME,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Admin phone stored alongside other SMS settings
INSERT INTO public.sms_settings (key, value)
VALUES ('admin_phone', '')
ON CONFLICT (key) DO NOTHING;
