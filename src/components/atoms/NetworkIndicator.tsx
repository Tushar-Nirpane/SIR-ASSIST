'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';

export const NetworkIndicator: React.FC = () => {
  const { isOnline, setIsOnline, isSyncing, triggerUplinkSync, pendingBundles } = useSyncStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Simulation toggle button */}
      <button
        onClick={() => setIsOnline(!isOnline)}
        title="Click to simulate offline / online field environment"
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 shadow-sm ${
          isOnline
            ? 'bg-emerald-600/20 border-emerald-400 text-white hover:bg-emerald-600/30'
            : 'bg-[#AC6953] border-[#AC6953] text-white hover:bg-[#8E523F] animate-pulse'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-300" />
            <span>ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-white" />
            <span>OFFLINE MODE</span>
          </>
        )}
      </button>

      {/* Direct Sync button if pending and online */}
      {pendingBundles.length > 0 && isOnline && (
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
