import React, { useState, useEffect } from 'react';
import { getStudents } from '../services/studentsService';
import { getGroups } from '../services/groupsService';
import { getAttendanceByDate, saveAttendance, getAbsentWithoutSms } from '../services/attendanceService';
import { getApprovedTemplates } from '../services/smsSettingsService';
import { supabase } from '../services/supabaseClient';
import { FiSend, FiSearch, FiLock, FiCalendar, FiClock, FiLoader, FiCheckCircle, FiArrowLeft, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

const GROUP_LOCK_KEY = (date, groupId) => `davomat_locked_${date}_${groupId}`;
const isGroupLocked = (date, groupId) => localStorage.getItem(GROUP_LOCK_KEY(date, groupId)) === 'true';
const lockGroup = (date, groupId) => localStorage.setItem(GROUP_LOCK_KEY(date, groupId), 'true');

const AttendancePage = () => {
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState(null); // null = cards screen
    const [lockedGroups, setLockedGroups] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [sendingSms, setSendingSms] = useState(false);
    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [absentList, setAbsentList] = useState([]);

    const today = new Date().toISOString().split('T')[0];

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        let lastDate = new Date().toISOString().split('T')[0];
        const timer = setInterval(() => {
            const current = new Date();
            const currentDate = current.toISOString().split('T')[0];
            if (currentDate !== lastDate) {
                lastDate = currentDate;
                setLockedGroups(new Set());
                setSelectedGroupId(null);
                fetchData();
            }
            setNow(current);
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const todayLabel = `${dd}.${mm}.${yyyy}-yil, ${weekdays[now.getDay()]}`;
    const currentTime = `${hh}:${min}`;

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allStudents, allGroups, existingAttendance, tpls] = await Promise.all([
                getStudents(), getGroups(), getAttendanceByDate(today), getApprovedTemplates(),
            ]);
            setTemplates(tpls);
            if (tpls.length > 0) setSelectedTemplateId(tpls[0].id);
            setStudents(allStudents);
            setGroups(allGroups);

            const map = {};
            allStudents.forEach(s => {
                const rec = existingAttendance.find(a => a.student_id === s.id);
                map[s.id] = { status: rec?.status ?? 'absent', sms_sent: rec?.sms_sent ?? false };
            });
            setAttendanceMap(map);

            // Load locked groups from localStorage
            const locked = new Set(
                allGroups.filter(g => isGroupLocked(today, g.id)).map(g => g.id)
            );
            setLockedGroups(locked);
        } catch {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    // Helper: check if a group has class today (and time hasn't passed)
    const getGroupScheduleStatus = (g) => {
        if (!g) return 'ok';
        const days = g.schedule_days;
        const hasSchedule = days?.length > 0 || g.schedule_start;
        if (!hasSchedule) return 'ok';
        if (days?.length > 0 && !days.includes(now.getDay())) return 'wrong_day';
        if (g.schedule_end) {
            const [endH, endM] = String(g.schedule_end).split(':').map(Number);
            const endMins = endH * 60 + endM;
            if (now.getHours() * 60 + now.getMinutes() > endMins) return 'time_over';
        }
        return 'ok';
    };

    // Only today's groups (have class today)
    const todayGroups = groups.filter(g => getGroupScheduleStatus(g) === 'ok');

    const handleToggle = async (studentId) => {
        const groupLocked = lockedGroups.has(selectedGroupId);
        if (groupLocked) return;
        const prev = attendanceMap[studentId];
        const nextStatus = prev?.status === 'present' ? 'absent' : 'present';
        setAttendanceMap(m => ({
            ...m,
            [studentId]: { status: nextStatus, sms_sent: nextStatus === 'present' ? false : prev?.sms_sent ?? false }
        }));
        setSavingId(studentId);
        try {
            await saveAttendance([{ student_id: studentId, date: today, status: nextStatus }]);
        } catch {
            setAttendanceMap(m => ({ ...m, [studentId]: prev }));
            toast.error('Saqlashda xatolik');
        } finally {
            setSavingId(null);
        }
    };

    const handleConfirm = async () => {
        if (!selectedGroupId) return;
        setConfirming(true);
        try {
            // Only this group's students
            const groupStudents = students.filter(s =>
                s.student_groups?.some(sg => sg.group_id === selectedGroupId)
            );
            const groupStudentIds = new Set(groupStudents.map(s => s.id));

            const records = groupStudents.map(s => ({
                student_id: s.id,
                date: today,
                status: attendanceMap[s.id]?.status ?? 'absent',
            }));
            await saveAttendance(records);

            // Check absent students for this group only
            const allAbsents = await getAbsentWithoutSms(today);
            const absents = allAbsents.filter(a => groupStudentIds.has(a.student_id));

            if (absents.length > 0) {
                setAbsentList(absents);
                setSmsModalOpen(true);
            } else {
                lockGroup(today, selectedGroupId);
                setLockedGroups(prev => new Set([...prev, selectedGroupId]));
                toast.success("Davomat tasdiqlandi");
            }
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setConfirming(false);
        }
    };

    const handleSendSms = async () => {
        setSendingSms(true);
        try {
            const body = {
                date: today,
                student_ids: absentList.map(a => a.student_id),
            };
            if (selectedTemplateId) body.template_id = selectedTemplateId;
            const { error } = await supabase.functions.invoke('sms-sender', { body });
            if (error) throw error;
            toast.success(`SMS ${absentList.length} ta o'quvchiga yuborildi!`);
            setSmsModalOpen(false);
            lockGroup(today, selectedGroupId);
            setLockedGroups(prev => new Set([...prev, selectedGroupId]));
            fetchData();
        } catch {
            toast.error('SMS yuborishda xatolik yuz berdi');
        } finally {
            setSendingSms(false);
        }
    };

    const handleSkipSms = () => {
        setSmsModalOpen(false);
        lockGroup(today, selectedGroupId);
        setLockedGroups(prev => new Set([...prev, selectedGroupId]));
        toast.success("Davomat tasdiqlandi (SMS yuborilmadi)");
    };

    // ─── SCREEN 1: Group Cards ──────────────────────────────────────────────
    if (selectedGroupId === null) {
        return (
            <div className="space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Davomat</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {todayLabel} · <span className="font-semibold text-primary">{currentTime}</span>
                    </p>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
                ) : todayGroups.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <FiCalendar className="w-10 h-10 text-slate-300" />
                        <p className="text-slate-500 font-semibold">Bugun dars yo'q</p>
                        <p className="text-slate-400 text-sm text-center">Hech bir guruhda bugun dars jadval belgilanmagan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todayGroups.map((group, idx) => {
                            const groupStudents = students.filter(s =>
                                s.student_groups?.some(sg => sg.group_id === group.id)
                            );
                            const total = groupStudents.length;
                            const present = groupStudents.filter(s => attendanceMap[s.id]?.status === 'present').length;
                            const absent = groupStudents.filter(s => attendanceMap[s.id]?.status === 'absent').length;
                            const isLocked = lockedGroups.has(group.id);

                            return (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.06, duration: 0.25 }}
                                    onClick={() => setSelectedGroupId(group.id)}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                                >
                                    {/* Group name & lock */}
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{group.name}</h3>
                                        {isLocked && (
                                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">
                                                <FiLock className="w-3 h-3" /> Tasdiqlangan
                                            </span>
                                        )}
                                    </div>

                                    {/* Schedule time */}
                                    {(group.schedule_start || group.schedule_end) && (
                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                            <FiClock className="w-3 h-3" />
                                            {group.schedule_start ? String(group.schedule_start).slice(0, 5) : ''}
                                            {group.schedule_start && group.schedule_end ? ' – ' : ''}
                                            {group.schedule_end ? String(group.schedule_end).slice(0, 5) : ''}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="mt-4 space-y-1.5">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <FiUsers className="w-3.5 h-3.5" />
                                            <span>{total} nafar o'quvchi</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                            <span className="w-3.5 text-center font-bold">✓</span>
                                            <span>Keldi: <span className="font-bold">{present}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-rose-500">
                                            <span className="w-3.5 text-center font-bold">✗</span>
                                            <span>Kelmadi: <span className="font-bold">{absent}</span></span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {total > 0 && (
                                        <div className="mt-4 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${Math.round((present / total) * 100)}%` }}
                                            />
                                        </div>
                                    )}

                                    {/* Bottom action */}
                                    <div className="mt-4 flex items-center justify-between">
                                        {isLocked ? (
                                            <span className="text-xs text-slate-400">Ko'rish uchun bosing</span>
                                        ) : (
                                            <span className="text-xs font-semibold text-primary group-hover:underline">
                                                Yo'qlama olish →
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ─── SCREEN 2: Attendance for selected group ────────────────────────────
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const groupLocked = lockedGroups.has(selectedGroupId);
    const scheduleStatus = getGroupScheduleStatus(selectedGroup);
    const scheduleBlocked = scheduleStatus !== 'ok';

    const visibleStudents = students
        .filter(s => s.student_groups?.some(sg => sg.group_id === selectedGroupId))
        .filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const presentCount = visibleStudents.filter(s => attendanceMap[s.id]?.status === 'present').length;
    const absentCount  = visibleStudents.filter(s => attendanceMap[s.id]?.status === 'absent').length;

    const WEEK_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

    return (
        <>
        <div className="space-y-5 pb-24">

            {/* Header with back button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => { setSelectedGroupId(null); setSearchTerm(''); }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{selectedGroup?.name}</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {todayLabel} · <span className="font-semibold text-primary">{currentTime}</span>
                    </p>
                </div>
                {groupLocked && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex-shrink-0">
                        <FiLock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-bold text-green-700 dark:text-green-300">Tasdiqlangan</span>
                    </div>
                )}
            </div>

            {/* Schedule warning banners */}
            {scheduleStatus === 'wrong_day' && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                    <FiCalendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Bu guruh bugun dars qilmaydi</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Dars kunlari: {selectedGroup?.schedule_days?.map(d => WEEK_DAYS[d]).join(', ')}
                        </p>
                    </div>
                </div>
            )}
            {scheduleStatus === 'time_over' && (
                <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <FiClock className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Davomat vaqti tugadi</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Dars {String(selectedGroup?.schedule_end).slice(0, 5)} da tugagan
                        </p>
                    </div>
                </div>
            )}

            {/* Search + Stats */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary text-slate-900 dark:text-white transition"
                    />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                    <span className="text-xs font-bold text-green-700 dark:text-green-400">{presentCount} keldi</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{absentCount} kelmadi</span>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-16 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
                ) : visibleStudents.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">Talabalar topilmadi</div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <AnimatePresence initial={false}>
                            {visibleStudents.map((student, idx) => {
                                const rec = attendanceMap[student.id] ?? { status: 'absent', sms_sent: false };
                                const isPresent = rec.status === 'present';
                                const isSaving = savingId === student.id;
                                const smsSent = rec.sms_sent;

                                return (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.025, duration: 0.2 }}
                                        onClick={() => !isSaving && !groupLocked && !scheduleBlocked && handleToggle(student.id)}
                                        className={`flex items-center justify-between px-5 py-3.5 transition-colors select-none ${
                                            groupLocked || scheduleBlocked ? 'cursor-default opacity-75' : 'cursor-pointer'
                                        } ${!isPresent ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''} ${
                                            !groupLocked && !isPresent ? 'hover:bg-rose-50 dark:hover:bg-rose-900/20' : ''
                                        } ${!groupLocked && isPresent ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${isPresent ? 'bg-primary/10 text-primary' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                                                {student.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{student.full_name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {!isPresent && smsSent && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                            SMS ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 flex-shrink-0">
                                            <motion.span
                                                key={isPresent ? 'present' : 'absent'}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`text-xs font-bold w-14 text-right ${isPresent ? 'text-green-600 dark:text-green-400' : 'text-rose-500 dark:text-rose-400'}`}
                                            >
                                                {isPresent ? 'Keldi' : 'Kelmadi'}
                                            </motion.span>

                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                groupLocked
                                                    ? isPresent
                                                        ? 'bg-primary/30 border-primary/30'
                                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                    : isSaving
                                                    ? 'border-primary bg-primary/20'
                                                    : isPresent
                                                    ? 'bg-primary border-primary'
                                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-primary'
                                            }`}>
                                                {isSaving ? (
                                                    <div className="w-3 h-3 border-[1.5px] border-primary/40 border-t-primary rounded-full animate-spin" />
                                                ) : groupLocked ? (
                                                    <FiLock className={`w-3 h-3 ${isPresent ? 'text-primary/60' : 'text-slate-400'}`} />
                                                ) : isPresent ? (
                                                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 10" fill="none">
                                                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                ) : null}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>

        {/* Fixed bottom confirm button */}
        {!groupLocked && !loading && visibleStudents.length > 0 && !scheduleBlocked && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 sm:left-64">
                <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full flex items-center justify-center gap-2.5 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50 active:scale-[0.98]"
                >
                    {confirming ? <FiLoader className="animate-spin w-5 h-5" /> : <FiCheckCircle className="w-5 h-5" />}
                    {confirming ? 'Saqlanmoqda...' : 'Davomatni Tasdiqlash'}
                </button>
            </div>
        )}

        {/* SMS Modal */}
        <AnimatePresence>
            {smsModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
                    >
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white">SMS Yuborish</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-bold text-rose-500">{absentList.length} ta</span> o'quvchi kelmagan — SMS yuborilsinmi?
                            </p>
                        </div>

                        <div className="px-5 pt-4 max-h-36 overflow-y-auto space-y-1.5">
                            {absentList.map(rec => (
                                <div key={rec.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {rec.students?.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate font-medium">{rec.students?.full_name}</span>
                                    <span className="text-xs text-slate-400 flex-shrink-0 ml-auto">{rec.students?.parent_phone}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 space-y-3">
                            {templates.length === 0 ? (
                                <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
                                    Shablon topilmadi. SMS Sozlamalaridan tasdiqlangan shablon qo'shing.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {templates.map(tpl => (
                                        <label
                                            key={tpl.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedTemplateId === tpl.id
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <input type="radio" name="template" value={tpl.id} checked={selectedTemplateId === tpl.id} onChange={() => setSelectedTemplateId(tpl.id)} className="mt-0.5 accent-primary" />
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{tpl.name}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{tpl.body}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleSendSms}
                                disabled={sendingSms || templates.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-xl transition shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {sendingSms ? <FiLoader className="animate-spin w-4 h-4" /> : <FiSend className="w-4 h-4" />}
                                {sendingSms ? 'Yuborilmoqda...' : `SMS Yuborish (${absentList.length} ta)`}
                            </motion.button>

                            <button
                                onClick={handleSkipSms}
                                disabled={sendingSms}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                SMS yubormasdan tasdiqlash
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        </>
    );
};

export default AttendancePage;
