'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  UploadCloud,
  Layers,
  KeyRound,
} from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';
import { decryptSyncBundle, EncryptedSyncBundle, VerificationRecord } from '@/lib/crypto/sync-bundle';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { InteractionCard } from '../motion/InteractionCard';

export const SyncCenter: React.FC = () => {
  const {
    pendingBundles,
    syncHistory,
    isOnline,
    isSyncing,
    lastSyncTimestamp,
    triggerUplinkSync,
    removeBundle,
    clearAllPending,
  } = useSyncStore();

  const [selectedBundle, setSelectedBundle] = useState<EncryptedSyncBundle | null>(null);
  const [decryptedRecord, setDecryptedRecord] = useState<VerificationRecord | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleInspectBundle = async (bundle: EncryptedSyncBundle) => {
    setSelectedBundle(bundle);
    setDecryptedRecord(null);
  };

  const handleDecrypt = async () => {
    if (!selectedBundle) return;
    setIsDecrypting(true);
    try {
      const record = await decryptSyncBundle(selectedBundle);
      setDecryptedRecord(record);
    } catch (err: any) {
      alert(`Decryption Error: ${err.message}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleSyncUplink = async () => {
    setSyncFeedback(null);
    const res = await triggerUplinkSync();
    setSyncFeedback({
      message: res.message,
      success: res.success,
    });
  };

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pendingBundles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SIR_SYNC_BUNDLES_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Uplink Action */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gov-navy dark:bg-slate-900 text-white shadow-govElevated flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-gov-navyDark dark:border-slate-800">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Local-First Cryptographic Sync Vault
              </h3>
              <p className="text-xs text-slate-300">
                {pendingBundles.length} encrypted bundle(s) stored locally in browser IndexedDB with AES-GCM-256.
              </p>
            </div>
          </div>
          {lastSyncTimestamp && (
            <p className="text-[11px] text-slate-400 font-mono pl-12">
              Last Ingestion Uplink: {new Date(lastSyncTimestamp).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          {pendingBundles.length > 0 && (
            <Button
              onClick={handleExportJSON}
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Air-Gap Bundle
            </Button>
          )}

          <Button
            onClick={handleSyncUplink}
            isLoading={isSyncing}
            variant="cta"
            size="md"
            leftIcon={<UploadCloud className="w-4 h-4" />}
          >
            {isOnline ? 'Push to Central Ingestion Gateway' : 'Offline Mode (Buffered in IDB)'}
          </Button>
        </div>
      </div>

      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border shadow-sm ${
            syncFeedback.success
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300'
          }`}
        >
          {syncFeedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* Main Grid: Pending Bundles List + Encrypted Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bundles List */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Pending Encrypted Bundles ({pendingBundles.length})</span>
            {pendingBundles.length > 0 && (
              <button
                type="button"
                onClick={clearAllPending}
                className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
              >
                Clear Queue
              </button>
            )}
          </div>

          {pendingBundles.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">All Bundles Fully Synchronized</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No local pending verifications. New records verified in the field wizard will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {pendingBundles.map((bundle) => {
                const isSelected = selectedBundle?.bundleId === bundle.bundleId;

                return (
                  <InteractionCard
                    key={bundle.bundleId}
                    onClick={() => handleInspectBundle(bundle)}
                    className={`p-4 rounded-2xl cursor-pointer shadow-govCard ${
                      isSelected
                        ? 'bg-gov-blueLight/60 dark:bg-slate-800 border-gov-navy dark:border-sky-400 ring-2 ring-gov-navy/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-gov-navy dark:text-sky-400" />
                          <span className="text-xs font-bold font-mono text-gov-navy dark:text-sky-300">
                            {bundle.bundleId}
                          </span>
                          <Badge
                            variant={
                              bundle.metadata.verifiedStatus === 'VERIFIED'
                                ? 'emerald'
                                : bundle.metadata.verifiedStatus === 'DISCREPANCY'
                                ? 'amber'
                                : 'crimson'
                            }
                            size="sm"
                          >
                            {bundle.metadata.verifiedStatus}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {bundle.metadata.voterName} ({bundle.metadata.epicNo})
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                          Part: {bundle.metadata.partNo} • {new Date(bundle.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBundle(bundle.bundleId);
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Delete Bundle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </InteractionCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Encrypted Payload & Decryption Inspector */}
        <div className="lg:col-span-6">
          {selectedBundle ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-gov-navy dark:text-sky-400" />
                  <h4 className="text-xs font-extrabold text-gov-navy dark:text-sky-300">
                    Bundle Vault Inspector: {selectedBundle.bundleId}
                  </h4>
                </div>
                <Button
                  onClick={handleDecrypt}
                  isLoading={isDecrypting}
                  variant="outline"
                  size="sm"
                  leftIcon={<Unlock className="w-3.5 h-3.5" />}
                >
                  Verify Decryption
                </Button>
              </div>

              {/* Ciphertext Metrics */}
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 font-semibold">Algorithm:</span>{' '}
                  <span className="text-gov-navy dark:text-sky-300 font-bold">{selectedBundle.algorithm}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">SHA-256 Checksum:</span>{' '}
                  <span className="text-slate-700 dark:text-slate-300 font-bold break-all">{selectedBundle.checksum}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Initialization Vector (IV):</span>{' '}
                  <span className="text-slate-600 dark:text-slate-400 font-medium break-all">{selectedBundle.iv}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">AES-GCM Ciphertext (Base64):</span>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-800 dark:text-slate-200 max-h-24 overflow-y-auto break-all mt-1 font-mono">
                    {selectedBundle.encryptedData}
                  </div>
                </div>
              </div>

              {/* Decrypted Payload Output */}
              {decryptedRecord && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payload Decrypted & SHA-256 Verified</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 font-mono overflow-x-auto max-h-56">
                    {JSON.stringify(decryptedRecord, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard text-slate-400 text-xs font-medium">
              Select any pending bundle on the left to inspect its on-device cryptographic seal and cipher data.
            </div>
          )}
        </div>
      </div>

      {/* Sync History Audit Trail */}
      {syncHistory.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gov-navy dark:text-sky-300">
            Recent Ingestion Gateway Receipts ({syncHistory.length})
          </h4>
          <div className="space-y-2">
            {syncHistory.slice(0, 5).map((hist) => (
              <div
                key={hist.batchId}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-gov-navy dark:text-sky-300">{hist.batchId}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2 font-medium">
                    ({hist.count} record(s) transmitted)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{hist.responseRef}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {new Date(hist.syncedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
