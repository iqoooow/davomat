-- ==========================================
-- DAVOMAT TIZIMI - FULL DATABASE SETUP
-- ==========================================

-- 1. Jadvallarni yaratish
-- ------------------------------------------

-- Talabalar jadvali
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    group_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Davomat jadvali
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    sms_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_id, date)
);

-- 2. Xavfsizlik (RLS) Sozlamalari
-- ------------------------------------------

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Students uchun policy (Admin uchun hamma narsa ochiq)
CREATE POLICY "Enable all for authenticated users" ON students
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Attendance uchun policy
CREATE POLICY "Enable all for authenticated users" ON attendance
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 3. Storage (Rasmlar uchun) Sozlamalari
-- ------------------------------------------

-- 'avatars' bucketini yaratish
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Storage uchun xavfsizlik qoidalari
-- Rasmlarni hamma ko'rishi mumkin
CREATE POLICY "Public Access" ON storage.objects 
    FOR SELECT USING (bucket_id = 'avatars');

-- Rasmlarni faqat login qilganlar yuklay oladi
CREATE POLICY "Authenticated Upload" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Rasmlarni faqat login qilganlar o'chira oladi
CREATE POLICY "Authenticated Delete" ON storage.objects 
    FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ==========================================
-- SOZLASH YAKUNLANDI
-- ==========================================
