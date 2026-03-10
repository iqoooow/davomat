import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { updateGroup, addStudentToGroup, removeStudentFromGroup, getGroups, copyStudentsToGroup } from '../services/groupsService';
import { getStudents } from '../services/studentsService';
import {
    FiArrowLeft, FiUsers, FiGrid, FiEdit2, FiCheck, FiX,
    FiPhone, FiCheckCircle, FiXCircle, FiLoader, FiFileText,
    FiPlus, FiTrash2, FiSearch, FiCopy, FiClock
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const GroupDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [students, setStudents] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState({});
    const [statsMap, setStatsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);

    // Add student modal
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [addSearch, setAddSearch] = useState('');
    const [addingId, setAddingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [addedCount, setAddedCount] = useState(0);

    // Schedule
    const [scheduleData, setScheduleData] = useState({ schedule_days: [], schedule_start: '', schedule_end: '' });
    const [scheduleEditMode, setScheduleEditMode] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);

    // Copy from group modal
    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [otherGroups, setOtherGroups] = useState([]);
    const [copyingFromId, setCopyingFromId] = useState(null);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const { data: grp, error: gErr } = await supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .single();
            if (gErr) throw gErr;
            setGroup(grp);
            setEditData({ name: grp.name, description: grp.description || '' });
            setScheduleData({
                schedule_days:  grp.schedule_days  || [],
                schedule_start: grp.schedule_start ? grp.schedule_start.slice(0, 5) : '',
                schedule_end:   grp.schedule_end   ? grp.schedule_end.slice(0, 5)   : '',
            });

            // Students in this group via junction table
            const { data: sgData, error: sErr } = await supabase
                .from('student_groups')
                .select('students(*)')
                .eq('group_id', id);
            if (sErr) throw sErr;

            const studs = sgData.map(d => d.students).filter(Boolean)
                .sort((a, b) => a.full_name.localeCompare(b.full_name));
            setStudents(studs);

            if (studs.length === 0) return;
            const studentIds = studs.map(s => s.id);

            const [{ data: todayAtt }, { data: allAtt }] = await Promise.all([
                supabase.from('attendance').select('student_id, status').in('student_id', studentIds).eq('date', today),
                supabase.from('attendance').select('student_id, status').in('student_id', studentIds),
            ]);

            const todayMap = {};
            (todayAtt || []).forEach(a => { todayMap[a.student_id] = a.status; });
            setTodayAttendance(todayMap);

            const stats = {};
            studentIds.forEach(sid => { stats[sid] = { present: 0, absent: 0 }; });
            (allAtt || []).forEach(a => { if (stats[a.student_id]) stats[a.student_id][a.status]++; });
            setStatsMap(stats);
        } catch {
            toast.error("Ma'lumotlarni yuklashda xatolik");
            navigate('/groups');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = async () => {
        const all = await getStudents();
        const inGroupIds = new Set(students.map(s => s.id));
        setAllStudents(all.filter(s => !inGroupIds.has(s.id)));
        setAddSearch('');
        setAddedCount(0);
        setAddModalOpen(true);
    };

    const closeAddModal = () => {
        setAddModalOpen(false);
        if (addedCount > 0) fetchAll();
        setAddedCount(0);
    };

    const openCopyModal = async () => {
        const all = await getGroups();
        setOtherGroups(all.filter(g => g.id !== id));
        setCopyModalOpen(true);
    };

    const handleCopyFromGroup = async (fromGroupId) => {
        setCopyingFromId(fromGroupId);
        try {
            const count = await copyStudentsToGroup(fromGroupId, id);
            const src = otherGroups.find(g => g.id === fromGroupId);
            toast.success(`${src?.name} guruhidan ${count} ta o'quvchi qo'shildi`);
            setCopyModalOpen(false);
            fetchAll();
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setCopyingFromId(null);
        }
    };

    const handleAddStudent = async (studentId) => {
        setAddingId(studentId);
        try {
            await addStudentToGroup(studentId, id);
            toast.success("O'quvchi guruhga qo'shildi");
            setAllStudents(prev => prev.filter(s => s.id !== studentId));
            setAddedCount(prev => prev + 1);
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setAddingId(null);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm("O'quvchini bu guruhdan chiqarasizmi?")) return;
        setRemovingId(studentId);
        try {
            await removeStudentFromGroup(studentId, id);
            toast.success("O'quvchi guruhdan chiqarildi");
            fetchAll();
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setRemovingId(null);
        }
    };

    const toggleDay = (dayValue) => {
        setScheduleData(prev => {
            const days = prev.schedule_days || [];
            return {
                ...prev,
                schedule_days: days.includes(dayValue)
                    ? days.filter(d => d !== dayValue)
                    : [...days, dayValue].sort((a, b) => a - b),
            };
        });
    };

    const handleSaveSchedule = async () => {
        setSavingSchedule(true);
        try {
            await updateGroup(id, scheduleData);
            setGroup(g => ({ ...g, ...scheduleData }));
            setScheduleEditMode(false);
            toast.success('Jadval saqlandi');
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editData.name.trim()) return;
        setSaving(true);
        try {
            await updateGroup(id, editData);
            setGroup(g => ({ ...g, ...editData }));
            setEditMode(false);
            toast.success('Guruh yangilandi');
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <FiLoader className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const DAYS = [
        { value: 1, label: 'Dushanba' },
        { value: 2, label: 'Seshanba' },
        { value: 3, label: 'Chorshanba' },
        { value: 4, label: 'Payshanba' },
        { value: 5, label: 'Juma' },
        { value: 6, label: 'Shanba' },
        { value: 0, label: 'Yakshanba' },
    ];
    const fmtTime = (t) => t ? String(t).slice(0, 5) : '--:--';

    const presentToday = Object.values(todayAttendance).filter(s => s === 'present').length;
    const absentToday  = Object.values(todayAttendance).filter(s => s === 'absent').length;
    const totalPresent = Object.values(statsMap).reduce((s, v) => s + v.present, 0);
    const totalAbsent  = Object.values(statsMap).reduce((s, v) => s + v.absent, 0);
    const totalSessions = totalPresent + totalAbsent;
    const overallPct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

    const filteredForAdd = allStudents.filter(s =>
        s.full_name.toLowerCase().includes(addSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-12">

            {/* Back */}
            <button
                onClick={() => navigate('/groups')}
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold group text-sm"
            >
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                Guruhlarga qaytish
            </button>

            {/* Group Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <FiGrid className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <AnimatePresence mode="wait">
                                {editMode ? (
                                    <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                                        <input autoFocus value={editData.name}
                                            onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                                            className="text-xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary w-full" />
                                        <input value={editData.description}
                                            onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                                            placeholder="Tavsif (ixtiyoriy)"
                                            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-500 dark:text-slate-400 focus:outline-none focus:border-primary w-full" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
                                        {group.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{group.description}</p>}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!editMode && (
                            <button onClick={() => navigate(`/reports?group=${id}`)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:border-primary hover:text-primary transition">
                                <FiFileText className="w-3.5 h-3.5" />Hisobot
                            </button>
                        )}
                        {editMode ? (
                            <>
                                <button onClick={() => { setEditMode(false); setEditData({ name: group.name, description: group.description || '' }); }}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <FiX className="w-4 h-4" />
                                </button>
                                <button onClick={handleSaveEdit} disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                                    {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
                                    Saqlash
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditMode(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:border-primary hover:text-primary transition">
                                <FiEdit2 className="w-3.5 h-3.5" />Tahrirlash
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{students.length}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">O'quvchilar</p>
                    </div>
                    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-primary">{overallPct}%</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Umumiy davomat</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-green-600 dark:text-green-400">{presentToday}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Bugun keldi</p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{absentToday}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Bugun kelmadi</p>
                    </div>
                </div>
            </div>

            {/* Schedule Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                        <FiClock className="text-primary w-4 h-4" />
                        Dars Jadvali
                    </h2>
                    {!scheduleEditMode ? (
                        <button
                            onClick={() => setScheduleEditMode(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:border-primary hover:text-primary transition"
                        >
                            <FiEdit2 className="w-3.5 h-3.5" />Tahrirlash
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setScheduleEditMode(false);
                                    setScheduleData({
                                        schedule_days:  group.schedule_days  || [],
                                        schedule_start: group.schedule_start ? group.schedule_start.slice(0, 5) : '',
                                        schedule_end:   group.schedule_end   ? group.schedule_end.slice(0, 5)   : '',
                                    });
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleSaveSchedule}
                                disabled={savingSchedule}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {savingSchedule ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
                                Saqlash
                            </button>
                        </div>
                    )}
                </div>

                {scheduleEditMode ? (
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Dars kunlari</p>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleDay(day.value)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                            scheduleData.schedule_days?.includes(day.value)
                                                ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Boshlanish vaqti</label>
                                <input
                                    type="time"
                                    value={scheduleData.schedule_start}
                                    onChange={e => setScheduleData(d => ({ ...d, schedule_start: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-primary text-slate-900 dark:text-white font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">Tugash vaqti</label>
                                <input
                                    type="time"
                                    value={scheduleData.schedule_end}
                                    onChange={e => setScheduleData(d => ({ ...d, schedule_end: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-primary text-slate-900 dark:text-white font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                            <FiClock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>Dars tugashidan 30 daqiqa oldin davomat olinmasa, admin raqamiga SMS eslatma yuboriladi.</span>
                        </div>
                    </div>
                ) : (
                    group.schedule_days?.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {DAYS.filter(d => group.schedule_days?.includes(d.value)).map(d => (
                                    <span key={d.value} className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold">
                                        {d.label}
                                    </span>
                                ))}
                            </div>
                            {(group.schedule_start || group.schedule_end) && (
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono font-bold text-sm">
                                    <FiClock className="w-4 h-4 text-primary" />
                                    {fmtTime(group.schedule_start)} — {fmtTime(group.schedule_end)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-3 text-slate-400 text-sm">
                            <p>Jadval belgilanmagan</p>
                            <button
                                onClick={() => setScheduleEditMode(true)}
                                className="text-primary font-semibold mt-1 hover:underline text-xs"
                            >
                                Jadval qo'shish
                            </button>
                        </div>
                    )
                )}
            </div>

            {/* Students List */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FiUsers className="text-primary" />
                        O'quvchilar ro'yxati
                        <span className="text-sm font-normal text-slate-400">{students.length} nafar</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={openCopyModal}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:border-primary hover:text-primary active:scale-95 transition-all"
                        >
                            <FiCopy className="w-4 h-4" />
                            Guruhdan ko'chirish
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/25"
                        >
                            <FiPlus className="w-4 h-4" />
                            O'quvchi qo'shish
                        </button>
                    </div>
                </div>

                {students.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <FiUsers className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Bu guruhda hali o'quvchi yo'q</p>
                        <button onClick={openAddModal} className="mt-4 text-sm text-primary font-semibold hover:underline">O'quvchi qo'shish</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {students.map((student, idx) => {
                                const st = statsMap[student.id] ?? { present: 0, absent: 0 };
                                const total = st.present + st.absent;
                                const pct = total > 0 ? Math.round((st.present / total) * 100) : 0;
                                const todayStatus = todayAttendance[student.id];
                                const isRemoving = removingId === student.id;

                                return (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div
                                            onClick={() => navigate(`/students/${student.id}`)}
                                            className="flex items-center gap-4 min-w-0 cursor-pointer flex-1"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${pct >= 80 ? 'bg-primary/10 text-primary' : pct >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                                                {student.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover:text-primary transition-colors truncate">
                                                    {student.full_name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <FiPhone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                    <span className="text-xs text-slate-400">{student.parent_phone}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="hidden sm:block text-right">
                                                <div className="flex items-center gap-1.5 justify-end mb-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                                                    <span className="text-[10px] text-slate-400">{st.present}/{total}</span>
                                                </div>
                                                <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${pct >= 80 ? 'bg-primary' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>

                                            {todayStatus ? (
                                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${todayStatus === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                                    {todayStatus === 'present' ? <FiCheckCircle className="w-3 h-3" /> : <FiXCircle className="w-3 h-3" />}
                                                    {todayStatus === 'present' ? 'Keldi' : 'Kelmadi'}
                                                </div>
                                            ) : (
                                                <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                                                    Belgilanmagan
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleRemoveStudent(student.id)}
                                                disabled={isRemoving}
                                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                title="Guruhdan chiqarish"
                                            >
                                                {isRemoving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiTrash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            {/* Copy from Group Modal */}
            <AnimatePresence>
                {copyModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setCopyModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800">

                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Guruhdan ko'chirish</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Qaysi guruh o'quvchilarini qo'shish?</p>
                                </div>
                                <button onClick={() => setCopyModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <FiX className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-3 max-h-80 overflow-y-auto">
                                {otherGroups.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">Boshqa guruhlar yo'q</p>
                                ) : (
                                    <div className="space-y-1">
                                        {otherGroups.map(g => {
                                            const count = g.student_groups?.[0]?.count ?? 0;
                                            const isCopying = copyingFromId === g.id;
                                            return (
                                                <button
                                                    key={g.id}
                                                    onClick={() => handleCopyFromGroup(g.id)}
                                                    disabled={!!copyingFromId}
                                                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-primary/5 hover:border-primary border border-transparent transition-all text-left disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                            <FiGrid className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{g.name}</p>
                                                            <p className="text-xs text-slate-400">{count} ta o'quvchi</p>
                                                        </div>
                                                    </div>
                                                    {isCopying ? (
                                                        <FiLoader className="w-4 h-4 text-primary animate-spin" />
                                                    ) : (
                                                        <FiCopy className="w-4 h-4 text-slate-300 group-hover:text-primary" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Student Modal */}
            <AnimatePresence>
                {addModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={closeAddModal}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[85vh] flex flex-col">

                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">O'quvchi qo'shish</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {group?.name} guruhiga
                                        {addedCount > 0 && <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-bold">{addedCount} ta qo'shildi</span>}
                                    </p>
                                </div>
                                <button onClick={closeAddModal} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <FiX className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Ism bo'yicha qidirish..."
                                        value={addSearch}
                                        onChange={e => setAddSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1">
                                {filteredForAdd.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        {allStudents.length === 0 ? 'Barcha o\'quvchilar allaqachon bu guruhda' : 'O\'quvchi topilmadi'}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredForAdd.map(student => (
                                            <div key={student.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                        {student.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{student.full_name}</p>
                                                        <p className="text-xs text-slate-400">{student.parent_phone}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddStudent(student.id)}
                                                    disabled={addingId === student.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50 flex-shrink-0 ml-3"
                                                >
                                                    {addingId === student.id ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiPlus className="w-3.5 h-3.5" />}
                                                    Qo'shish
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupDetailPage;
