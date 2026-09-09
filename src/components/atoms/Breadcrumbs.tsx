'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home, Shield } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  classification?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  classification = 'RESTRICTED // STATUTORY AUDIT PORTAL',
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
      <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-gov-navy dark:hover:text-sky-400 font-semibold transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Portal</span>
        </Link>

        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
            {item.isCurrent || !item.href ? (
              <span className="font-bold text-gov-navy dark:text-sky-300 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-gov-navy dark:hover:text-sky-400 transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400">
        <Shield className="w-3 h-3 text-gov-green" />
        <span>{classification}</span>
      </div>
    </div>
  );
};
