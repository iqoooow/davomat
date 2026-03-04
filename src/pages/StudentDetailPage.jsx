import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { FiArrowLeft, FiUser, FiPhone, FiCheckCircle, FiXCircle, FiSend, FiClock, FiGrid, FiX, FiMessageSquare, FiAlertCircle, FiPrinter } from 'react-icons/fi';
import { getSmsHistory } from '../services/smsSettingsService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingSms, setSendingSms] = useState(false);
    const [smsModal, setSmsModal] = useState(false);
    const [smsText, setSmsText] = useState('');
    const [smsHistory, setSmsHistory] = useState([]);

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            const { data: studentData, error: sError } = await supabase
                .from('students')
                .select('*, groups(id, name)')
                .eq('id', id)
                .single();

            if (sError) throw sError;
            setStudent(studentData);

            const { data: attData, error: aError } = await supabase
                .from('attendance')
                .select('*')
                .eq('student_id', id)
                .order('date', { ascending: false });

            if (aError) throw aError;
            setAttendance(attData);

            const history = await getSmsHistory(id);
            setSmsHistory(history);
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
            const { error } = await supabase.functions.invoke('sms-sender', {
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

    const handleCustomSms = async (e) => {
        e.preventDefault();
        if (!smsText.trim()) return;
        setSendingSms(true);
        try {
            toast.loading('SMS yuborilmoqda...', { id: 'customSms' });
            const { error } = await supabase.functions.invoke('sms-sender', {
                body: { phone: student.parent_phone, message: smsText }
            });
            if (error) throw error;
            toast.success('SMS muvaffaqiyatli yuborildi!', { id: 'customSms' });
            setSmsModal(false);
            setSmsText('');
        } catch (error) {
            toast.error('SMS yuborishda xatolik yuz berdi', { id: 'customSms' });
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

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };

    const generatePDF = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 15;

        // ── Header background ──
        doc.setFillColor(37, 99, 235); // primary blue
        doc.roundedRect(margin, 12, pageW - margin * 2, 42, 4, 4, 'F');

        // App name (top-left inside header)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('DAVOMAT TIZIMI', margin + 6, 21);

        // Student name
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const name = student?.full_name ?? '';
        doc.text(name, margin + 6, 32);

        // Sub-info line
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(186, 213, 255);
        const subLine = [
            student?.groups?.name ? `Guruh: ${student.groups.name}` : null,
            student?.parent_phone ? `Tel: ${student.parent_phone}` : null,
        ].filter(Boolean).join('   |   ');
        doc.text(subLine, margin + 6, 41);

        // ── Stats row ──
        const statsY = 62;
        const statW = (pageW - margin * 2) / 3;
        const statBoxes = [
            { label: "Jami darslar", value: String(attendance.length), color: [241, 245, 249], textColor: [37, 99, 235] },
            { label: "Kelgan", value: String(presentCount), color: [240, 253, 244], textColor: [22, 163, 74] },
            { label: "Kelmagan", value: String(absentCount), color: [255, 241, 242], textColor: [220, 38, 38] },
        ];
        statBoxes.forEach((s, i) => {
            const x = margin + i * statW;
            doc.setFillColor(...s.color);
            doc.roundedRect(x, statsY, statW - 3, 22, 3, 3, 'F');
            doc.setTextColor(...s.textColor);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(s.value, x + statW / 2 - 1.5, statsY + 12, { align: 'center' });
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(s.label, x + statW / 2 - 1.5, statsY + 18, { align: 'center' });
        });

        // Attendance % badge
        const pctColor = attendancePercentage >= 80 ? [22, 163, 74] : attendancePercentage >= 50 ? [217, 119, 6] : [220, 38, 38];
        doc.setFillColor(...pctColor);
        doc.roundedRect(pageW - margin - 28, statsY, 28, 22, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`${attendancePercentage}%`, pageW - margin - 14, statsY + 12, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Davomat', pageW - margin - 14, statsY + 18, { align: 'center' });

        // ── Section title ──
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Davomat Tarixi", margin, statsY + 32);

        // Small divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, statsY + 34, pageW - margin, statsY + 34);

        // ── Table ──
        const tableData = attendance.map((rec, idx) => [
            idx + 1,
            formatDate(rec.date),
            rec.status === 'present' ? 'Keldi' : 'Kelmadi',
            rec.status === 'absent' ? (rec.sms_sent ? 'Yuborildi' : 'Yuborilmadi') : '—',
        ]);

        autoTable(doc, {
            startY: statsY + 37,
            head: [['№', 'Sana', 'Holat', 'SMS']],
            body: tableData,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 9,
                cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
                lineColor: [226, 232, 240],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left',
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center', textColor: [148, 163, 184] },
                1: { cellWidth: 35, fontStyle: 'bold' },
                2: {
                    cellWidth: 30,
                    fontStyle: 'bold',
                },
                3: { cellWidth: 30, textColor: [100, 116, 139] },
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    const val = data.cell.raw;
                    data.cell.styles.textColor = val === 'Keldi' ? [22, 163, 74] : [220, 38, 38];
                }
                if (data.section === 'body' && data.column.index === 3) {
                    const val = data.cell.raw;
                    if (val === 'Yuborildi') data.cell.styles.textColor = [37, 99, 235];
                    else if (val === 'Yuborilmadi') data.cell.styles.textColor = [239, 68, 68];
                }
            },
        });

        // ── Footer on every page ──
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Chop etilgan: ${new Date().toLocaleDateString('ru-RU')}   |   ${name}`,
                margin, pageH - 7
            );
            doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });
        }

        const safeName = (student?.full_name ?? 'hisobot').replace(/\s+/g, '_');
        doc.save(`${safeName}_davomat.pdf`);
        toast.success('PDF yuklab olindi');
    };

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Back Button */}
            <button
                onClick={() => navigate('/students')}
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold group"
            >
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                Orqaga qaytish
            </button>

            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner overflow-hidden border-2 border-slate-100 dark:border-slate-800 flex-shrink-0">
                        {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <FiUser className="w-12 h-12 sm:w-16 sm:h-16" />
                        )}
                    </div>
                    <div className="flex-1 space-y-3">
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">{student.full_name}</h1>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
                                <FiGrid className="text-primary flex-shrink-0" />
                                <b className="text-slate-900 dark:text-white uppercase">{student.groups?.name || 'Guruhsiz'}</b>
                            </span>
                            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
                                <FiPhone className="text-primary flex-shrink-0" />
                                {student.parent_phone}
                            </span>
                        </div>
                        <button
                            onClick={() => setSmsModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95"
                        >
                            <FiMessageSquare className="w-4 h-4" />
                            SMS Yuborish
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 sm:gap-6 flex-shrink-0">
                        <div className="text-center bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl min-w-[80px] sm:min-w-[100px] border border-slate-100 dark:border-slate-700">
                            <p className="text-xl sm:text-2xl font-black text-primary">{attendance.length}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Darslar</p>
                        </div>
                        <div className="text-center bg-green-50 dark:bg-green-900/20 p-4 rounded-3xl min-w-[80px] sm:min-w-[100px] border border-green-100 dark:border-green-900/30">
                            <p className="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400">{attendancePercentage}%</p>
                            <p className="text-xs font-bold text-green-500/70 uppercase tracking-tighter">Davomat</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Contact info */}
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 h-fit space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ma'lumotlar</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors flex-shrink-0">
                                <FiPhone />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Ota-ona telefoni</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{student.parent_phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors flex-shrink-0">
                                <FiGrid />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Guruh</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{student.groups?.name || 'Guruhsiz'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors flex-shrink-0">
                                <FiClock />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Ro'yxatdan o'tgan</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{new Date(student.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30 text-center">
                            <p className="text-2xl font-black text-green-600 dark:text-green-400">{presentCount}</p>
                            <p className="text-xs font-bold text-green-500/70 uppercase tracking-tighter">Kelgan</p>
                        </div>
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center">
                            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{absentCount}</p>
                            <p className="text-xs font-bold text-rose-500/70 uppercase tracking-tighter">Kelmagan</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setSmsModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
                    >
                        <FiSend className="w-4 h-4" />
                        Xabar Yuborish
                    </button>
                </div>

                {/* Attendance History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Davomat Tarixi</h3>
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={generatePDF}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-sm font-semibold transition-all"
                            >
                                <FiPrinter className="w-3.5 h-3.5" />
                                PDF yuklab olish
                            </button>
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
                                    <div key={record.id} className="p-4 sm:p-6 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${record.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                                                {record.status === 'present' ? <FiCheckCircle /> : <FiXCircle />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{new Date(record.date).toLocaleDateString()}</p>
                                                <p className={`text-xs font-semibold ${record.status === 'present' ? 'text-green-500' : 'text-rose-500'}`}>
                                                    {record.status === 'present' ? 'Darsda qatnashdi' : 'Darsda qatnashmadi'}
                                                </p>
                                            </div>
                                        </div>

                                        {record.status === 'absent' && (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${record.sms_sent ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                    <FiSend className="w-3 h-3" />
                                                    <span className="hidden sm:inline">{record.sms_sent ? 'SMS Yuborilgan' : 'SMS Yuborilmagan'}</span>
                                                </div>
                                                {!record.sms_sent && (
                                                    <button
                                                        onClick={() => handleSingleSms(record.id)}
                                                        disabled={sendingSms}
                                                        className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                                        title="SMS yuborish"
                                                    >
                                                        <FiSend className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {attendance.length > 10 && (
                        <p className="text-center text-slate-400 text-sm font-medium italic">Faqat oxirgi 10 ta yozuv ko'rsatilmoqda</p>
                    )}
                </div>

                {/* SMS History */}
                <div className="space-y-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">SMS Tarixi</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {smsHistory.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 italic">Hali SMS yuborilmagan</div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {smsHistory.map(record => (
                                    <div key={record.id} className="p-4 sm:p-5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${record.status === 'sent' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                                            {record.status === 'sent' ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{record.message}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs text-slate-400">{new Date(record.sent_at).toLocaleString()}</span>
                                                <span className={`text-xs font-bold ${record.status === 'sent' ? 'text-blue-500' : 'text-rose-500'}`}>
                                                    {record.status === 'sent' ? 'Yuborildi' : 'Xatolik'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom SMS Modal */}
            <AnimatePresence>
                {smsModal && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSmsModal(false)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">SMS Yuborish</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">{student.full_name} · {student.parent_phone}</p>
                                </div>
                                <button onClick={() => setSmsModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <FiX className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={handleCustomSms} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Xabar matni</label>
                                    <textarea
                                        autoFocus
                                        rows={4}
                                        required
                                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white resize-none"
                                        placeholder="Xabar matnini kiriting..."
                                        value={smsText}
                                        onChange={(e) => setSmsText(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 text-right">{smsText.length} belgi</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={sendingSms || !smsText.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50"
                                >
                                    <FiSend className="w-4 h-4" />
                                    {sendingSms ? 'Yuborilmoqda...' : 'SMS Yuborish'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentDetailPage;
