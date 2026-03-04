// Supabase Edge Function: sms-sender
// Location: supabase/functions/sms-sender/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ESKIZ_EMAIL = Deno.env.get("ESKIZ_EMAIL");
const ESKIZ_PASSWORD = Deno.env.get("ESKIZ_PASSWORD");
const ESKIZ_FROM = Deno.env.get("ESKIZ_FROM") || "4546";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { date } = await req.json();
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Get absent students for given date who haven't been sent SMS
        const { data: absents, error: fetchError } = await supabase
            .from('attendance')
            .select('id, students(parent_phone, full_name)')
            .eq('date', date)
            .eq('status', 'absent')
            .eq('sms_sent', false);

        if (fetchError) throw fetchError;
        if (!absents || absents.length === 0) {
            return new Response(JSON.stringify({ message: "No absents found to notify" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Get Eskiz Token
        const authRes = await fetch("https://notify.eskiz.uz/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: ESKIZ_EMAIL, password: ESKIZ_PASSWORD }),
        });
        const authData = await authRes.json();
        const token = authData.data.token;

        // 3. Send SMS for each student
        let successCount = 0;
        for (const record of absents) {
            const phone = record.students.parent_phone.replace(/\+/g, '');
            const name = record.students.full_name;
            const message = `Hurmatli ota-ona, farzandingiz ${name} bugun darsga kelmadi.`;

            const smsRes = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    mobile_phone: phone,
                    message: message,
                    from: ESKIZ_FROM
                }),
            });

            if (smsRes.ok) {
                // Update sms_sent status in DB
                await supabase
                    .from('attendance')
                    .update({ sms_sent: true })
                    .eq('id', record.id);
                successCount++;
            }
        }

        return new Response(JSON.stringify({ message: `${successCount} ta SMS muvaffaqiyatli yuborildi` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
