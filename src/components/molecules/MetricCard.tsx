'use client';

import React from 'react';
import { clsx } from 'clsx';
import { InteractionCard } from '../motion/InteractionCard';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  onClick,
}) => {
  return (
    <InteractionCard
      onClick={onClick}
      className={clsx(
        'p-5 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-govCard',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-gov-blueLight dark:bg-slate-800 text-gov-navy dark:text-sky-400 shadow-sm">
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-gov-navy dark:text-sky-200">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          {trend}
        </div>
      )}
    </InteractionCard>
  );
};
