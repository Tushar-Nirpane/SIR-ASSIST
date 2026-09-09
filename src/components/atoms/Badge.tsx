import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'crimson' | 'blue' | 'cta' | 'slate' | 'gold' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  icon,
  className,
}) => {
  const variantStyles = {
    emerald:
      'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold',
    amber:
      'bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-bold',
    crimson:
      'bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 font-bold',
    blue:
      'bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 text-gov-navy dark:text-sky-300 font-bold',
    navy:
      'bg-gov-navy text-white border border-gov-navyDark font-bold shadow-sm',
    gold:
      'bg-amber-100 dark:bg-amber-900/60 border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 font-extrabold',
    cta:
      'bg-gov-green/15 dark:bg-gov-green/25 border border-gov-green/40 text-emerald-700 dark:text-emerald-300 font-bold',
    slate:
      'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-xs gap-2',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full tracking-tight shadow-sm select-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
