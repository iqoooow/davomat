// Supabase Edge Function: sms-sender
// Location: supabase/functions/sms-sender/index.ts
// Deploy: supabase functions deploy sms-sender

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENV_ESKIZ_EMAIL = Deno.env.get("ESKIZ_EMAIL") || "";
const ENV_ESKIZ_PASSWORD = Deno.env.get("ESKIZ_PASSWORD") || "";
const ENV_ESKIZ_FROM = Deno.env.get("ESKIZ_FROM") || "4546";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fillTemplate(template: string, data: {
    ism: string; guruh: string; sana: string;
    bugun_yoq: number; oy_yoq: number; jami_yoq: number;
}): string {
    return template
        .replace(/\{ism\}/g, data.ism)
        .replace(/\{guruh\}/g, data.guruh)
        .replace(/\{sana\}/g, data.sana)
        .replace(/\{bugun_yoq\}/g, String(data.bugun_yoq))
        .replace(/\{oy_yoq\}/g, String(data.oy_yoq))
        .replace(/\{jami_yoq\}/g, String(data.jami_yoq));
}

async function getEskizToken(email: string, password: string): Promise<string> {
    const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data?.data?.token) throw new Error("Eskiz autentifikatsiya xatosi. Email va parolni tekshiring.");
    return data.data.token;
}

async function sendOneSms(token: string, phone: string, message: string, from: string): Promise<boolean> {
    const clean = phone.replace(/\D/g, '');
    const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ mobile_phone: clean, message, from }),
    });
    return res.ok;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const { date, template_id, specific_id, phone, message } = body;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Load settings from DB (fallback to env)
        const { data: settingsRows } = await supabase.from('sms_settings').select('key, value');
        const settings: Record<string, string> = {};
        (settingsRows || []).forEach((s: any) => { settings[s.key] = s.value; });
        const eskizEmail = settings['eskiz_email'] || ENV_ESKIZ_EMAIL;
        const eskizPassword = settings['eskiz_password'] || ENV_ESKIZ_PASSWORD;
        const eskizFrom = settings['eskiz_from'] || ENV_ESKIZ_FROM;

        // ── CASE 1: Direct custom SMS (from student profile) ─────────────────
        if (phone && message) {
            const token = await getEskizToken(eskizEmail, eskizPassword);
            const cleanPhone = phone.replace(/\D/g, '');
            const ok = await sendOneSms(token, cleanPhone, message, eskizFrom);
            await supabase.from('sms_history').insert({ phone: cleanPhone, message, status: ok ? 'sent' : 'failed' });
            if (!ok) throw new Error("SMS yuborishda xatolik");
            return new Response(JSON.stringify({ message: "SMS yuborildi" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── CASE 2: Single attendance record SMS ─────────────────────────────
        if (specific_id) {
            const { data: record, error } = await supabase
                .from('attendance')
                .select('id, date, student_id, students(full_name, parent_phone, groups(name))')
                .eq('id', specific_id)
                .single();
            if (error || !record) throw new Error("Yozuv topilmadi");

            const student = record.students as any;
            const recDate = new Date(record.date);
            const monthStart = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-01`;
            const sana = `${String(recDate.getDate()).padStart(2, '0')}.${String(recDate.getMonth() + 1).padStart(2, '0')}.${recDate.getFullYear()}`;

            const [{ count: oyYoq }, { count: jamiYoq }] = await Promise.all([
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('student_id', record.student_id).eq('status', 'absent').gte('date', monthStart),
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('student_id', record.student_id).eq('status', 'absent'),
            ]);

            const { data: tpls } = await supabase.from('sms_templates').select('body')
                .eq('type', 'daily').order('created_at', { ascending: true }).limit(1);
            const templateBody = tpls?.[0]?.body || `Hurmatli ota-ona, farzandingiz {ism} bugun darsga kelmadi.`;

            const filledMessage = fillTemplate(templateBody, {
                ism: student.full_name, guruh: student.groups?.name || '',
                sana, bugun_yoq: 1, oy_yoq: oyYoq || 0, jami_yoq: jamiYoq || 0,
            });

            const token = await getEskizToken(eskizEmail, eskizPassword);
            const ok = await sendOneSms(token, student.parent_phone, filledMessage, eskizFrom);

            if (ok) await supabase.from('attendance').update({ sms_sent: true }).eq('id', specific_id);
            await supabase.from('sms_history').insert({
                student_id: record.student_id,
                phone: student.parent_phone.replace(/\D/g, ''),
                message: filledMessage,
                status: ok ? 'sent' : 'failed',
            });

            return new Response(JSON.stringify({ message: ok ? "SMS yuborildi" : "SMS yuborishda xatolik" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── CASE 3: Bulk SMS for absent students on a date ───────────────────
        if (!date) throw new Error("'date' parametri majburiy");

        // Get template
        let templateBody = `Hurmatli ota-ona, farzandingiz {ism} bugun darsga kelmadi.`;
        if (template_id) {
            const { data: tpl } = await supabase.from('sms_templates').select('body').eq('id', template_id).single();
            if (tpl?.body) templateBody = tpl.body;
        } else {
            const { data: tpls } = await supabase.from('sms_templates').select('body')
                .eq('type', 'daily').order('created_at', { ascending: true }).limit(1);
            if (tpls?.[0]?.body) templateBody = tpls[0].body;
        }

        // Get absent students
        const { data: absents, error: fetchError } = await supabase
            .from('attendance')
            .select('id, student_id, students(full_name, parent_phone, groups(name))')
            .eq('date', date).eq('status', 'absent').eq('sms_sent', false);

        if (fetchError) throw fetchError;
        if (!absents || absents.length === 0) {
            return new Response(JSON.stringify({ message: "Yuborish uchun yangi yo'qliklar topilmadi" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const [year, month, day] = date.split('-');
        const sana = `${day}.${month}.${year}`;
        const monthStart = `${year}-${month}-01`;

        const token = await getEskizToken(eskizEmail, eskizPassword);
        let successCount = 0;

        for (const record of absents) {
            const student = record.students as any;

            const [{ count: oyYoq }, { count: jamiYoq }] = await Promise.all([
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('student_id', record.student_id).eq('status', 'absent').gte('date', monthStart),
                supabase.from('attendance').select('*', { count: 'exact', head: true })
                    .eq('student_id', record.student_id).eq('status', 'absent'),
            ]);

            const filledMessage = fillTemplate(templateBody, {
                ism: student.full_name, guruh: student.groups?.name || '',
                sana, bugun_yoq: 1, oy_yoq: oyYoq || 0, jami_yoq: jamiYoq || 0,
            });

            const ok = await sendOneSms(token, student.parent_phone, filledMessage, eskizFrom);
            if (ok) {
                await supabase.from('attendance').update({ sms_sent: true }).eq('id', record.id);
                successCount++;
            }
            await supabase.from('sms_history').insert({
                student_id: record.student_id,
                phone: student.parent_phone.replace(/\D/g, ''),
                message: filledMessage,
                status: ok ? 'sent' : 'failed',
            });
        }

        return new Response(JSON.stringify({ message: `${successCount} ta SMS muvaffaqiyatli yuborildi` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
    }
});
