'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, CheckCircle2, Scan, Hash, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LiveScanningSimulatorProps {
  imageUri: string;
  onComplete: () => void;
  extractedName?: string;
  extractedEpic?: string;
}

const SCAN_STEPS = [
  { id: 1, label: 'Document Dewarping & Contrast Normalization', duration: 600 },
  { id: 2, label: 'Neural Text Bounding & Multi-line Segmentation', duration: 800 },
  { id: 3, label: 'EPIC & Elector Name Matrix Extraction', duration: 700 },
  { id: 4, label: 'Local SHA-256 Integrity Verification', duration: 500 },
];

export const LiveScanningSimulator: React.FC<LiveScanningSimulatorProps> = ({
  imageUri,
  onComplete,
  extractedName = 'Ramesh Kumar Sharma',
  extractedEpic = 'XYZ1029384',
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(15);
  const [boundingBoxes, setBoundingBoxes] = useState<Array<{ top: string; left: string; width: string; height: string; label: string }>>([]);

  useEffect(() => {
    // Stage 1
    const t1 = setTimeout(() => {
      setActiveStep(1);
      setScanProgress(45);
      setBoundingBoxes([
        { top: '22%', left: '8%', width: '45%', height: '14%', label: 'EPIC NUMBER' },
      ]);
    }, 700);

    // Stage 2
    const t2 = setTimeout(() => {
      setActiveStep(2);
      setScanProgress(75);
      setBoundingBoxes((prev) => [
        ...prev,
        { top: '38%', left: '8%', width: '55%', height: '12%', label: 'ELECTOR NAME' },
        { top: '52%', left: '8%', width: '50%', height: '12%', label: 'RELATIVE NAME' },
      ]);
    }, 1500);

    // Stage 3
    const t3 = setTimeout(() => {
      setActiveStep(3);
      setScanProgress(95);
      setBoundingBoxes((prev) => [
        ...prev,
        { top: '20%', left: '72%', width: '22%', height: '48%', label: 'PHOTO ROI' },
      ]);
    }, 2300);

    // Completion
    const t4 = setTimeout(() => {
      setActiveStep(4);
      setScanProgress(100);
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-govElevated space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gov-navy text-white flex items-center justify-center animate-pulse">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-gov-navy dark:text-sky-400 font-mono tracking-wider">
                LIVE OCR & AI EXTRACTION PIPELINE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulating zero-leak on-device optical character recognition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-gov-navy dark:text-sky-300">
          <span>PROGRESS: {scanProgress}%</span>
        </div>
      </div>

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Document View with Live Scanning Bar Laser and Bounding Boxes */}
        <div className="md:col-span-7 relative rounded-2xl overflow-hidden border-2 border-gov-navy/30 dark:border-sky-500/40 bg-slate-950 shadow-inner aspect-[16/10] flex items-center justify-center">
          {/* Document Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUri}
            alt="Scanning document"
            className="w-full h-full object-contain filter contrast-105"
          />

          {/* High-Tech Blueprint Matrix Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

          {/* Moving Semi-Transparent Blue Laser Bar Animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                top: ['0%', '94%', '0%'],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute left-0 right-0 h-1.5 bg-sky-400 scanner-laser"
            >
              <div className="w-full h-12 -mt-12 bg-gradient-to-t from-sky-400/20 to-transparent" />
            </motion.div>
          </div>

          {/* Bounding Box Highlights Detected by AI */}
          {boundingBoxes.map((box, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
              }}
              className="absolute border-2 border-emerald-400 bg-emerald-400/15 rounded-md pointer-events-none flex flex-col justify-start p-1 shadow-sm"
            >
              <span className="text-[9px] font-mono font-extrabold text-white bg-emerald-700/90 px-1 rounded self-start">
                {box.label}
              </span>
            </motion.div>
          ))}

          {/* HUD Corner Reticles */}
          <div className="absolute top-2 left-2 text-[10px] font-mono text-sky-400 bg-slate-900/80 px-2 py-0.5 rounded border border-sky-400/30">
            OCR_ENGINE: TESSERACT_V5_SANDBOX
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] font-mono text-emerald-400 bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-400/30">
            LATENCY: 12ms // LOCAL_THREAD
          </div>
        </div>

        {/* Real-time Telemetry & Skeleton Loaders */}
        <div className="md:col-span-5 space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pipeline Execution Log
            </span>

            <div className="space-y-2.5">
              {SCAN_STEPS.map((step, idx) => {
                const isDone = activeStep > idx;
                const isCurrent = activeStep === idx;

                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-xl border text-xs flex items-center gap-3 transition-all ${
                      isDone
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300'
                        : isCurrent
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-200 ring-2 ring-sky-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <div className="shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                      )}
                    </div>
                    <span className="font-semibold truncate">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skeleton Loaders for Data Extraction Simulation */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-gov-navy dark:text-sky-400" />
                <span>Extracted Schema Telemetry</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {activeStep >= 3 ? '100% Extracted' : 'Parsing Tokens...'}
              </span>
            </div>

            {activeStep < 3 ? (
              <div className="space-y-2">
                <div className="h-4 rounded skeleton-shimmer w-3/4" />
                <div className="h-4 rounded skeleton-shimmer w-1/2" />
                <div className="h-4 rounded skeleton-shimmer w-5/6" />
              </div>
            ) : (
              <div className="space-y-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 animate-in fade-in duration-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">EPIC:</span>
                  <span className="font-bold text-gov-navy dark:text-sky-300">{extractedEpic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Elector:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{extractedName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">98.4%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
