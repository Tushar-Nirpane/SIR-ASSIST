'use client';

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  QrCode,
  Download,
  Printer,
  FileText,
  BadgeCheck,
  Award,
} from 'lucide-react';
import { Button } from '../atoms/Button';

export interface TrustBadgeData {
  transactionId: string;
  bundleId: string;
  electorName: string;
  maskedEpic: string;
  matchScore: number;
  ocrConfidence: number;
  timestamp: string;
  officerId: string;
  partNo: string;
  sha256Digest: string;
  verdict: 'AUTHENTICITY CONFIRMED' | 'CONDITIONAL VERIFICATION' | 'DISCREPANCY FLAGGED';
}

interface VerificationTrustBadgeProps {
  data: TrustBadgeData;
  onPrint?: () => void;
}

export const VerificationTrustBadge: React.FC<VerificationTrustBadgeProps> = ({
  data,
  onPrint,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-2 border-gov-navy/20 dark:border-sky-500/30 p-6 sm:p-8 shadow-govElevated space-y-6">
      {/* Official Government Watermark Seal Effect in Background */}
      <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full border-8 border-gov-navy/5 dark:border-sky-500/5 pointer-events-none flex items-center justify-center">
        <Award className="w-36 h-36 text-gov-navy/5 dark:text-sky-400/5" />
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gov-navy text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                VERIFIED BY SIR ASSIST
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                TX: {data.transactionId}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-gov-navy dark:text-sky-300 mt-1">
              Official Field Verification Certificate
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Seal
          </Button>
        </div>
      </div>

      {/* Grid: Elector Details & Digital Cryptographic Seal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Elector Identity Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                Verified Elector
              </span>
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate block">
                {data.electorName}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                Masked EPIC / ID
              </span>
              <span className="text-sm font-mono font-bold text-gov-navy dark:text-sky-400 truncate block">
                {data.maskedEpic}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                Match Authenticity
              </span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block">
                {data.matchScore}% Score
              </span>
            </div>
          </div>

          {/* Audit Trail Metadata */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1.5 text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap justify-between gap-1">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Jurisdiction & Part:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.partNo}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-1">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Certified Officer:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.officerId}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-1">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Audit Timestamp:</span>
              <span className="text-slate-700 dark:text-slate-300">{data.timestamp}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] break-all">
              <span className="font-bold text-gov-navy dark:text-sky-300 block mb-0.5">
                Cryptographic SHA-256 Digest (AES-GCM-256 Sealed):
              </span>
              <span className="text-slate-500 dark:text-slate-400">{data.sha256Digest}</span>
            </div>
          </div>
        </div>

        {/* Digital Stamp & QR Verification Box */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-dashed border-emerald-500/40 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-200 dark:ring-emerald-900">
            <BadgeCheck className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div>
            <span className="text-[11px] font-black tracking-widest text-emerald-800 dark:text-emerald-300 uppercase block">
              STATE CERTIFIED
            </span>
            <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400">
              IMMUTABLE AUDIT LOG
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400">
            <QrCode className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <div className="text-left">
              <div className="font-bold text-slate-800 dark:text-slate-200">Scan to Verify</div>
              <div className="text-[8px] text-slate-400">sir-gov.internal/v/{data.transactionId.slice(0, 6)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
