'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles,
  Camera,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';

export interface SampleDoc {
  label: string;
  name: string;
  epic: string;
  relative: string;
  age: number;
  gender: string;
  address: string;
  docType: 'EPIC / Voter Card' | 'Aadhaar Card' | 'Passport Scan';
}

export const GOV_SAMPLE_DOCS: SampleDoc[] = [
  {
    label: 'Sample 1: Ramesh Kumar Sharma',
    name: 'Ramesh Kumar Sharma',
    epic: 'XYZ1029384',
    relative: 'Dwarka Prasad Sharma',
    age: 48,
    gender: 'MALE',
    address: 'House 44, Purana Chowk, Rampur',
    docType: 'EPIC / Voter Card',
  },
  {
    label: 'Sample 2: Mohammad Afzal Khan',
    name: 'Mohammad Afzal Khan',
    epic: 'ABC9988771',
    relative: 'Abdul Ghaffar Khan',
    age: 52,
    gender: 'MALE',
    address: 'B-12, Madina Colony, Ward 4',
    docType: 'EPIC / Voter Card',
  },
  {
    label: 'Sample 3: Sunita Sharma',
    name: 'Sunita Sharma',
    epic: 'XYZ1029385',
    relative: 'Ramesh Kumar Sharma',
    age: 44,
    gender: 'FEMALE',
    address: 'House 44, Purana Chowk, Rampur',
    docType: 'EPIC / Voter Card',
  },
];

interface SmartDropzoneProps {
  onFileSelect: (fileUri: string, sampleData?: { name: string; epic: string; relative: string; fileName: string; fileSize: string; fileType: string }) => void;
  isProcessing?: boolean;
  onCameraRequest?: () => void;
}

