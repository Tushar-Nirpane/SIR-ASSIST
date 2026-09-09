'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  FileCheck2,
  RefreshCw,
  Home,
  Lock,
  KeyRound,
} from 'lucide-react';
import { NetworkIndicator } from '../atoms/NetworkIndicator';
import { ThemeToggle } from '../atoms/ThemeToggle';
import { useSyncStore } from '@/stores/syncStore';
import { useVerificationStore } from '@/stores/verificationStore';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { pendingBundles } = useSyncStore();
  const { officerId, partNo } = useVerificationStore();

  const NAV_LINKS = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/verify', label: 'Field Verify', icon: FileCheck2 },
    { href: '/search', label: 'Legacy Roll (02-04)', icon: Search },
    { href: '/sync', label: 'Sync Center', icon: RefreshCw, badge: pendingBundles.length },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gov-navy dark:bg-slate-950 text-white shadow-gov border-b border-gov-navyDark dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & System Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 dark:bg-sky-500/10 border border-white/20 dark:border-sky-500/20 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white font-mono">
                  SIR-ASSIST
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm tracking-wider">
                  GOV SECURE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 dark:text-slate-400 hidden sm:block font-medium">
                Voter Verification & 2002-04 Lineage Audit Portal
              </p>
            </div>
          </Link>

          {/* Center Navigation for Desktop */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  {typeof link.badge === 'number' && link.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Status Actions & 2FA Indicator */}
          <div className="flex items-center gap-3">
            {/* 2FA Status Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/15 text-[11px] font-mono text-emerald-300 shadow-sm">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">2FA ACTIVE</span>
            </div>

            {/* Officer ID Telemetry */}
            <div className="hidden xl:flex flex-col items-end text-right">
              <span className="text-xs font-mono font-bold text-white truncate max-w-[130px]">
                {officerId}
              </span>
              <span className="text-[10px] text-slate-300">Part {partNo}</span>
            </div>

            <NetworkIndicator />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden border-t border-gov-navyDark/60 dark:border-slate-800 bg-gov-navy dark:bg-slate-950 fixed bottom-0 inset-x-0 z-50 px-2 py-1.5 flex justify-around shadow-lg">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all relative ${
                isActive
                  ? 'bg-white/20 text-white ring-1 ring-white/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {typeof link.badge === 'number' && link.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] font-extrabold bg-emerald-500 text-white">
                    {link.badge}
                  </span>
                )}
              </div>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
