'use client';

import React from 'react';
import { SyncCenter } from '@/components/organisms/SyncCenter';
import { RefreshCw, Lock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/atoms/Badge';
import { Breadcrumbs } from '@/components/atoms/Breadcrumbs';
import { AnimatedSection } from '@/components/motion/AnimatedSection';

export default function SyncPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumbs
        items={[{ label: 'Sync Center', isCurrent: true }]}
        classification="OFFICIAL // CENTRAL GATEWAY UPLINK VAULT"
      />

      <AnimatedSection>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gov-navy text-white flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gov-navy dark:text-sky-300 tracking-tight">
                Cryptographic Sync Center & Uplink Gateway
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Audit, verify, export, and upload AES-GCM-256 encrypted verification bundles to central election commission servers.
            </p>
          </div>

          <Badge variant="emerald" icon={<Lock className="w-3 h-3" />}>
            AES-GCM-256 / SHA-256 AEAD Active
          </Badge>
        </div>
      </AnimatedSection>

      <AnimatedSection>
        <SyncCenter />
      </AnimatedSection>
    </div>
  );
}
