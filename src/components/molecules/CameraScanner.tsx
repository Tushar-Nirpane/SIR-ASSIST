'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../atoms/Button';

interface CameraScannerProps {
  onCapture: (imageDataUri: string, sampleData?: { name: string; epic: string; relative: string }) => void;
  isProcessing?: boolean;
}

const SAMPLE_DOCUMENTS = [
  {
    label: 'Sample 1: Ramesh Kumar Sharma (EPIC: XYZ1029384)',
    name: 'Ramesh Kumar Sharma',
    epic: 'XYZ1029384',
    relative: 'Dwarka Prasad Sharma',
    age: 48,
    gender: 'MALE',
    address: 'House 44, Purana Chowk, Rampur',
  },
  {
    label: 'Sample 2: Mohammad Afzal Khan (EPIC: ABC9988771)',
    name: 'Mohammad Afzal Khan',
    epic: 'ABC9988771',
    relative: 'Abdul Ghaffar Khan',
    age: 52,
    gender: 'MALE',
    address: 'B-12, Madina Colony, Ward 4',
  },
  {
    label: 'Sample 3: Sunita Sharma (EPIC: XYZ1029385)',
    name: 'Sunita Sharma',
    epic: 'XYZ1029385',
    relative: 'Ramesh Kumar Sharma',
    age: 44,
    gender: 'FEMALE',
    address: 'House 44, Purana Chowk, Rampur',
  },
];

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCapture,
  isProcessing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<number | null>(null);

  const startCamera = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera API is unavailable in this browser or context. Use HTTPS (or localhost) with a Chromium/Safari browser, or upload an image instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Use `ideal` (not `exact`) for facingMode so desktops/laptops with
        // only a front camera fall back gracefully instead of throwing
        // OverconstrainedError.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      const video = videoRef.current;
      if (!video) {
        // Should not happen now that <video> is always mounted, but never
        // leak a live stream if it does.
        stream.getTracks().forEach((track) => track.stop());
        setCameraError('Camera preview could not be initialised. Please try again.');
        return;
      }

      video.srcObject = stream;
      setCameraActive(true);
      // play() can reject when the browser defers playback; the stream is
      // still attached, so treat a rejection as non-fatal.
      try {
        await video.play();
      } catch {
        /* muted + playsInline makes autoplay safe to ignore */
      }
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable. You can upload an image or choose a pre-loaded document sample.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      onCapture(dataUri);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onCapture(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (idx: number) => {
    setSelectedSample(idx);
    const sample = SAMPLE_DOCUMENTS[idx];

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Card Background
        const grad = ctx.createLinearGradient(0, 0, 600, 360);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, '#E8EBEB');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 360);

        // Header
        ctx.fillStyle = '#0C3B5D';
        ctx.fillRect(0, 0, 600, 50);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('ELECTION COMMISSION OF INDIA / E-EPIC CARD', 20, 32);

        // Details
        ctx.fillStyle = '#0C3B5D';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`EPIC: ${sample.epic}`, 30, 100);

        ctx.fillStyle = '#302D2D';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Elector Name: ${sample.name}`, 30, 140);
        ctx.fillText(`Father's / Husband's Name: ${sample.relative}`, 30, 175);
        ctx.fillText(`Age: ${sample.age}    Gender: ${sample.gender}`, 30, 210);
        ctx.fillText(`Address: ${sample.address}`, 30, 245);

        // Watermark Seal
        ctx.strokeStyle = '#AC6953';
        ctx.lineWidth = 3;
        ctx.strokeRect(430, 80, 140, 180);
        ctx.fillStyle = '#2C638A';
        ctx.font = '12px sans-serif';
        ctx.fillText('[PHOTO EMBEDDED]', 440, 170);

        const dataUri = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUri, {
          name: sample.name,
          epic: sample.epic,
          relative: sample.relative,
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewfinder */}
      <div className="relative aspect-video max-h-[360px] w-full rounded-2xl overflow-hidden bg-[#E8EBEB] border border-[#BEC3C8] flex flex-col items-center justify-center shadow-inner">
        {/* The <video> node is ALWAYS mounted (visibility toggled via CSS) so
            that videoRef.current exists when getUserMedia() resolves. */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${cameraActive ? '' : 'hidden'}`}
        />

        {cameraActive ? (
          <>
            {/* Viewfinder Target Guide */}
            <div className="absolute inset-4 border-2 border-dashed border-[#AC6953] rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-white bg-[#0C3B5D]/90 px-2 py-0.5 rounded shadow">
                <span>ALIGN VOTER CARD / EPIC / AADHAAR</span>
                <span className="animate-pulse">● LIVE</span>
              </div>
              <div className="text-center text-xs font-semibold text-white bg-[#0C3B5D]/80 py-1 rounded shadow">
                Keep document steady in frame for on-device OCR
              </div>
            </div>

            {/* Floating Capture Trigger */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
              <Button
                onClick={handleCaptureFrame}
                isLoading={isProcessing}
                variant="primary"
                size="lg"
                leftIcon={<Camera className="w-5 h-5" />}
              >
                Scan Document
              </Button>
              <Button onClick={stopCamera} variant="outline" size="lg">
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#BEC3C8] flex items-center justify-center mx-auto text-[#0C3B5D] shadow-sm">
              <Camera className="w-8 h-8 text-[#0C3B5D]" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-[#0C3B5D]">Zero-Leak Document Scanner</h4>
              <p className="text-xs text-[#302D2D] mt-1 leading-relaxed">
                Scans are processed 100% on-device in an isolated Web Worker thread. No document imagery or PII ever leaves your browser.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button
                onClick={startCamera}
                variant="primary"
                size="md"
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Open Camera
              </Button>

              <label className="cursor-pointer">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Upload className="w-4 h-4" />}
                  onClick={() => {}}
                >
                  Upload File
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {cameraError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sample Document Section */}
      <div className="p-4 rounded-xl bg-[#E8EBEB]/70 border border-[#BEC3C8] space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0C3B5D]">
          <Sparkles className="w-3.5 h-3.5 text-[#AC6953]" />
          <span>Quick Test: Select Pre-configured Sample Document</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SAMPLE_DOCUMENTS.map((sample, idx) => (
            <button
              key={sample.epic}
              onClick={() => handleSelectSample(idx)}
              className={`p-3 rounded-lg text-left border text-xs transition-all shadow-sm ${
                selectedSample === idx
                  ? 'bg-white border-[#AC6953] ring-2 ring-[#AC6953]/20 text-[#0C3B5D]'
                  : 'bg-white border-[#BEC3C8] hover:border-[#2C638A] text-[#302D2D]'
              }`}
            >
              <div className="font-bold text-[#0C3B5D] truncate">{sample.name}</div>
              <div className="text-[11px] text-[#2C638A] font-mono font-bold mt-0.5">{sample.epic}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
