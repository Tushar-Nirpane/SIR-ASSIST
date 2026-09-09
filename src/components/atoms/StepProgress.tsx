'use client';

import React from 'react';
import { Check, UploadCloud, Scan, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface StepProgressProps {
  currentStep: number;
  onSelectStep?: (step: number) => void;
}

const STEPS = [
  { id: 1, label: 'Upload', subtitle: 'Smart Dropzone', icon: UploadCloud },
  { id: 2, label: 'Scan', subtitle: 'On-Device OCR', icon: Scan },
  { id: 3, label: 'Verify', subtitle: 'Decadal Match', icon: ClipboardCheck },
  { id: 4, label: 'Finish', subtitle: 'Crypto Stamp', icon: ShieldCheck },
];

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  onSelectStep,
}) => {
  return (
    <div className="w-full py-1">
      <div className="flex items-center justify-between max-w-2xl mx-auto px-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <button
                type="button"
                onClick={() => isCompleted && onSelectStep?.(step.id)}
                disabled={!isCompleted && !isCurrent}
                className={`group flex flex-col items-center gap-1 focus:outline-none transition-all ${
                  isCompleted
                    ? 'cursor-pointer'
                    : isCurrent
                    ? 'cursor-default'
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gov-navy border-gov-navy text-white shadow-md'
                      : isCurrent
                      ? 'bg-gov-green border-gov-green text-white ring-4 ring-gov-green/25 shadow-lg scale-105'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[2.8]" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="text-center">
                  <span
                    className={`text-xs font-bold tracking-tight block ${
                      isCurrent
                        ? 'text-gov-navy dark:text-sky-300 font-extrabold'
                        : isCompleted
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                    {step.subtitle}
                  </span>
                </div>
              </button>

              {/* Connecting Progress Line */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-[3px] mx-2 sm:mx-3 -mt-6 bg-slate-200 dark:bg-slate-700 relative overflow-hidden rounded-full">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      currentStep > step.id
                        ? 'bg-gov-navy dark:bg-sky-500 w-full'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
