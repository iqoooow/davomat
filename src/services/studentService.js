import { supabase } from './supabaseClient'

export const studentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) throw error
    return data
  },

  async create({ full_name, parent_phone, group_name }) {
    const { data, error } = await supabase
      .from('students')
      .insert([{ full_name, parent_phone, group_name }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
