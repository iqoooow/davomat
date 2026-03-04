import React, { useState, useEffect } from 'react';
import { getStudents } from '../services/studentsService';
import { getAttendanceByDate, saveAttendance, getAbsentWithoutSms } from '../services/attendanceService';
import { supabase } from '../services/supabaseClient';
import { FiSave, FiSend, FiCheckCircle, FiClock, FiSearch, FiGrid, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AttendancePage = () => {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({}); // { student_id: 'present' | 'absent' }
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingSms, setSendingSms] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const allStudents = await getStudents();
            setStudents(allStudents);

            const existingAttendance = await getAttendanceByDate(today);

            const attendanceMap = {};
            allStudents.forEach(s => {
                const record = existingAttendance.find(a => a.student_id === s.id);
                attendanceMap[s.id] = record ? record.status : 'absent';
            });

            setAttendance(attendanceMap);
            if (existingAttendance.length > 0) setIsSaved(true);
        } catch (error) {
            toast.error(`Ma'lumotlarni yuklashda xatolik`);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (studentId) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
        }));
        setIsSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const records = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: studentId,
                date: today,
                status: status
            }));

            await saveAttendance(records);
            toast.success('Bugungi davomat saqlandi');
            setIsSaved(true);
        } catch (error) {
            toast.error(`Saqlashda xatolik yuz berdi`);
        } finally {
            setSaving(false);
        }
    };

    const handleSendSms = async () => {
        setSendingSms(true);
        try {
            const absents = await getAbsentWithoutSms(today);
            if (absents.length === 0) {
                toast.error(`SMS yuboriladigan yangi kelmaganlar yo'q`);
                return;
            }

            const { data, error } = await supabase.functions.invoke('sms-sender', {
                body: { date: today }
            });

            if (error) throw error;

            toast.success(`SMS xabarlar muvaffaqiyatli navbatga qo'yildi!`);
        } catch (error) {
            console.error('SMS error:', error);
            toast.error(`SMS yuborishda xatolik yuz berdi`);
        } finally {
            setSendingSms(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.group_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Davomat</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                        <FiClock className="w-4 h-4 text-primary" />
                        Bugun: <span className="font-bold underline decoration-primary underline-offset-4">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3.5 rounded-2xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 font-bold"
                    >
                        <FiSave className={`w-5 h-5 text-primary ${saving ? 'animate-bounce' : ''}`} />
                        <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                    </button>

                    {isSaved && (
                        <button
                            onClick={handleSendSms}
                            disabled={sendingSms}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 disabled:opacity-50 font-bold group"
                        >
                            <FiSend className={`w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform ${sendingSms ? 'animate-pulse' : ''}`} />
                            <span>{sendingSms ? 'Yuborilmoqda...' : 'SMS Yuborish'}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="relative max-w-md">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Talabani qidirish..."
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left truncate">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase text-xs font-black tracking-widest">
                        <tr>
                            <th className="px-8 py-5">O'quvchi</th>
                            <th className="px-8 py-5">Guruh</th>
                            <th className="px-8 py-5 text-center w-40">Holat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan="3" className="px-8 py-16 text-center text-slate-400 italic">Yuklanmoqda...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr><td colSpan="3" className="px-8 py-16 text-center text-slate-400 italic">Talabalar topilmadi.</td></tr>
                        ) : (
                            filteredStudents.map((student, idx) => {
                                const isPresent = attendance[student.id] === 'present';
                                return (
                                    <motion.tr
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.03 }}
                                        key={student.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition-colors border border-slate-100 dark:border-slate-800 ${isPresent ? 'bg-green-50 dark:bg-green-900/20 text-green-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FiUser className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{student.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                                                <FiGrid className="w-3 h-3" />
                                                {student.group_name || 'Guruhsiz'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleToggle(student.id)}
                                                    className={`relative inline-flex h-9 w-16 items-center rounded-2xl transition-all duration-300 focus:outline-none ring-4 ring-transparent active:scale-90 ${isPresent ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-200 dark:bg-slate-700'
                                                        }`}
                                                >
                                                    <div className={`absolute left-1.5 h-6 w-6 transform rounded-lg bg-white shadow-md transition-all duration-300 flex items-center justify-center ${isPresent ? 'translate-x-7' : 'translate-x-0'
                                                        }`}>
                                                        <div className={`w-1 h-3 rounded-full ${isPresent ? 'bg-primary' : 'bg-slate-300'}`}></div>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase tracking-tighter absolute ${isPresent ? 'left-2.5 text-white/50' : 'right-2.5 text-slate-400'}`}>
                                                        {isPresent ? 'Bor' : 'Yoq'}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendancePage;
