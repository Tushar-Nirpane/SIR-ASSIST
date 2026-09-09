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
  status: 'SUCCESS' | 'FAILED';
  responseRef: string;
}

interface SyncStoreState {
  pendingBundles: EncryptedSyncBundle[];
  syncHistory: SyncedBatchRecord[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: string | null;
  
  // Actions
  initializeStore: () => Promise<void>;
  enqueueBundle: (bundle: EncryptedSyncBundle) => Promise<void>;
  removeBundle: (bundleId: string) => Promise<void>;
  clearAllPending: () => Promise<void>;
  setIsOnline: (online: boolean) => void;
  triggerUplinkSync: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
}

export const useSyncStore = create<SyncStoreState>((setStore, getStore) => ({
  pendingBundles: [],
  syncHistory: [],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
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

    // If online, attempt automatic background dispatch
    if (getStore().isOnline && !getStore().isSyncing) {
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
  },

  clearAllPending: async () => {
    setStore({ pendingBundles: [] });
    await set(SYNC_BUNDLES_STORAGE_KEY, []);
  },

  setIsOnline: (online: boolean) => setStore({ isOnline: online }),

  triggerUplinkSync: async () => {
    const { pendingBundles, isSyncing, isOnline } = getStore();

    if (isSyncing) {
      return { success: false, syncedCount: 0, message: 'Sync already in progress.' };
    }

    if (pendingBundles.length === 0) {
      return { success: true, syncedCount: 0, message: 'Queue is empty. No pending bundles.' };
    }

    if (!isOnline) {
      return {
        success: false,
        syncedCount: 0,
        message: 'Device is offline. Bundles are safely encrypted in local IndexedDB.',
      };
    }

    setStore({ isSyncing: true });

    try {
      // Build the payload for the backend
      const payload = pendingBundles.map((b) => ({
        bundle_id: b.bundleId,
        officer_id: b.officerId,
        part_no: b.metadata?.partNo ?? '',
        encrypted_payload: b.encryptedData,
        created_at: b.timestamp,
      }));

      const response = await uploadSyncBundles(payload);
      const count = response.received;

      const newHistoryItem: SyncedBatchRecord = {
        batchId: 'BATCH-' + Date.now().toString(36).toUpperCase(),
        count,
        syncedAt: new Date().toISOString(),
        status: 'SUCCESS',
        responseRef: `SIR-UPLINK-${response.message.slice(0, 20)}`,
      };

      const existingHistory = getStore().syncHistory;
      const updatedHistory = [newHistoryItem, ...existingHistory];

      setStore({
        pendingBundles: [],
        syncHistory: updatedHistory,
        isSyncing: false,
        lastSyncTimestamp: new Date().toISOString(),
      });

      await set(SYNC_BUNDLES_STORAGE_KEY, []);
      await set(SYNC_HISTORY_STORAGE_KEY, updatedHistory);

      return {
        success: true,
        syncedCount: count,
        message: `Successfully uploaded ${count} encrypted bundle(s) to the SIR-Assist backend.`,
      };
    } catch (err: any) {
      const failedHistory: SyncedBatchRecord = {
        batchId: 'BATCH-' + Date.now().toString(36).toUpperCase(),
        count: pendingBundles.length,
        syncedAt: new Date().toISOString(),
        status: 'FAILED',
        responseRef: 'UPLINK_ERROR',
      };
      const updatedHistory = [failedHistory, ...getStore().syncHistory];
      setStore({ isSyncing: false, syncHistory: updatedHistory });
      await set(SYNC_HISTORY_STORAGE_KEY, updatedHistory);
      return {
        success: false,
        syncedCount: 0,
        message: err?.message || 'Uplink transmission failure. Bundles remain queued.',
      };
    }
  },
}));

