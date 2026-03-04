import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            aria-label="Toggle Theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                    <motion.div
                        key="moon"
                        initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <FiMoon className="w-5 h-5 text-blue-400" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ opacity: 0, rotate: 30, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -30, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <FiSun className="w-5 h-5 text-amber-500" />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
};

export default ThemeToggle;
