import { supabase } from './supabaseClient';

export const getGroups = async () => {
    const { data, error } = await supabase
        .from('groups')
        .select('*, student_groups(count)')
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

export const getGroupStudents = async (groupId) => {
    const { data, error } = await supabase
        .from('student_groups')
        .select('students(*)')
        .eq('group_id', groupId)
        .order('students(full_name)', { ascending: true });
    if (error) throw error;
    return data.map(d => d.students).filter(Boolean);
};

export const addStudentToGroup = async (studentId, groupId) => {
    const { error } = await supabase
        .from('student_groups')
        .insert({ student_id: studentId, group_id: groupId });
    if (error) throw error;
};

export const removeStudentFromGroup = async (studentId, groupId) => {
    const { error } = await supabase
        .from('student_groups')
        .delete()
        .eq('student_id', studentId)
        .eq('group_id', groupId);
    if (error) throw error;
};

// Copy all students from one group into another group (skips duplicates)
export const copyStudentsToGroup = async (fromGroupId, toGroupId) => {
    const { data, error } = await supabase
        .from('student_groups')
        .select('student_id')
        .eq('group_id', fromGroupId);
    if (error) throw error;
    if (!data?.length) return 0;

    const { error: insertError } = await supabase
        .from('student_groups')
        .upsert(
            data.map(d => ({ student_id: d.student_id, group_id: toGroupId })),
            { onConflict: 'student_id,group_id', ignoreDuplicates: true }
        );
    if (insertError) throw insertError;
    return data.length;
};
