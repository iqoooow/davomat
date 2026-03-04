import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiBarChart2 } from 'react-icons/fi';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Mobile overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
                {/* Mobile top bar */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <FiMenu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                            <FiBarChart2 className="text-white w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">Davomat</span>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-10 xl:p-12 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.25 }}
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
