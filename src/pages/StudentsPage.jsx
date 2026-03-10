import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents, addStudent, deleteStudent, uploadAvatar } from '../services/studentsService';
import { FiPlus, FiTrash2, FiUser, FiX, FiSearch, FiPhone, FiGrid, FiCamera, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({ full_name: '', parent_phone: '', avatar_url: '' });
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setStudents(await getStudents());
        } catch {
            toast.error(`Ma'lumotlarni yuklashda xatolik`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const publicUrl = await uploadAvatar(file);
            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Rasm yuklandi');
        } catch (error) {
            toast.error('Rasmni yuklashda xatolik');
        } finally {
            setUploading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            await addStudent(formData);
            toast.success("Talaba qo'shildi");
            setIsModalOpen(false);
            setFormData({ full_name: '', parent_phone: '', avatar_url: '' });
            fetchData();
        } catch {
            toast.error(`Xatolik yuz berdi`);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm(`Haqiqatdan ham o'chirmoqchimisiz?`)) {
            try {
                await deleteStudent(id);
                toast.success(`O'chirildi`);
                fetchData();
            } catch (error) {
                toast.error(`O'chirishda xatolik`);
            }
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_groups?.some(sg => sg.groups?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Talabalar</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Jami {students.length} nafar faol talaba
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Ism yoki guruh bo'yicha..."
                            className="pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full sm:w-72 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 font-semibold"
                    >
                        <FiPlus className="w-5 h-5" />
                        <span>Talaba Qo'shish</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[520px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 sm:px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">O'quvchi</th>
                                <th className="px-6 sm:px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Guruh</th>
                                <th className="px-6 sm:px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:table-cell">Aloqa</th>
                                <th className="px-6 sm:px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Boshqaruv</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="4" className="px-8 py-20 text-center text-slate-400 italic">Yuklanmoqda...</td></tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan="4" className="px-8 py-20 text-center text-slate-400 italic">Talabalar topilmadi</td></tr>
                            ) : (
                                filteredStudents.map((student, idx) => (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        onClick={() => navigate(`/students/${student.id}`)}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer group"
                                    >
                                        <td className="px-6 sm:px-8 py-4 sm:py-5">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FiUser className="w-5 h-5 sm:w-6 sm:h-6" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{student.full_name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 sm:hidden">{student.parent_phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-4 sm:py-5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {student.student_groups?.length > 0 ? student.student_groups.map(sg => (
                                                    <span key={sg.group_id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                                        <FiGrid className="w-3 h-3 flex-shrink-0" />
                                                        {sg.groups?.name}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-slate-400 font-medium">Guruhsiz</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-4 sm:py-5 hidden sm:table-cell">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                                                <FiPhone className="text-slate-400 flex-shrink-0" />
                                                {student.parent_phone}
                                            </div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                                            <button
                                                onClick={(e) => handleDelete(e, student.id)}
                                                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                title="O'chirish"
                                            >
                                                <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                            className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Yangi Talaba</h2>
                                    <p className="text-slate-500 text-sm mt-1">Ma'lumotlar va rasm kiriting</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleAddStudent} className="p-6 sm:p-8 space-y-5">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden relative group"
                                    >
                                        {uploading ? (
                                            <FiLoader className="w-7 h-7 text-primary animate-spin" />
                                        ) : formData.avatar_url ? (
                                            <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <FiCamera className="w-7 h-7 text-slate-400 group-hover:text-primary transition-colors" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Rasm</span>
                                            </>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <FiCamera className="text-white w-6 h-6" />
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">To'liq ism *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white font-medium"
                                        placeholder="Ism Familiya"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Ota-ona telefoni *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white"
                                        placeholder="998901234567"
                                        value={formData.parent_phone}
                                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50"
                                >
                                    Talabani Saqlash
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentsPage;
