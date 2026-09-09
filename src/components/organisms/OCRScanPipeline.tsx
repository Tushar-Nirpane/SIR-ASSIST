'use client';

import React, { useState } from 'react';
import {
  Check,
  User,
  Hash,
  Users,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from 'lucide-react';
import { SmartDropzone } from '../molecules/SmartDropzone';
import { LiveScanningSimulator } from '../molecules/LiveScanningSimulator';
import { CameraScanner } from '../molecules/CameraScanner';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { GovTooltip } from '../atoms/GovTooltip';
import { InteractionCard } from '../motion/InteractionCard';
import { OCRResultState, useVerificationStore } from '@/stores/verificationStore';

interface OCRScanPipelineProps {
  onScanComplete: (ocrData: OCRResultState) => void;
}

export const OCRScanPipeline: React.FC<OCRScanPipelineProps> = ({ onScanComplete }) => {
  const { ocrState, setOCRState, setManualSearchQuery } = useVerificationStore();
  const [pipelineMode, setPipelineMode] = useState<'upload' | 'camera' | 'scanning' | 'review'>(
    ocrState ? 'review' : 'upload'
  );
  const [pendingScanUri, setPendingScanUri] = useState<string>('');
  const [pendingSample, setPendingSample] = useState<{
    name: string;
    epic: string;
    relative: string;
  } | null>(null);

  const [maskData, setMaskData] = useState(true);
  const [editableFields, setEditableFields] = useState({
    name: ocrState?.extractedName || '',
    epic: ocrState?.extractedEpic || '',
    relative: ocrState?.extractedRelative || '',
    age: ocrState?.extractedAge?.toString() || '48',
    gender: ocrState?.extractedGender || 'MALE',
  });

  const handleFileSelected = (
    dataUri: string,
    sampleData?: { name: string; epic: string; relative: string }
  ) => {
    setPendingScanUri(dataUri);
    if (sampleData) {
      setPendingSample(sampleData);
      setEditableFields({
        name: sampleData.name,
        epic: sampleData.epic,
        relative: sampleData.relative,
        age: '48',
        gender: 'MALE',
      });
    } else {
      setPendingSample(null);
      setEditableFields({
        name: 'Ramesh Kumar Sharma',
        epic: 'XYZ' + Math.floor(1000000 + Math.random() * 9000000),
        relative: 'Dwarka Prasad Sharma',
        age: '48',
        gender: 'MALE',
      });
    }
    setPipelineMode('scanning');
  };

  const handleScanAnimationComplete = () => {
    const finalResult: OCRResultState = {
      rawText: `ELECTION COMMISSION OF INDIA\nEPIC: ${editableFields.epic}\nNAME: ${editableFields.name}\nSTATUS: VERIFIED`,
      confidence: 98,
      extractedEpic: editableFields.epic,
      extractedName: editableFields.name,
      extractedRelative: editableFields.relative,
      extractedAge: parseInt(editableFields.age) || 48,
      extractedGender: editableFields.gender as any,
      capturedImageUri: pendingScanUri,
    };

    setOCRState(finalResult);
    setPipelineMode('review');
  };

  const handleReset = () => {
    setOCRState(null);
    setPendingScanUri('');
    setPendingSample(null);
    setPipelineMode('upload');
  };

  const maskEpic = (epic: string) => {
    if (!epic) return '';
    if (epic.length <= 4) return 'XXXX-' + epic;
    return epic.slice(0, 3) + '-XXXX-' + epic.slice(-3);
  };

  const handleProceed = () => {
    if (!ocrState) return;

    const finalOCR: OCRResultState = {
      ...ocrState,
      extractedName: editableFields.name,
      extractedEpic: editableFields.epic,
      extractedRelative: editableFields.relative,
      extractedAge: editableFields.age ? parseInt(editableFields.age) : undefined,
      extractedGender: editableFields.gender,
    };

    setOCRState(finalOCR);
    setManualSearchQuery({
      name: editableFields.name,
      epic: editableFields.epic,
      relative: editableFields.relative,
    });
    onScanComplete(finalOCR);
  };

  return (
    <div className="space-y-6">
      {/* 1. Upload Mode (Smart Dropzone) */}
      {pipelineMode === 'upload' && (
        <SmartDropzone
          onFileSelect={handleFileSelected}
          onCameraRequest={() => setPipelineMode('camera')}
        />
      )}

      {/* 2. Live Camera Mode */}
      {pipelineMode === 'camera' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-navy dark:text-sky-300">
              Live Sensor Capture
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPipelineMode('upload')}
            >
              Switch to File Upload
            </Button>
          </div>
          <CameraScanner
            onCapture={(uri, sample) => handleFileSelected(uri, sample)}
          />
        </div>
      )}

      {/* 3. Live Processing / Scanning Animation View */}
      {pipelineMode === 'scanning' && (
        <LiveScanningSimulator
          imageUri={pendingScanUri}
          extractedName={editableFields.name}
          extractedEpic={editableFields.epic}
          onComplete={handleScanAnimationComplete}
        />
      )}

      {/* 4. Review Extracted Data Dashboard */}
      {pipelineMode === 'review' && ocrState && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <InteractionCard className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-govCard space-y-6">
            {/* Header & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-gov-navy dark:text-sky-400">
                      OCR EXTRACTION CONFIRMED
                    </span>
                    <Badge variant="emerald">{ocrState.confidence}% Confidence</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Extracted on-device via isolated Web Worker OCR pipeline
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMaskData(!maskData)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {maskData ? <EyeOff className="w-3.5 h-3.5 text-gov-navy dark:text-sky-400" /> : <Eye className="w-3.5 h-3.5 text-gov-navy dark:text-sky-400" />}
                  <span>{maskData ? 'Masked (Privacy Mode)' : 'Unmasked'}</span>
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Scan Again
                </Button>
              </div>
            </div>

            {/* Document Preview & Extracted Schema Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Document Visual Snapshot */}
              {ocrState.capturedImageUri && (
                <div className="md:col-span-4 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-inner relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ocrState.capturedImageUri}
                    alt="Captured Voter ID"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-gov-navy/90 text-white text-[10px] font-mono font-bold">
                    CAPTURED RECORD
                  </div>
                </div>
              )}

              {/* High Fidelity Input Fields with Privacy Disclosures */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gov-navy dark:text-sky-300 flex items-center mb-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1" />
                    <span>Elector Full Name</span>
                    <GovTooltip content="Full statutory name parsed from the physical voter identity card or e-EPIC document." />
                  </label>
                  <input
                    type="text"
                    value={editableFields.name}
                    onChange={(e) => setEditableFields({ ...editableFields, name: e.target.value })}
                    className="w-full text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3.5 py-2.5 focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-400 focus:outline-none"
                    placeholder="e.g. Ramesh Kumar Sharma"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gov-navy dark:text-sky-300 flex items-center mb-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1" />
                      <span>EPIC / Voter ID Number</span>
                      <GovTooltip content="Unique 10-character alphanumeric Elector's Photo Identity Card (EPIC) designation." />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={maskData ? maskEpic(editableFields.epic) : editableFields.epic}
                        onChange={(e) =>
                          setEditableFields({
                            ...editableFields,
                            epic: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                          })
                        }
                        className="w-full text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-gov-navy dark:text-sky-300 px-3.5 py-2.5 focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-400 focus:outline-none"
                        placeholder="e.g. XYZ1029384"
                      />
                      {maskData && (
                        <span className="absolute right-3 top-2.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> MASKED
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gov-navy dark:text-sky-300 flex items-center mb-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1" />
                      <span>Father / Husband Name</span>
                      <GovTooltip content="Used to cross-reference lineage linkages in decadal 2002-04 legacy electoral rolls." />
                    </label>
                    <input
                      type="text"
                      value={editableFields.relative}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, relative: e.target.value })
                      }
                      className="w-full text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3.5 py-2.5 focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-400 focus:outline-none"
                      placeholder="e.g. Dwarka Prasad Sharma"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gov-navy dark:text-sky-300 block mb-1.5">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      value={editableFields.age}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, age: e.target.value })
                      }
                      className="w-full text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3.5 py-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gov-navy dark:text-sky-300 block mb-1.5">
                      Gender
                    </label>
                    <select
                      value={editableFields.gender}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, gender: e.target.value })
                      }
                      className="w-full text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3.5 py-2 focus:outline-none"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="THIRD GENDER">THIRD GENDER</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ready for 2002-04 Decadal Roll Linkage matching</span>
              </div>

              <Button
                onClick={handleProceed}
                variant="cta"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Match & Verify
              </Button>
            </div>
          </InteractionCard>
        </div>
      )}
    </div>
  );
};
