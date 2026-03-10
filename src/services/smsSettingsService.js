import { supabase } from './supabaseClient';

// ── Templates ────────────────────────────────────────────────────────────────

export const getTemplates = async () => {
    const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const getApprovedTemplates = async () => {
    const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const approveTemplate = async (id) => {
    const { error } = await supabase
        .from('sms_templates')
        .update({ status: 'approved' })
        .eq('id', id);
    if (error) throw error;
};

export const rejectTemplate = async (id) => {
    const { error } = await supabase
        .from('sms_templates')
        .update({ status: 'rejected' })
        .eq('id', id);
    if (error) throw error;
};

export const addTemplate = async (template) => {
    const { data, error } = await supabase
        .from('sms_templates')
        .insert([template])
        .select();
    if (error) throw error;
    return data[0];
};

export const updateTemplate = async (id, updates) => {
    const { data, error } = await supabase
        .from('sms_templates')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
};

export const deleteTemplate = async (id) => {
    const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = async () => {
    const { data, error } = await supabase
        .from('sms_settings')
        .select('key, value');
    if (error) throw error;
    // Return as {key: value} object
    const result = {};
    (data || []).forEach(row => { result[row.key] = row.value; });
    return result;
};

export const saveSetting = async (key, value) => {
    const { error } = await supabase
        .from('sms_settings')
        .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
};

export const saveSettings = async (settingsObj) => {
    const rows = Object.entries(settingsObj).map(([key, value]) => ({ key, value }));
    const { error } = await supabase
        .from('sms_settings')
        .upsert(rows, { onConflict: 'key' });
    if (error) throw error;
};

// ── SMS History ───────────────────────────────────────────────────────────────

export const getSmsHistory = async (studentId = null) => {
    let query = supabase
        .from('sms_history')
        .select('*, students(full_name)')
        .order('sent_at', { ascending: false })
        .limit(100);

    if (studentId) {
        query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};
