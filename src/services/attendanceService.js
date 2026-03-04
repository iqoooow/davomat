import { supabase } from './supabaseClient';

export const getAttendanceByDate = async (date) => {
    const { data, error } = await supabase
        .from('attendance')
        .select('*, students(full_name, group_name)')
        .eq('date', date);

    if (error) throw error;
    return data;
};

export const saveAttendance = async (records) => {
    const { data, error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id, date' })
        .select();

    if (error) throw error;
    return data;
};

export const getAbsentWithoutSms = async (date) => {
    const { data, error } = await supabase
        .from('attendance')
        .select('*, students(full_name, parent_phone)')
        .eq('date', date)
        .eq('status', 'absent')
        .eq('sms_sent', false);

    if (error) throw error;
    return data;
};

export const updateSmsStatus = async (id, status) => {
    const { error } = await supabase
        .from('attendance')
        .update({ sms_sent: status })
        .eq('id', id);

    if (error) throw error;
};
