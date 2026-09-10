import { useEffect, useCallback, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import {
  getPendingToggles, clearPendingToggles, removePendingToggle,
  PendingToggle,
} from './useOfflineCache';
import { supabase } from '../lib/supabase';

interface UseOfflineSyncProps {
  onSyncComplete?: (synced: number) => void;
}

export function useOfflineSync({ onSyncComplete }: UseOfflineSyncProps = {}) {
  const { isOnline, wasOffline, clearWasOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Actualizar contador de pendientes
  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingToggles();
    setPendingCount(pending.length);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Sincronizar cuando vuelve la conexión
  const syncPendingToggles = useCallback(async () => {
    const pending = await getPendingToggles();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let synced = 0;

    for (const toggle of pending) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            status: toggle.newStatus,
            completed_at: toggle.completedAt,
          })
          .eq('id', toggle.taskId);

        if (!error) {
          await removePendingToggle(toggle.taskId);
          synced++;
        } else {
          console.warn('[OfflineSync] Error sincronizando tarea:', toggle.taskId, error);
        }
      } catch (e) {
        console.warn('[OfflineSync] Error en toggle:', e);
      }
    }

    await refreshPendingCount();
    setIsSyncing(false);

    if (synced > 0) {
      console.log(`[OfflineSync] ${synced} tarea(s) sincronizada(s)`);
      onSyncComplete?.(synced);
    }
  }, [refreshPendingCount, onSyncComplete]);

  // Auto-sincronizar al reconectar
  useEffect(() => {
    if (wasOffline && isOnline) {
      clearWasOffline();
      syncPendingToggles();
    }
  }, [wasOffline, isOnline, clearWasOffline, syncPendingToggles]);

  return { isOnline, pendingCount, isSyncing, refreshPendingCount, syncPendingToggles };
}
