import React, { useState, useEffect, useRef } from 'react';
import {
    getTemplates, addTemplate, updateTemplate, deleteTemplate,
    getSettings, saveSettings,
} from '../services/smsSettingsService';
import { supabase } from '../services/supabaseClient';
import {
    FiMessageSquare, FiSettings, FiSend, FiPlus, FiEdit2, FiTrash2,
    FiX, FiSave, FiLoader, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ── Variable definitions ──────────────────────────────────────────────────────
const VARIABLES = [
    { key: '{ism}', label: 'Ism', desc: "O'quvchi to'liq ismi", sample: 'Alisher Karimov' },
    { key: '{guruh}', label: 'Guruh', desc: "O'quvchi guruhi", sample: 'IELTS 1' },
    { key: '{sana}', label: 'Sana', desc: 'Bugungi sana', sample: '04.03.2026' },
    { key: '{bugun_yoq}', label: "Bugun yo'q", desc: 'Bugun kelmagan darslar', sample: '1' },
    { key: '{oy_yoq}', label: "Oyda yo'q", desc: 'Shu oyda kelmagan kunlar', sample: '5' },
    { key: '{jami_yoq}', label: "Jami yo'q", desc: 'Umuman kelmagan kunlar', sample: '12' },
];

const SAMPLE_DATA = {
    '{ism}': 'Alisher Karimov',
    '{guruh}': 'IELTS 1',
    '{sana}': '04.03.2026',
    '{bugun_yoq}': '1',
    '{oy_yoq}': '5',
    '{jami_yoq}': '12',
};

const TYPE_LABELS = {
    daily: { label: 'Kunlik', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    monthly: { label: 'Oylik', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    custom: { label: 'Maxsus', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
};

function fillPreview(body) {
    let result = body;
    Object.entries(SAMPLE_DATA).forEach(([key, val]) => {
        result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
    });
    return result;
}

// ── Template Modal ────────────────────────────────────────────────────────────
const TemplateModal = ({ template, onClose, onSaved }) => {
    const [formData, setFormData] = useState({
        name: template?.name || '',
        body: template?.body || '',
        type: template?.type || 'daily',
    });
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const textareaRef = useRef(null);

    const insertVariable = (variable) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newBody = formData.body.slice(0, start) + variable + formData.body.slice(end);
        setFormData(prev => ({ ...prev, body: newBody }));
        setTimeout(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + variable.length;
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.body.trim()) { toast.error('Shablon matni kiritilmagan'); return; }
        setSaving(true);
        try {
            if (template) {
                await updateTemplate(template.id, formData);
                toast.success('Shablon yangilandi');
            } else {
                await addTemplate(formData);
                toast.success("Shablon qo'shildi");
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[95vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {template ? 'Shablonni Tahrirlash' : 'Yangi Shablon'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">Dinamik o'zgaruvchilardan foydalaning</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <FiX className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Name + Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Shablon nomi *</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="Masalan: Kunlik yo'qlik"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tur</label>
                                <select
                                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                                    value={formData.type}
                                    onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                                >
                                    <option value="daily">Kunlik yo'qlik</option>
                                    <option value="monthly">Oylik ogohlantirish</option>
                                    <option value="custom">Maxsus</option>
                                </select>
                            </div>
                        </div>

                        {/* Variable buttons */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                O'zgaruvchilar — bosing, matn ichiga qo'yiladi
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {VARIABLES.map(v => (
                                    <button
                                        key={v.key}
                                        type="button"
                                        onClick={() => insertVariable(v.key)}
                                        title={v.desc}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all border border-primary/20 hover:border-primary"
                                    >
                                        <span className="font-mono">{v.key}</span>
                                        <span className="text-[10px] opacity-70">— {v.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Textarea + Preview toggle */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Shablon matni *</label>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(p => !p)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                                >
                                    {showPreview ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                                    {showPreview ? "Ko'rishni yopish" : "Namunani ko'rish"}
                                </button>
                            </div>
                            <textarea
                                ref={textareaRef}
                                required rows={4}
                                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white font-mono text-sm resize-none"
                                placeholder="Hurmatli ota-ona, farzandingiz {ism} bugun ({sana}) darsga kelmadi. Shu oyda {oy_yoq} kun kelmagan."
                                value={formData.body}
                                onChange={(e) => setFormData(p => ({ ...p, body: e.target.value }))}
                            />
                            <p className="text-xs text-slate-400 text-right">{formData.body.length} belgi</p>

                            {/* Preview */}
                            <AnimatePresence>
                                {showPreview && formData.body && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-2">Namuna ko'rinishi:</p>
                                            <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">{fillPreview(formData.body)}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            type="submit" disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50"
                        >
                            {saving ? <FiLoader className="animate-spin w-4 h-4" /> : <FiSave className="w-4 h-4" />}
                            {template ? 'Saqlash' : "Shablon Qo'shish"}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'templates', label: 'Shablonlar', icon: FiMessageSquare },
    { id: 'eskiz', label: 'Eskiz.uz', icon: FiSettings },
    { id: 'test', label: 'Test SMS', icon: FiSend },
];

const SmsSettingsPage = () => {
    const [activeTab, setActiveTab] = useState('templates');
    const [templates, setTemplates] = useState([]);
    const [settings, setSettings] = useState({ eskiz_email: '', eskiz_password: '', eskiz_from: '4546' });
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [testTemplateId, setTestTemplateId] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tpls, stgs] = await Promise.all([getTemplates(), getSettings()]);
            setTemplates(tpls);
            setSettings(prev => ({ ...prev, ...stgs }));
        } catch {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("Shablonni o'chirasizmi?")) return;
        try {
            await deleteTemplate(id);
            toast.success("Shablon o'chirildi");
            fetchData();
        } catch {
            toast.error("O'chirishda xatolik");
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            await saveSettings(settings);
            toast.success('Sozlamalar saqlandi');
        } catch {
            toast.error('Saqlashda xatolik');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: settings.eskiz_email, password: settings.eskiz_password }),
            });
            const data = await res.json();
            if (data?.data?.token) {
                toast.success('Eskiz bilan ulanish muvaffaqiyatli!');
            } else {
                toast.error("Ulanishda xatolik: email yoki parol noto'g'ri");
            }
        } catch {
            toast.error("Ulanishda xatolik yuz berdi");
        } finally {
            setTestingConnection(false);
        }
    };

    const handleSendTest = async (e) => {
        e.preventDefault();
        if (!testPhone.trim()) { toast.error('Telefon raqam kiritilmagan'); return; }

        let message = testMessage;
        if (!message && testTemplateId) {
            const tpl = templates.find(t => t.id === testTemplateId);
            if (tpl) message = fillPreview(tpl.body);
        }
        if (!message) { toast.error('Xabar matni kiritilmagan'); return; }

        setSendingTest(true);
        try {
            const { error } = await supabase.functions.invoke('sms-sender', {
                body: { phone: testPhone, message },
            });
            if (error) throw error;
            toast.success('Test SMS yuborildi!');
            setTestPhone('');
            setTestMessage('');
        } catch (err) {
            toast.error(`Xatolik: ${err.message || 'SMS yuborilmadi'}`);
        } finally {
            setSendingTest(false);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">SMS Sozlamalari</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    Shablonlar, Eskiz.uz va test SMS
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all whitespace-nowrap border-b-2 -mb-px ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab: Shablonlar ──────────────────────────────────────────── */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            Jami {templates.length} ta shablon
                        </p>
                        <button
                            onClick={() => { setEditingTemplate(null); setModalOpen(true); }}
                            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-primary/25 active:scale-95"
                        >
                            <FiPlus className="w-4 h-4" />
                            Yangi Shablon
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16"><FiLoader className="w-8 h-8 text-primary animate-spin" /></div>
                    ) : templates.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FiMessageSquare className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">Hali shablonlar yo'q</p>
                            <p className="text-slate-400 text-sm mt-1">Birinchi shablonni qo'shing</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {templates.map((tpl, idx) => (
                                <motion.div
                                    key={tpl.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{tpl.name}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${TYPE_LABELS[tpl.type]?.color}`}>
                                                    {TYPE_LABELS[tpl.type]?.label}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-mono leading-relaxed">{tpl.body}</p>

                                            {/* Preview */}
                                            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Namuna:</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{fillPreview(tpl.body)}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingTemplate(tpl); setModalOpen(true); }}
                                                className="p-2.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                            >
                                                <FiEdit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(tpl.id)}
                                                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Variable reference */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                            <span className="w-1 h-5 bg-primary rounded-full"></span>
                            Mavjud o'zgaruvchilar
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {VARIABLES.map(v => (
                                <div key={v.key} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <code className="text-primary font-bold text-sm bg-primary/10 px-2 py-0.5 rounded-lg flex-shrink-0">{v.key}</code>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{v.label}</p>
                                        <p className="text-xs text-slate-400">{v.desc}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Namuna: <span className="text-slate-600 dark:text-slate-300">{v.sample}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: Eskiz.uz ────────────────────────────────────────────── */}
            {activeTab === 'eskiz' && (
                <div className="max-w-xl space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex gap-3">
                        <FiAlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Bu ma'lumotlar <b>bazada xavfsiz saqlanadi</b>. Eskiz.uz da ro'yxatdan o'tmagan bo'lsangiz,
                            avval <b>notify.eskiz.uz</b> da hisob oching.
                        </p>
                    </div>

                    <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="eskiz@email.com"
                                value={settings.eskiz_email}
                                onChange={(e) => setSettings(p => ({ ...p, eskiz_email: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Parol</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full px-4 py-3.5 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                    value={settings.eskiz_password}
                                    onChange={(e) => setSettings(p => ({ ...p, eskiz_password: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                >
                                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Sender ID (From)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="4546"
                                value={settings.eskiz_from}
                                onChange={(e) => setSettings(p => ({ ...p, eskiz_from: e.target.value }))}
                            />
                            <p className="text-xs text-slate-400 ml-1">Eskiz.uz dan berilgan sender nomi yoki raqami</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testingConnection || !settings.eskiz_email || !settings.eskiz_password}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                            >
                                {testingConnection ? <FiLoader className="animate-spin w-4 h-4" /> : <FiCheckCircle className="w-4 h-4" />}
                                Ulanishni Tekshirish
                            </button>
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
                            >
                                {savingSettings ? <FiLoader className="animate-spin w-4 h-4" /> : <FiSave className="w-4 h-4" />}
                                Saqlash
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Tab: Test SMS ────────────────────────────────────────────── */}
            {activeTab === 'test' && (
                <div className="max-w-xl">
                    <form onSubmit={handleSendTest} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefon raqam *</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="998901234567"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Shablon tanlang (yoki qo'lda yozing)
                            </label>
                            <select
                                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                                value={testTemplateId}
                                onChange={(e) => {
                                    setTestTemplateId(e.target.value);
                                    const tpl = templates.find(t => t.id === e.target.value);
                                    if (tpl) setTestMessage(fillPreview(tpl.body));
                                }}
                            >
                                <option value="">— Shablon tanlash —</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Xabar matni *</label>
                            <textarea
                                rows={4} required
                                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-slate-900 dark:text-white resize-none"
                                placeholder="Shablon tanlamasangiz, xabar matnini qo'lda kiriting..."
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                            />
                            <p className="text-xs text-slate-400 text-right">{testMessage.length} belgi</p>
                        </div>

                        <button
                            type="submit" disabled={sendingTest}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50"
                        >
                            {sendingTest ? <FiLoader className="animate-spin w-4 h-4" /> : <FiSend className="w-4 h-4" />}
                            {sendingTest ? 'Yuborilmoqda...' : 'Test SMS Yuborish'}
                        </button>
                    </form>
                </div>
            )}

            {/* Template Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <TemplateModal
                        template={editingTemplate}
                        onClose={() => { setModalOpen(false); setEditingTemplate(null); }}
                        onSaved={fetchData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SmsSettingsPage;
