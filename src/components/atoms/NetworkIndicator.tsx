'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, FlaskConical } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';
import { getHealth } from '@/lib/api/sir-assist-client';

export const NetworkIndicator: React.FC = () => {
  const {
    isOnline,
    setIsOnline,
    isSimulatedOffline,
    setSimulatedOffline,
    isSyncing,
    triggerUplinkSync,
    pendingBundles,
  } = useSyncStore();
  const [mounted, setMounted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateOnlineStatus = () => {
      const realOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(realOnline);
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [setIsOnline]);

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    try {
      const realOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(realOnline);
      // Optional ping to central API to test end-to-end connectivity
      await getHealth();
    } catch {
      // Backend may be down even if browser has network
    } finally {
      setIsVerifying(false);
    }
  };

  if (!mounted) return null;

  const effectiveOnline = isOnline && !isSimulatedOffline;

  return (
    <div className="flex items-center gap-2">
      {/* Genuine Network Status Pill - Clicking re-verifies network state */}
      <button
        onClick={handleVerifyConnection}
        title="Real device connectivity status. Click to re-check network and backend health."
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 shadow-sm ${
          effectiveOnline
            ? 'bg-emerald-600/20 border-emerald-400 text-white hover:bg-emerald-600/30'
            : isSimulatedOffline
            ? 'bg-amber-600/30 border-amber-400 text-amber-200 hover:bg-amber-600/40'
            : 'bg-[#AC6953] border-[#AC6953] text-white hover:bg-[#8E523F] animate-pulse'
        }`}
      >
        {isVerifying ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            <span>CHECKING...</span>
          </>
        ) : effectiveOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-300" />
            <span>ONLINE</span>
          </>
        ) : isSimulatedOffline ? (
          <>
            <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
            <span>SIMULATED OFFLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-white" />
            <span>DEVICE OFFLINE</span>
          </>
        )}
      </button>

      {/* Explicit Dev / Field-Test Simulation Toggle */}
      <button
        type="button"
        onClick={() => setSimulatedOffline(!isSimulatedOffline)}
        title={
          isSimulatedOffline
            ? 'Exit offline test simulation'
            : 'Simulate field offline disconnection for testing'
        }
        className={`px-2 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors ${
          isSimulatedOffline
            ? 'bg-amber-500 text-slate-950 border-amber-400'
            : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
        }`}
      >
        {isSimulatedOffline ? 'END SIM' : 'SIM OFFLINE'}
      </button>

      {/* Direct Sync button if pending and online */}
      {pendingBundles.length > 0 && effectiveOnline && (
        <button
          onClick={() => triggerUplinkSync()}
          disabled={isSyncing}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#AC6953] border border-[#AC6953] text-white hover:bg-[#8E523F] transition-all shadow-sm"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync ({pendingBundles.length})</span>
        </button>
      )}
    </div>
  );
};
