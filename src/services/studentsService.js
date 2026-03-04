import { supabase } from './supabaseClient';

export const uploadAvatar = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

export const getStudents = async () => {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true });

    if (error) throw error;
    return data;
};

export const addStudent = async (student) => {
    const { data, error } = await supabase
        .from('students')
        .insert([student])
        .select();

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
