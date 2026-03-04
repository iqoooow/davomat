import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiArrowRight, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(email, password);
            toast.success('Xush kelibsiz, Admin!');
            navigate(from, { replace: true });
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Email yoki parol noto\'g\'ri!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Visual side */}
            <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-20">
                <div className="relative z-10 space-y-6">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl"
                    >
                        <FiActivity className="text-white w-12 h-12" />
                    </motion.div>
                    <h2 className="text-5xl font-black text-white leading-tight">Barcha o'quvchilaringiz <br /> nazorat ostida!</h2>
                    <p className="text-white/70 text-lg font-medium leading-relaxed max-w-md">
                        O'quv markazingizni yangi darajaga olib chiqing. Professional davomat va SMS tizimi bilan ota-onalar ishonchini qozoning.
                    </p>
                </div>

                {/* Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-dark/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            </div>

            {/* Form side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-12"
                >
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Tizimga kirish</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Boshqaruv paneliga kirish uchun ma'lumotlarni kiriting</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email manzilingiz</label>
                            <div className="relative group">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 dark:text-white font-medium"
                                    placeholder="admin@davomat.uz"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Maxfiy parol</label>
                            <div className="relative group">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 dark:text-white font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 disabled:opacity-70 flex items-center justify-center gap-2 group relative overflow-hidden"
                        >
                            <span className="relative z-10">{loading ? 'Kutib turing...' : 'Panelga kirish'}</span>
                            {!loading && <FiArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" />}
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </form>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© 2026 DAVOMAT AI</p>
                        <div className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
