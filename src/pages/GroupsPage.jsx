import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, addGroup, updateGroup, deleteGroup } from '../services/groupsService';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiUsers, FiGrid, FiLoader, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const GroupsPage = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const data = await getGroups();
            setGroups(data);
        } catch (error) {
            toast.error(`Ma'lumotlarni yuklashda xatolik`);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingGroup(null);
        setFormData({ name: '', description: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (group) => {
        setEditingGroup(group);
        setFormData({ name: group.name, description: group.description || '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingGroup) {
                await updateGroup(editingGroup.id, formData);
                toast.success('Guruh yangilandi');
            } else {
                await addGroup(formData);
                toast.success('Guruh qo\'shildi');
            }
            setIsModalOpen(false);
            fetchGroups();
        } catch (error) {
            toast.error('Xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Guruhni o\'chirsangiz, talabalar guruhsiz qoladi. Davom etasizmi?')) return;
        try {
            await deleteGroup(id);
            toast.success('Guruh o\'chirildi');
            fetchGroups();
        } catch (error) {
            toast.error('O\'chirishda xatolik');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Guruhlar</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Jami {groups.length} ta guruh
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-2xl flex items-center gap-2.5 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 font-semibold self-start sm:self-auto"
                >
                    <FiPlus className="w-5 h-5" />
                    <span>Guruh Qo'shish</span>
                </button>
            </div>

            {/* Groups Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <FiLoader className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FiGrid className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Hali guruhlar yo'q</p>
                    <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Birinchi guruhingizni qo'shing</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <AnimatePresence>
                        {groups.map((group, idx) => {
                            const studentCount = group.students?.[0]?.count ?? 0;
                            return (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-primary/30 transition-all group cursor-pointer"
                                onClick={() => navigate(`/groups/${group.id}`)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <FiGrid className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEditModal(group); }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                            >
                                                <FiEdit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{group.name}</h3>
                                        {group.description && (
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">{group.description}</p>
                                        )}
                                    </div>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                            <FiUsers className="w-4 h-4 text-primary" />
                                            <span>{studentCount} nafar o'quvchi</span>
                                        </div>
                                        <FiChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800"
                        >
                            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                        {editingGroup ? 'Guruhni Tahrirlash' : 'Yangi Guruh'}
                                    </h2>
                                    <p className="text-slate-500 text-sm mt-1">Guruh ma'lumotlarini kiriting</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Guruh nomi *</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white font-medium"
                                        placeholder="Masalan: IELTS 1, Python Boshlang'ich..."
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Tavsif (ixtiyoriy)</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white resize-none"
                                        placeholder="Guruh haqida qisqacha ma'lumot..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? <FiLoader className="animate-spin" /> : null}
                                    {editingGroup ? 'Saqlash' : 'Guruh Qo\'shish'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupsPage;
