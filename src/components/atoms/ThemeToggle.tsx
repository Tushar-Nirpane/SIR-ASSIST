'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('sir-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sir-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sir-theme', 'light');
    }
  };

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle High-Contrast / Dark Mode"
      title="Toggle Dark Mode (Accessibility)"
      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-300"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-300 transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-200 transition-transform rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
};
