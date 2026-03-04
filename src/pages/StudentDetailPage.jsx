import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { FiArrowLeft, FiUser, FiCalendar, FiPhone, FiCheckCircle, FiXCircle, FiSend, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const StudentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingSms, setSendingSms] = useState(false);

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            // Fetch student info
            const { data: studentData, error: sError } = await supabase
                .from('students')
                .select('*')
                .eq('id', id)
                .single();

            if (sError) throw sError;
            setStudent(studentData);

            // Fetch attendance history
            const { data: attData, error: aError } = await supabase
                .from('attendance')
                .select('*')
                .eq('student_id', id)
                .order('date', { ascending: false });

            if (aError) throw aError;
            setAttendance(attData);
        } catch (error) {
            toast.error(`Ma'lumotlarni yuklashda xatolik`);
            navigate('/students');
        } finally {
            setLoading(false);
        }
    };

    const handleSingleSms = async (attendanceId) => {
        setSendingSms(true);
        try {
            toast.loading('SMS yuborilmoqda...', { id: 'singleSms' });

            const { data, error } = await supabase.functions.invoke('sms-sender', {
                body: { specific_id: attendanceId }
            });

            if (error) throw error;

            toast.success('SMS muvaffaqiyatli yuborildi', { id: 'singleSms' });
            fetchStudentData();
        } catch (error) {
            toast.error('SMS yuborishda xatolik yuz berdi', { id: 'singleSms' });
        } finally {
            setSendingSms(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const attendancePercentage = attendance.length > 0
        ? Math.round((presentCount / attendance.length) * 100)
        : 0;

    return (
        <div className="space-y-8 pb-12">
            {/* Back Button */}
            <button
                onClick={() => navigate('/students')}
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold group"
            >
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                Orqaga qaytish
            </button>

            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner overflow-hidden border-2 border-slate-100 dark:border-slate-800">
                        {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <FiUser className="w-16 h-16" />
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">{student.full_name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                                <FiCalendar className="text-primary" />
                                Guruh: <b className="text-slate-900 dark:text-white uppercase">{student.group_name || 'Aniqlanmagan'}</b>
                            </span>
                            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                                <FiPhone className="text-primary" />
                                {student.parent_phone}
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6">
                        <div className="text-center bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl min-w-[100px] border border-slate-100 dark:border-slate-700">
                            <p className="text-2xl font-black text-primary">{attendance.length}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Darslar</p>
                        </div>
                        <div className="text-center bg-green-50 dark:bg-green-900/20 p-4 rounded-3xl min-w-[100px] border border-green-100 dark:border-green-900/30">
                            <p className="text-2xl font-black text-green-600 dark:text-green-400">{attendancePercentage}%</p>
                            <p className="text-xs font-bold text-green-500/70 uppercase tracking-tighter">Davomat</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contact info card */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 h-fit space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ma'lumotlar</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                <FiPhone />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Ota-ona telefoni</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{student.parent_phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                <FiClock />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Ro'yxatdan o'tgan sana</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{new Date(student.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                            <FiSend className="text-primary" />
                            SMS xizmati
                        </h4>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                            Talaba bugun darsga kelmasa, ushbu telefon raqamga SMS xabarnoma yuboriladi.
                        </p>
                        <button className="w-full bg-white dark:bg-slate-700 hover:bg-primary hover:text-white transition-all py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 shadow-sm">
                            Taqdimot (SMS Test)
                        </button>
                    </div>
                </div>

                {/* Attendance History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Davomat Tarixi</h3>
                        <div className="flex gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 text-xs font-bold">
                                {presentCount} Kelgan
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                {absentCount} Kelmagan
                            </span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {attendance.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic">Hali davomat ma'lumotlari yo'q</div>
                            ) : (
                                attendance.slice(0, 10).map((record) => (
                                    <div key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${record.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                                                }`}>
                                                {record.status === 'present' ? <FiCheckCircle /> : <FiXCircle />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(record.date).toLocaleDateString()}</p>
                                                <p className={`text-xs font-semibold ${record.status === 'present' ? 'text-green-500' : 'text-rose-500'}`}>
                                                    {record.status === 'present' ? 'Darsda qatnashdi' : 'Darsda qatnashmadi'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {record.status === 'absent' && (
                                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${record.sms_sent ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    }`}>
                                                    <FiSend className="w-3 h-3" />
                                                    {record.sms_sent ? 'SMS Yuborilgan' : 'SMS Yuborilmagan'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {attendance.length > 10 && (
                        <p className="text-center text-slate-400 text-sm font-medium italic">Faqat oxirgi 10 ta yozuv ko'rsatilmoqda</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDetailPage;
