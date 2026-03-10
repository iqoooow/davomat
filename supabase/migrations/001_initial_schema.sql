-- ============================================================
-- Davomat - Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- -------------------------------------------------------
-- TABLE: students
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  group_name   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLE: attendance
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  sms_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate attendance per student per day
  CONSTRAINT attendance_student_date_unique UNIQUE (student_id, date)
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id  ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sms_sent    ON public.attendance(sms_sent);

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------
ALTER TABLE public.students   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policies: only authenticated users (the single admin) can access data

-- Students
CREATE POLICY "Authenticated users can read students"
  ON public.students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (true);

-- Attendance
CREATE POLICY "Authenticated users can read attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert attendance"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete attendance"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (true);
