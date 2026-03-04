import { supabase } from './supabaseClient';

export const getGroups = async () => {
    const { data, error } = await supabase
        .from('groups')
        .select('*, students(count)')
        .order('name', { ascending: true });

    if (error) throw error;
    return data;
};

export const addGroup = async (group) => {
    const { data, error } = await supabase
        .from('groups')
        .insert([group])
        .select();

    if (error) throw error;
    return data[0];
};

export const updateGroup = async (id, updates) => {
    const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteGroup = async (id) => {
    const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
