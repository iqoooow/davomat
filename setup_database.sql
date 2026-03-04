-- ==========================================
-- DAVOMAT TIZIMI - FULL DATABASE SETUP
-- ==========================================

-- 1. Jadvallarni yaratish
-- ------------------------------------------

-- Guruhlar jadvali
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Talabalar jadvali
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
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

-- SMS Shablonlar jadvali
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'daily' CHECK (type IN ('daily', 'monthly', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SMS Sozlamalar jadvali (key-value)
CREATE TABLE IF NOT EXISTS sms_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);

-- SMS Tarixi jadvali
CREATE TABLE IF NOT EXISTS sms_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Xavfsizlik (RLS) Sozlamalari
-- ------------------------------------------

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON groups
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON students
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON attendance
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON sms_templates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON sms_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON sms_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Default SMS sozlamalari
INSERT INTO sms_settings (key, value) VALUES
    ('eskiz_email', ''),
    ('eskiz_password', ''),
    ('eskiz_from', '4546')
ON CONFLICT (key) DO NOTHING;

-- 3. Storage (Rasmlar uchun) Sozlamalari
-- ------------------------------------------

INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ==========================================
-- MAVJUD BAZANI YANGILASH UCHUN (MIGRATION)
-- ------------------------------------------
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
-- ALTER TABLE students DROP COLUMN IF EXISTS group_name;
-- ==========================================
-- SOZLASH YAKUNLANDI
-- ==========================================
