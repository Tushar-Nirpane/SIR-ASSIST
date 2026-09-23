import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { EncryptedSyncBundle } from '../lib/crypto/sync-bundle';
import { uploadSyncBundles } from '../lib/api/sir-assist-client';

const SYNC_BUNDLES_STORAGE_KEY = 'sir_assist_encrypted_sync_bundles_v1';
const SYNC_HISTORY_STORAGE_KEY = 'sir_assist_sync_history_v1';

export interface SyncedBatchRecord {
  batchId: string;
  count: number;
  syncedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  responseRef: string;
}

interface SyncStoreState {
  pendingBundles: EncryptedSyncBundle[];
  syncHistory: SyncedBatchRecord[];
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: string | null;
  
  // Actions
  initializeStore: () => Promise<void>;
  enqueueBundle: (bundle: EncryptedSyncBundle) => Promise<void>;
  removeBundle: (bundleId: string) => Promise<void>;
  clearAllPending: () => Promise<void>;
  setIsOnline: (online: boolean) => void;
  setSimulatedOffline: (simulated: boolean) => void;
  triggerUplinkSync: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
}

const syncBroadcast =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('sir_assist_sync_channel_v1')
    : null;

export const useSyncStore = create<SyncStoreState>((setStore, getStore) => {
  // Listen for cross-tab sync updates
  if (syncBroadcast) {
    syncBroadcast.onmessage = async (e) => {
      if (e.data?.type === 'SYNC_STATE_CHANGED') {
        const storedBundles = (await get<EncryptedSyncBundle[]>(SYNC_BUNDLES_STORAGE_KEY)) || [];
        const storedHistory = (await get<SyncedBatchRecord[]>(SYNC_HISTORY_STORAGE_KEY)) || [];
        setStore({
          pendingBundles: storedBundles,
          syncHistory: storedHistory,
        });
      } else if (e.data?.type === 'SYNC_STATUS_UPDATE') {
        setStore({ isSyncing: !!e.data.isSyncing });
      }
    };
  }

  return {
    pendingBundles: [],
    syncHistory: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSimulatedOffline: false,
    isSyncing: false,
    lastSyncTimestamp: null,

    initializeStore: async () => {
      try {
        const storedBundles = (await get<EncryptedSyncBundle[]>(SYNC_BUNDLES_STORAGE_KEY)) || [];
        const storedHistory = (await get<SyncedBatchRecord[]>(SYNC_HISTORY_STORAGE_KEY)) || [];
        setStore({
          pendingBundles: storedBundles,
          syncHistory: storedHistory,
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        });
      } catch (err) {
        console.error('Failed to load IDB sync queue:', err);
      }
    },

    enqueueBundle: async (bundle: EncryptedSyncBundle) => {
      const current = getStore().pendingBundles;
      const updated = [bundle, ...current];
      setStore({ pendingBundles: updated });
      await set(SYNC_BUNDLES_STORAGE_KEY, updated);
      syncBroadcast?.postMessage({ type: 'SYNC_STATE_CHANGED' });

      // If online and not simulated offline, attempt automatic background dispatch
      const { isOnline, isSimulatedOffline, isSyncing } = getStore();
      if (isOnline && !isSimulatedOffline && !isSyncing) {
        setTimeout(() => {
          getStore().triggerUplinkSync();
        }, 1000);
      }
    },

    removeBundle: async (bundleId: string) => {
      const current = getStore().pendingBundles;
      const updated = current.filter((b) => b.bundleId !== bundleId);
      setStore({ pendingBundles: updated });
      await set(SYNC_BUNDLES_STORAGE_KEY, updated);
      syncBroadcast?.postMessage({ type: 'SYNC_STATE_CHANGED' });
    },

    clearAllPending: async () => {
      setStore({ pendingBundles: [] });
      await set(SYNC_BUNDLES_STORAGE_KEY, []);
      syncBroadcast?.postMessage({ type: 'SYNC_STATE_CHANGED' });
    },

    setIsOnline: (online: boolean) => setStore({ isOnline: online }),
    setSimulatedOffline: (simulated: boolean) => setStore({ isSimulatedOffline: simulated }),

    triggerUplinkSync: async () => {
      const { pendingBundles, isSyncing, isOnline, isSimulatedOffline } = getStore();

      if (isSyncing) {
        return { success: false, syncedCount: 0, message: 'Sync already in progress.' };
      }

      if (pendingBundles.length === 0) {
        return { success: true, syncedCount: 0, message: 'Queue is empty. No pending bundles.' };
      }

      if (!isOnline || isSimulatedOffline) {
        return {
          success: false,
          syncedCount: 0,
          message: isSimulatedOffline
            ? 'Device is in simulated offline mode. Bundles buffered in IDB.'
            : 'Device is offline. Bundles are safely encrypted in local IndexedDB.',
        };
      }

      const executeSyncProcess = async () => {
        setStore({ isSyncing: true });
        syncBroadcast?.postMessage({ type: 'SYNC_STATUS_UPDATE', isSyncing: true });

        try {
          const currentPending = [...getStore().pendingBundles];
          const payload = currentPending.map((b) => ({
            bundle_id: b.bundleId,
            officer_id: b.officerId,
            part_no: b.metadata?.partNo ?? '',
            encrypted_payload: b.encryptedData,
            created_at: b.timestamp,
          }));

          const response = await uploadSyncBundles(payload);
          const receivedCount = response.received ?? 0;
          const failedCount = response.failed ?? 0;

          // Crucial fix: Only remove successfully received bundles from the queue!
          // Failed bundles must remain in the pending queue to prevent data loss.
          const remainingBundles = currentPending.slice(receivedCount);

          const newHistoryItem: SyncedBatchRecord = {
            batchId: 'BATCH-' + Date.now().toString(36).toUpperCase(),
            count: receivedCount,
            syncedAt: new Date().toISOString(),
            status: failedCount > 0 ? (receivedCount > 0 ? 'PARTIAL' : 'FAILED') : 'SUCCESS',
            responseRef: `SIR-UPLINK-${(response.message || 'OK').slice(0, 20)}`,
          };

          const existingHistory = getStore().syncHistory;
          const updatedHistory = [newHistoryItem, ...existingHistory];

          setStore({
            pendingBundles: remainingBundles,
            syncHistory: updatedHistory,
            isSyncing: false,
            lastSyncTimestamp: new Date().toISOString(),
          });

          await set(SYNC_BUNDLES_STORAGE_KEY, remainingBundles);
          await set(SYNC_HISTORY_STORAGE_KEY, updatedHistory);
          syncBroadcast?.postMessage({ type: 'SYNC_STATE_CHANGED' });
          syncBroadcast?.postMessage({ type: 'SYNC_STATUS_UPDATE', isSyncing: false });

          if (failedCount > 0) {
            return {
              success: receivedCount > 0,
              syncedCount: receivedCount,
              message: `Partial Sync: Uploaded ${receivedCount} bundle(s). ${failedCount} bundle(s) rejected/failed and retained in queue.`,
            };
          }

          return {
            success: true,
            syncedCount: receivedCount,
            message: `Successfully uploaded ${receivedCount} encrypted bundle(s) to the SIR-Assist backend.`,
          };
        } catch (err: any) {
          const failedHistory: SyncedBatchRecord = {
            batchId: 'BATCH-' + Date.now().toString(36).toUpperCase(),
            count: getStore().pendingBundles.length,
            syncedAt: new Date().toISOString(),
            status: 'FAILED',
            responseRef: 'UPLINK_ERROR',
          };
          const updatedHistory = [failedHistory, ...getStore().syncHistory];
          setStore({ isSyncing: false, syncHistory: updatedHistory });
          await set(SYNC_HISTORY_STORAGE_KEY, updatedHistory);
          syncBroadcast?.postMessage({ type: 'SYNC_STATUS_UPDATE', isSyncing: false });

          return {
            success: false,
            syncedCount: 0,
            message: err?.message || 'Uplink transmission failure. Bundles remain safely queued.',
          };
        }
      };

      // Coordinate cross-tab locking using Web Locks API if supported
      if (typeof navigator !== 'undefined' && 'locks' in navigator) {
        return await navigator.locks.request(
          'sir_assist_sync_uplink_lock',
          { ifAvailable: true },
          async (lock) => {
            if (!lock) {
              return {
                success: false,
                syncedCount: 0,
                message: 'Uplink sync is currently active in another browser tab.',
              };
            }
            return await executeSyncProcess();
          }
        );
      } else {
        return await executeSyncProcess();
      }
    },
  };
});

