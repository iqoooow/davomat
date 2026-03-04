import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiUsers, FiCheckSquare, FiLogOut, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import { motion } from 'framer-motion';

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Tizimdan chiqildi');
            navigate('/login');
        } catch (error) {
            toast.error('Xatolik yuz berdi');
        }
    };

    const navItems = [
        { to: '/', name: 'Davomat', icon: <FiCheckSquare className="w-5 h-5" /> },
        { to: '/students', name: 'Talabalar', icon: <FiUsers className="w-5 h-5" /> },
    ];

    return (
        <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col fixed left-0 top-0 z-40 transition-colors duration-300"
        >
            <div className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <FiBarChart2 className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Davomat</h1>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${isActive
                                ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`
                        }
                    >
                        <span className={`transition-transform group-hover:scale-110 duration-200`}>
                            {item.icon}
                        </span>
                        <span>{item.name}</span>
                        {item.name === 'Davomat' && (
                            <span className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</span>
                    <ThemeToggle />
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 group"
                >
                    <FiLogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Chiqish</span>
                </button>
            </div>
        </motion.div>
    );
};

export default Sidebar;
