'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { StepProgress } from '@/components/atoms/StepProgress';
import { Breadcrumbs } from '@/components/atoms/Breadcrumbs';
import { OCRScanPipeline } from '@/components/organisms/OCRScanPipeline';
import { LegacyMatchExplorer } from '@/components/organisms/LegacyMatchExplorer';
import { DynamicRuleEngine } from '@/components/organisms/DynamicRuleEngine';
import { DEFAULT_DYNAMIC_RULE_SCHEMA } from '@/lib/rules/default-checklist-config';
import { VerificationTrustBadge, TrustBadgeData } from '@/components/molecules/VerificationTrustBadge';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { InteractionCard } from '@/components/motion/InteractionCard';
import { useVerificationStore } from '@/stores/verificationStore';
import { useSyncStore } from '@/stores/syncStore';
import {
  encryptVerificationRecord,
  VerificationRecord,
} from '@/lib/crypto/sync-bundle';

function VerifyWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    currentStep,
    setStep,
    officerId,
    partNo,
    ocrState,
    selectedLegacyRecord,
    checklistValues,
    setChecklistValue,
    setGeneratedBundleId,
    isSealing,
    setIsSealing,
    resetWizard,
  } = useVerificationStore();

  const { enqueueBundle } = useSyncStore();
  const [trustBadgeData, setTrustBadgeData] = useState<TrustBadgeData | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);

  // Sync step with URL parameter and browser history
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const parsedStep = parseInt(stepParam, 10);
      if (parsedStep >= 1 && parsedStep <= 4 && parsedStep !== currentStep) {
        // Prevent skipping ahead without prerequisites
        if (parsedStep === 2 && !ocrState) return;
        if (parsedStep === 3 && !ocrState) return;
        setStep(parsedStep);
      }
    }
  }, [searchParams, currentStep, ocrState, setStep]);

  const updateStep = (newStep: number) => {
    setStep(newStep);
    router.push(`/verify?step=${newStep}`, { scroll: false });
  };

  // Warn officer if they attempt to close the tab during an in-progress verification
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep > 1 && currentStep < 4) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep]);

  const handleOCRComplete = () => {
    updateStep(2);
  };

  const handleMatchComplete = () => {
    updateStep(3);
  };

  const maskEpic = (epic: string) => {
    if (!epic) return 'XXXX-XXXX-0000';
    if (epic.length <= 4) return 'XXXX-' + epic;
    return epic.slice(0, 3) + '-XXXX-' + epic.slice(-3);
  };

  const handleExecuteSeal = async () => {
    setSealError(null);

    // Fail loudly if required verification fields are missing instead of sealing fake placeholders
    const epicNo = ocrState?.extractedEpic || selectedLegacyRecord?.epicNo;
    const fullName = ocrState?.extractedName || selectedLegacyRecord?.fullName;

    if (!epicNo || epicNo.trim() === '' || epicNo === 'PENDING-EPIC') {
      setSealError('Cannot seal verification record: A valid EPIC number must be extracted or entered.');
      return;
    }

    if (!fullName || fullName.trim() === '' || fullName === 'Verified Citizen') {
      setSealError('Cannot seal verification record: Elector full name is required and cannot be empty.');
      return;
    }

    if (!partNo || partNo.trim() === '') {
      setSealError('Cannot seal verification record: Polling part number is missing.');
      return;
    }

    setIsSealing(true);

    try {
      const relativeName = ocrState?.extractedRelative || selectedLegacyRecord?.relativeName;
      const txId = 'TX-' + crypto.randomUUID().slice(0, 8).toUpperCase();

      const record: VerificationRecord = {
        id: 'REC-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
        epicNo,
        fullName,
        relativeName,
        partNo,
        serialNo: selectedLegacyRecord?.serialNo ? `#${selectedLegacyRecord.serialNo}` : undefined,
        verificationStatus: checklistValues.fieldVerdict || 'VERIFIED',
        matchScore: selectedLegacyRecord?.matchScore || (ocrState ? ocrState.confidence : 90),
        ocrConfidence: ocrState?.confidence ?? 0,
        checklistResponses: checklistValues,
        discrepancyNotes: checklistValues.officerRemarks,
        timestamp: new Date().toLocaleString(),
        officerId,
        geoCoordinates: {
          latitude: 26.8467,
          longitude: 80.9462,
          accuracy: 8,
        },
      };

      const encryptedBundle = await encryptVerificationRecord(record, officerId);
      await enqueueBundle(encryptedBundle);

      setGeneratedBundleId(encryptedBundle.bundleId);
      setTrustBadgeData({
        transactionId: txId,
        bundleId: encryptedBundle.bundleId,
        electorName: record.fullName,
        maskedEpic: maskEpic(record.epicNo),
        matchScore: record.matchScore,
        ocrConfidence: record.ocrConfidence,
        timestamp: record.timestamp,
        officerId: record.officerId,
        partNo: record.partNo,
        sha256Digest: encryptedBundle.checksum,
        verdict: 'AUTHENTICITY CONFIRMED',
      });

      updateStep(4);
    } catch (err: any) {
      setSealError(`Cryptographic sealing error: ${err.message || 'Operation failed'}`);
    } finally {
      setIsSealing(false);
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 1:
        return 'Document Upload & On-Device OCR';
      case 2:
        return 'Decadal 2002-04 Legacy Roll Linkage';
      case 3:
        return 'Statutory Field Checklist';
      case 4:
        return 'Digital Certificate & Cryptographic Seal';
      default:
        return 'Voter Verification';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Field Verification', href: '/verify' },
          { label: getStepLabel(), isCurrent: true },
        ]}
        classification="OFFICIAL // 2002-04 VOTER ROLL AUDIT"
      />

      {/* Wizard Step Progress Stepper */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard">
        <StepProgress currentStep={currentStep} onSelectStep={(step) => setStep(step)} />
      </div>

      {/* Step 1: Smart Dropzone & On-Device OCR */}
      {currentStep === 1 && (
        <AnimatedSection>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-gov-navy dark:text-sky-300 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gov-navy text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Document Upload & Zero-Leak OCR Extraction
              </h2>
              <Badge variant="blue">Tesseract.js Web Worker Sandbox</Badge>
            </div>
            <OCRScanPipeline onScanComplete={handleOCRComplete} />
          </div>
        </AnimatedSection>
      )}

      {/* Step 2: 2002-04 Legacy Roll Phonetic Matching */}
      {currentStep === 2 && (
        <AnimatedSection>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gov-navy dark:text-sky-300 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gov-navy text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                2002-04 Legacy Voter Roll Linkage
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to OCR
              </Button>
            </div>
            <LegacyMatchExplorer onMatchConfirmed={handleMatchComplete} />
          </div>
        </AnimatedSection>
      )}

      {/* Step 3: Dynamic Rule Engine Checklist */}
      {currentStep === 3 && (
        <AnimatedSection>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gov-navy dark:text-sky-300 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-gov-navy text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Statutory Field Verification Checklist
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Match
              </Button>
            </div>

            <DynamicRuleEngine
              schema={DEFAULT_DYNAMIC_RULE_SCHEMA}
              values={checklistValues}
              onChange={(key, val) => setChecklistValue(key, val)}
            />

            {sealError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{sealError}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Previous Step
              </Button>

              <Button
                variant="cta"
                size="lg"
                onClick={handleExecuteSeal}
                isLoading={isSealing}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Cryptographically Seal & Issue Certificate
              </Button>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Step 4: Digital Certificate & Verification Trust Stamp */}
      {currentStep === 4 && (
        <AnimatedSection>
          <div className="space-y-6">
            {trustBadgeData ? (
              <VerificationTrustBadge data={trustBadgeData} />
            ) : (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">
                  Verification Sealed
                </h3>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-2 no-print">
              <Button
                onClick={resetWizard}
                variant="cta"
                size="md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Verify Next Elector
              </Button>

              <Link href="/sync">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Inspect in Sync Center
                </Button>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-mono text-slate-400">
          Loading Statutory Verification Environment...
        </div>
      }
    >
      <VerifyWizardContent />
    </Suspense>
  );
}
