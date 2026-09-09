'use client';

import React, { useState } from 'react';
import { Info, ShieldAlert } from 'lucide-react';

interface GovTooltipProps {
  content: string;
  title?: string;
  securityNotice?: string;
}

export const GovTooltip: React.FC<GovTooltipProps> = ({
  content,
  title = 'Statutory Purpose & Privacy',
  securityNotice = 'Data is masked on-device under Privacy Regulations.',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-slate-400 hover:text-gov-navy dark:hover:text-sky-400 focus:outline-none transition-colors p-0.5 rounded"
        aria-label="Privacy disclosure info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-slate-900 text-white text-[11px] shadow-xl z-50 border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5 font-bold text-sky-300 pb-1 border-b border-slate-800">
            <ShieldAlert className="w-3.5 h-3.5 text-gov-gold" />
            <span>{title}</span>
          </div>
          <p className="mt-1.5 text-slate-200 leading-relaxed">{content}</p>
          {securityNotice && (
            <p className="mt-1 text-[10px] text-emerald-400 font-mono">{securityNotice}</p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
