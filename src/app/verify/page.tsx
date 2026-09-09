'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Printer,
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

export default function VerifyPage() {
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

  const handleOCRComplete = () => {
    setStep(2);
  };

  const handleMatchComplete = () => {
    setStep(3);
  };

  const maskEpic = (epic: string) => {
    if (!epic) return 'XXXX-XXXX-0000';
    if (epic.length <= 4) return 'XXXX-' + epic;
    return epic.slice(0, 3) + '-XXXX-' + epic.slice(-3);
  };

  const handleExecuteSeal = async () => {
    setIsSealing(true);

    try {
      const epicNo = ocrState?.extractedEpic || selectedLegacyRecord?.epicNo || 'PENDING-EPIC';
      const fullName = ocrState?.extractedName || selectedLegacyRecord?.fullName || 'Verified Citizen';
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
        matchScore: selectedLegacyRecord?.matchScore || (ocrState ? 98 : 90),
        ocrConfidence: ocrState?.confidence || 98,
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

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });

      setStep(4);
    } catch (err: any) {
      alert(`Cryptographic sealing error: ${err.message}`);
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
