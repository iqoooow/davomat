import { supabase } from './supabaseClient';

export const uploadAvatar = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

export const getStudents = async (groupId = null) => {
    let query = supabase
        .from('students')
        .select('*, groups(id, name)')
        .order('full_name', { ascending: true });

    if (groupId) {
        query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const addStudent = async (student) => {
    const { data, error } = await supabase
        .from('students')
        .insert([student])
        .select('*, groups(id, name)');

    if (error) throw error;
    return data[0];
};

export const deleteStudent = async (id) => {
    const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
