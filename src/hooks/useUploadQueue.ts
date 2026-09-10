/**
 * useUploadQueue — cola de subidas pendientes para modo offline
 * 
 * Flujo:
 * 1. Usuario crea plano/documento sin internet → se encola localmente
 * 2. Al reconectar → processQueue() sube todo automáticamente
 * 3. UI muestra estado: pending | uploading | done | error
 */
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useNetworkStatus } from './useNetworkStatus';

const QUEUE_KEY = '@projex:upload_queue';
const LOCAL_DIR = `${FileSystem.documentDirectory}pending_uploads/`;

export type QueueItemStatus = 'pending' | 'uploading' | 'done' | 'error';
export type QueueItemType = 'plan' | 'document';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  projectId: string;
  localPath: string;       // Copia local del archivo
  fileName: string;
  mimeType: string;
  meta: Record<string, string>; // code, title, discipline, etc.
  status: QueueItemStatus;
  errorMsg?: string;
  createdAt: string;
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(LOCAL_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(LOCAL_DIR, { intermediates: true });
}

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveQueue(queue: QueueItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useUploadQueue(
  onUploadPlan?: (localPath: string, fileName: string, mimeType: string, meta: any) => Promise<void>,
  onUploadDocument?: (localPath: string, fileName: string, mimeType: string, meta: any) => Promise<void>,
) {
  const { isOnline } = useNetworkStatus();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAndSetQueue = useCallback(async () => {
    const q = await loadQueue();
    setQueue(q.filter(i => i.status !== 'done'));
  }, []);

  useEffect(() => { loadAndSetQueue(); }, [loadAndSetQueue]);

  // Procesar automáticamente al reconectar
  useEffect(() => {
    if (isOnline) processQueue();
  }, [isOnline]);

  const enqueue = useCallback(async (
    type: QueueItemType,
    projectId: string,
    sourceUri: string,
    fileName: string,
    mimeType: string,
    meta: Record<string, string>,
  ): Promise<string> => {
    await ensureDir();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ext = fileName.split('.').pop() ?? 'jpg';
    const localPath = `${LOCAL_DIR}${id}.${ext}`;

    // Copiar el archivo al directorio de pendientes
    await FileSystem.copyAsync({ from: sourceUri, to: localPath });

    const item: QueueItem = {
      id, type, projectId, localPath, fileName, mimeType, meta,
      status: 'pending', createdAt: new Date().toISOString(),
    };

    const q = await loadQueue();
    q.push(item);
    await saveQueue(q);
    setQueue(prev => [...prev.filter(i => i.status !== 'done'), item]);
    return id;
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    const q = await loadQueue();
    const pending = q.filter(i => i.status === 'pending');
    if (pending.length === 0) return;

    setIsProcessing(true);
    for (const item of pending) {
      // Marcar como uploading
      const updatedQ = await loadQueue();
      const idx = updatedQ.findIndex(i => i.id === item.id);
      if (idx < 0) continue;
      updatedQ[idx].status = 'uploading';
      await saveQueue(updatedQ);
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

      try {
        if (item.type === 'plan' && onUploadPlan) {
          await onUploadPlan(item.localPath, item.fileName, item.mimeType, item.meta);
        } else if (item.type === 'document' && onUploadDocument) {
          await onUploadDocument(item.localPath, item.fileName, item.mimeType, item.meta);
        }
        // Marcar como done y limpiar archivo local
        const doneQ = await loadQueue();
        const doneIdx = doneQ.findIndex(i => i.id === item.id);
        if (doneIdx >= 0) { doneQ[doneIdx].status = 'done'; await saveQueue(doneQ); }
        try { await FileSystem.deleteAsync(item.localPath, { idempotent: true }); } catch {}
        setQueue(prev => prev.filter(i => i.id !== item.id));
      } catch (e: any) {
        const errQ = await loadQueue();
        const errIdx = errQ.findIndex(i => i.id === item.id);
        if (errIdx >= 0) {
          errQ[errIdx].status = 'error';
          errQ[errIdx].errorMsg = e?.message ?? 'Error desconocido';
          await saveQueue(errQ);
        }
        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: e?.message } : i));
      }
    }
    setIsProcessing(false);
  }, [isProcessing, onUploadPlan, onUploadDocument]);

  const retryItem = useCallback(async (id: string) => {
    const q = await loadQueue();
    const idx = q.findIndex(i => i.id === id);
    if (idx >= 0) { q[idx].status = 'pending'; await saveQueue(q); }
    setQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'pending' } : i));
    processQueue();
  }, [processQueue]);

  const removeItem = useCallback(async (id: string) => {
    const q = await loadQueue();
    const item = q.find(i => i.id === id);
    if (item) {
      try { await FileSystem.deleteAsync(item.localPath, { idempotent: true }); } catch {}
    }
    const newQ = q.filter(i => i.id !== id);
    await saveQueue(newQ);
    setQueue(prev => prev.filter(i => i.id !== id));
  }, []);

  const pendingCount = queue.filter(i => i.status === 'pending' || i.status === 'uploading').length;

  return { queue, pendingCount, isProcessing, enqueue, processQueue, retryItem, removeItem };
}
