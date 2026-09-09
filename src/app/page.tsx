'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileCheck2,
  Search,
  Database,
  Cpu,
  Lock,
  ArrowRight,
  Sparkles,
  KeyRound,
  Fingerprint,
  FileText,
  CheckCircle2,
  Shield,
  Clock,
  Layers,
} from 'lucide-react';
import { MetricCard } from '@/components/molecules/MetricCard';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Breadcrumbs } from '@/components/atoms/Breadcrumbs';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { InteractionCard } from '@/components/motion/InteractionCard';
import { useSyncStore } from '@/stores/syncStore';
import { useVerificationStore } from '@/stores/verificationStore';
import { legacyRollEngine } from '@/lib/db/sqlite-indexeddb-engine';
import { getHealth } from '@/lib/api/sir-assist-client';

export default function DashboardPage() {
  const { pendingBundles, isOnline, initializeStore } = useSyncStore();
  const { officerId, partNo, resetWizard } = useVerificationStore();
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    initializeStore();
    // Try to get live count from backend; fall back to offline IDB count
    getHealth()
      .then((h) => setTotalRecords(h.legacy_roll_count))
      .catch(() => legacyRollEngine.initialize().then(setTotalRecords));
  }, [initializeStore]);


  return (
    <div className="space-y-8">
      {/* Breadcrumbs Navigation with Official Gov Classification */}
      <Breadcrumbs
        items={[{ label: 'Field Officer Workspace', isCurrent: true }]}
        classification="OFFICIAL // STATUTORY ELECTOR AUDIT PORTAL"
      />

      {/* Hero Section with Dynamic Depth Scroll Wrapper */}
      <AnimatedSection>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50 to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-govElevated">
          {/* Subtle Security Shield Background Seal */}
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full border-8 border-gov-navy/5 dark:border-sky-500/5 pointer-events-none flex items-center justify-center">
            <ShieldCheck className="w-48 h-48 text-gov-navy/5 dark:text-sky-400/5" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              {/* Trust Signals & 2FA Status Indicator */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gov-navy text-white dark:bg-sky-500/20 dark:text-sky-300 text-[11px] font-mono font-bold shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GOVTECH CERTIFIED // PWA</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>2FA Active Session</span>
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">
                  Part No: <strong>{partNo}</strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gov-navy dark:text-slate-100 tracking-tight leading-tight">
                SIR Assist Voter Verification & Lineage Engine
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Statutory offline-first portal for field officers to authenticate electors and audit decadal legacy roll linkages (2002–04). Engineered with zero-leak on-device OCR, phonetic Double Metaphone matching, and hardware-accelerated Web Crypto AES-GCM-256 sealing.
              </p>

              {/* Security Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Zero-Leak OCR Sandbox</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Hardware AES-GCM-256 Vault</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Offline Ready</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0">
              <Link href="/verify" onClick={resetWizard}>
                <Button
                  variant="cta"
                  size="lg"
                  className="w-full sm:w-auto"
                  leftIcon={<FileCheck2 className="w-5 h-5" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Start Voter Verification
                </Button>
              </Link>

              <Link href="/search">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  leftIcon={<Search className="w-5 h-5" />}
                >
                  Explore Legacy Rolls (02-04)
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Metrics Row with 3D Elevated Pop-out Hover Cards */}
      <AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <MetricCard
            title="Indexed 2002-04 Roll"
            value={totalRecords.toLocaleString()}
            subtitle="Cached in Browser OPFS/IDB"
            icon={<Database className="w-5 h-5" />}
            trend="● 100% Offline Accessible"
          />
          <MetricCard
            title="Pending Sync Bundles"
            value={pendingBundles.length}
            subtitle="Encrypted with AES-GCM-256"
            icon={<Lock className="w-5 h-5" />}
            trend={
              pendingBundles.length > 0
                ? `${pendingBundles.length} awaiting central uplink`
                : 'All audit bundles synchronized'
            }
          />
          <MetricCard
            title="Certified Officer ID"
            value={officerId.split('-')[0]}
            subtitle={officerId}
            icon={<ShieldCheck className="w-5 h-5" />}
            trend="● Certified 2FA Key Pair"
          />
          <MetricCard
            title="Gateway Uplink Status"
            value={isOnline ? 'Online (Central)' : 'Offline (Local Vault)'}
            subtitle={isOnline ? 'Direct central ingestion' : 'Buffered in local IndexedDB'}
            icon={<Cpu className="w-5 h-5" />}
            trend={isOnline ? '● Ready for instant sync' : '● Stored safely on-device'}
          />
        </div>
      </AnimatedSection>

      {/* Core Technical Capabilities & GovTech Architecture */}
      <AnimatedSection>
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-gov-navy dark:text-sky-400 uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4" />
              <span>Government Security Framework</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              Core Technical Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Engineered specifically for field officers operating in low-bandwidth and remote jurisdictions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module 1: Zero-Leak OCR */}
            <InteractionCard className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-govCard space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-gov-blueLight dark:bg-slate-800 text-gov-navy dark:text-sky-400 flex items-center justify-center shadow-sm">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                On-Device OCR Worker
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tesseract.js executes inside an isolated Web Worker sandbox to extract EPIC numbers and names in real time. Zero document images or citizen PII ever leave device memory.
              </p>
            </InteractionCard>

            {/* Module 2: Phonetic Soundex Engine */}
            <InteractionCard className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-govCard space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-gov-blueLight dark:bg-slate-800 text-gov-navy dark:text-sky-400 flex items-center justify-center shadow-sm">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Phonetic & Soundex Matching
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Combines Soundex, Double Metaphone, and tokenized Levenshtein similarity to instantly match names across transliterations and spelling variations in decadal rolls.
              </p>
            </InteractionCard>

            {/* Module 3: Web Crypto Vault */}
            <InteractionCard className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-govCard space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-gov-blueLight dark:bg-slate-800 text-gov-navy dark:text-sky-400 flex items-center justify-center shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Hardware AES-GCM-256 Vault
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every verified elector record is cryptographically sealed into an encrypted bundle with SHA-256 checksums, ensuring physical device safety and regulatory compliance.
              </p>
            </InteractionCard>
          </div>
        </div>
      </AnimatedSection>

      {/* Sync Status Callout */}
      <AnimatedSection>
        <InteractionCard className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-govCard flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-gov-navy dark:text-sky-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Inspection of Queued Audit Bundles</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Review encrypted payloads, verify cryptographic key digests, or push queued records to the central election commission gateway.
            </p>
          </div>
          <Link href="/sync">
            <Button
              variant="outline"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Sync Center ({pendingBundles.length})
            </Button>
          </Link>
        </InteractionCard>
      </AnimatedSection>
    </div>
  );
}
