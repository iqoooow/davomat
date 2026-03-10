-- ============================================================
-- Davomat — Student Groups (Many-to-Many) (Migration 004)
-- Run this in Supabase SQL Editor AFTER migration 003
-- ============================================================

-- Junction table: one student can be in multiple groups
CREATE TABLE IF NOT EXISTS public.student_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, group_id)
);

ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_student_groups"
    ON public.student_groups FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Migrate existing data: copy group_id from students into student_groups
INSERT INTO public.student_groups (student_id, group_id)
SELECT id, group_id FROM public.students
WHERE group_id IS NOT NULL
ON CONFLICT DO NOTHING;
