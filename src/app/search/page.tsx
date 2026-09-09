'use client';

import React from 'react';
import { Database, Sparkles, Search } from 'lucide-react';
import { LegacyMatchExplorer } from '@/components/organisms/LegacyMatchExplorer';
import { Badge } from '@/components/atoms/Badge';
import { Breadcrumbs } from '@/components/atoms/Breadcrumbs';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { useRouter } from 'next/navigation';
import { useVerificationStore } from '@/stores/verificationStore';

export default function SearchPage() {
  const router = useRouter();
  const { setStep } = useVerificationStore();

  const handleMatchSelect = () => {
    setStep(3);
    router.push('/verify');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[{ label: 'Legacy Roll (2002-04)', isCurrent: true }]}
        classification="OFFICIAL // HISTORIC DECADAL ELECTORAL DATABASE"
      />

      <AnimatedSection>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gov-navy text-white flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gov-navy dark:text-sky-300 tracking-tight">
                2002-04 Legacy Electoral Roll Explorer
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Standalone offline phonetic search across historic decadal voter lists stored locally in browser OPFS/IDB.
            </p>
          </div>

          <Badge variant="emerald" icon={<Sparkles className="w-3 h-3" />}>
            Soundex & Levenshtein Engine Ready
          </Badge>
        </div>
      </AnimatedSection>

      <AnimatedSection>
        <LegacyMatchExplorer onMatchConfirmed={handleMatchSelect} />
      </AnimatedSection>
    </div>
  );
}