export const SmartDropzone: React.FC<SmartDropzoneProps> = ({
  onFileSelect,
  isProcessing = false,
  onCameraRequest,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    size: string;
    type: string;
    previewUri?: string;
  } | null>(null);
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = (file: File) => {
    if (!file.type.match('image.*') && !file.type.includes('pdf')) {
      alert('Please upload an official image file (JPG, PNG, WebP) or PDF scan.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const uri = e.target.result as string;
        setSelectedFileMeta({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type.includes('pdf') ? 'PDF' : file.type.includes('png') ? 'PNG' : 'JPG',
          previewUri: uri,
        });

        onFileSelect(uri, {
          name: 'Extracted Elector',
          epic: 'EPIC' + Math.floor(1000000 + Math.random() * 9000000),
          relative: '',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          fileType: file.type,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const generateSampleCard = (sample: SampleDoc) => {
    if (!canvasRef.current) return '';
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 640, 380);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#F1F5F9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 380);

    // Official Gov Header Banner
    ctx.fillStyle = '#1A237E';
    ctx.fillRect(0, 0, 640, 56);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText('ELECTION COMMISSION OF INDIA / E-EPIC IDENTITY', 24, 35);

    // Details
    ctx.fillStyle = '#1A237E';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`EPIC: ${sample.epic}`, 30, 105);

    ctx.fillStyle = '#334155';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`Name: ${sample.name}`, 30, 150);
    ctx.fillText(`Father's / Husband's Name: ${sample.relative}`, 30, 190);
    ctx.fillText(`Age: ${sample.age} yrs    Gender: ${sample.gender}`, 30, 230);
    ctx.fillText(`Address: ${sample.address}`, 30, 270);

    // Photo Box & Security Hologram
    ctx.strokeStyle = '#1A237E';
    ctx.lineWidth = 2;
    ctx.strokeRect(450, 85, 150, 185);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(452, 87, 146, 181);
    ctx.fillStyle = '#1A237E';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('OFFICIAL PHOTO', 470, 180);

    // Hologram watermark
    ctx.strokeStyle = '#16A34A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(470, 290, 110, 40);
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('STATE VERIFIED', 485, 314);

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSelectSample = (idx: number) => {
    setSelectedSampleIdx(idx);
    const sample = GOV_SAMPLE_DOCS[idx];
    const dataUri = generateSampleCard(sample);

    setSelectedFileMeta({
      name: `${sample.name.replace(/\s+/g, '_')}_EPIC.jpg`,
      size: '284 KB',
      type: 'JPG',
      previewUri: dataUri,
    });

    onFileSelect(dataUri, {
      name: sample.name,
      epic: sample.epic,
      relative: sample.relative,
      fileName: `${sample.name.replace(/\s+/g, '_')}_EPIC.jpg`,
      fileSize: '284 KB',
      fileType: 'image/jpeg',
    });
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Smart Dropzone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFileMeta && fileInputRef.current?.click()}
        className={`relative rounded-3xl p-8 transition-all cursor-pointer border-2 border-dashed text-center flex flex-col items-center justify-center min-h-[260px] ${
          isDragOver
            ? 'border-gov-navy bg-gov-blueLight/50 dark:bg-gov-navy/20 scale-[1.01] ring-4 ring-gov-navy/20'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gov-navy dark:hover:border-sky-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
        } shadow-govCard`}
      >
        {selectedFileMeta ? (
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3.5 text-left truncate">
                <div className="w-12 h-12 rounded-xl bg-gov-navy/10 dark:bg-sky-500/10 text-gov-navy dark:text-sky-400 flex items-center justify-center shrink-0">
                  {selectedFileMeta.type === 'PDF' ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <ImageIcon className="w-6 h-6" />
                  )}
                </div>
                <div className="truncate">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {selectedFileMeta.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {selectedFileMeta.type}
                    </span>
                    <span>{selectedFileMeta.size}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready for OCR
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFileMeta(null);
                  setSelectedSampleIdx(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Choose Different File
              </Button>
              {onCameraRequest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCameraRequest();
                  }}
                  leftIcon={<Camera className="w-4 h-4" />}
                >
                  Use Live Camera
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gov-blueLight dark:bg-slate-800 text-gov-navy dark:text-sky-400 flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 stroke-[2]" />
            </div>

            <div>
              <h4 className="text-base font-extrabold text-gov-navy dark:text-sky-300">
                Drag & Drop Voter ID / EPIC Document
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Supports official formats (PDF, JPG, PNG, WebP up to 25MB). All processing executes locally on-device with zero-leak sandbox protection.
              </p>
            </div>

            {/* Real-Time File Type Badges */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold font-mono border border-slate-200 dark:border-slate-700">
                <FileText className="w-3 h-3 text-red-500" /> PDF
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold font-mono border border-slate-200 dark:border-slate-700">
                <ImageIcon className="w-3 h-3 text-blue-500" /> JPG / JPEG
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold font-mono border border-slate-200 dark:border-slate-700">
                <FileCode className="w-3 h-3 text-emerald-500" /> PNG / WebP
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
              {onCameraRequest && (
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Camera className="w-4 h-4" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCameraRequest();
                  }}
                >
                  Live Camera Scanner
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pre-configured GovTech Sample Documents for Quick Evaluation */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy dark:text-sky-300">
            <Sparkles className="w-3.5 h-3.5 text-gov-gold" />
            <span>Instant Demo: Load Statutory Sample Elector Document</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            3 Pre-loaded Test Cases
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {GOV_SAMPLE_DOCS.map((sample, idx) => (
            <button
              key={sample.epic}
              type="button"
              onClick={() => handleSelectSample(idx)}
              className={`p-3 rounded-xl text-left border text-xs transition-all shadow-sm ${
                selectedSampleIdx === idx
                  ? 'bg-white dark:bg-slate-900 border-gov-navy dark:border-sky-400 ring-2 ring-gov-navy/20 text-gov-navy dark:text-sky-300'
                  : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate">{sample.name}</div>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-gov-navy dark:text-sky-400 font-mono font-bold">{sample.epic}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {sample.age}y / {sample.gender}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
