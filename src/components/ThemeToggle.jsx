import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all shadow-sm group relative overflow-hidden"
            aria-label="Toggle Theme"
        >
            <motion.div
                initial={false}
                animate={{ y: theme === 'light' ? 0 : -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <FiSun className="w-5 h-5 group-hover:text-amber-500 transition-colors" />
            </motion.div>
            <motion.div
                initial={false}
                animate={{ y: theme === 'dark' ? -25 : 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute left-2.5"
            >
                <FiMoon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
            </motion.div>
        </button>
    );
};

export default ThemeToggle;
