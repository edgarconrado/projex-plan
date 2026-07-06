import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@projex:offline_files';
const CACHE_DIR = `${FileSystem.documentDirectory}offline_cache/`;

export interface CachedFile {
  id: string;           // plan.id o document.id
  localPath: string;    // ruta local en el dispositivo
  remoteUrl: string;    // URL original de Supabase
  fileName: string;
  fileType: string;
  cachedAt: string;
  size?: number;
}

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
}

async function loadCache(): Promise<Record<string, CachedFile>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveCache(cache: Record<string, CachedFile>) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function useOfflineFiles() {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  // Cargar IDs cacheados al inicio
  const loadCachedIds = useCallback(async () => {
    const cache = await loadCache();
    // Verificar que los archivos aún existen localmente
    const validIds = new Set<string>();
    for (const [id, file] of Object.entries(cache)) {
      const info = await FileSystem.getInfoAsync(file.localPath);
      if (info.exists) validIds.add(id);
    }
    setCachedIds(validIds);
  }, []);

  const isCached = useCallback((id: string) => cachedIds.has(id), [cachedIds]);

  const downloadFile = useCallback(async (
    id: string,
    remoteUrl: string,
    fileName: string,
    fileType: string,
  ): Promise<string | null> => {
    if (downloading[id]) return null;
    setDownloading(prev => ({ ...prev, [id]: true }));
    setProgress(prev => ({ ...prev, [id]: 0 }));

    try {
      await ensureCacheDir();
      const ext = fileName.split('.').pop() ?? (fileType.includes('pdf') ? 'pdf' : 'jpg');
      const localPath = `${CACHE_DIR}${id}.${ext}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        remoteUrl,
        localPath,
        {},
        (downloadProgress) => {
          const pct = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          );
          setProgress(prev => ({ ...prev, [id]: pct }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) throw new Error('Descarga fallida');

      // Guardar en caché
      const cache = await loadCache();
      const info = await FileSystem.getInfoAsync(localPath);
      cache[id] = {
        id, localPath, remoteUrl, fileName, fileType,
        cachedAt: new Date().toISOString(),
        size: (info as any).size,
      };
      await saveCache(cache);
      setCachedIds(prev => new Set([...prev, id]));
      return localPath;
    } catch (e) {
      console.error('[OfflineFiles] Error descargando:', e);
      return null;
    } finally {
      setDownloading(prev => ({ ...prev, [id]: false }));
      setProgress(prev => ({ ...prev, [id]: 0 }));
    }
  }, [downloading]);

  const getLocalPath = useCallback(async (id: string): Promise<string | null> => {
    const cache = await loadCache();
    const file = cache[id];
    if (!file) return null;
    const info = await FileSystem.getInfoAsync(file.localPath);
    return info.exists ? file.localPath : null;
  }, []);

  const removeFile = useCallback(async (id: string) => {
    const cache = await loadCache();
    const file = cache[id];
    if (file) {
      try { await FileSystem.deleteAsync(file.localPath, { idempotent: true }); } catch {}
      delete cache[id];
      await saveCache(cache);
    }
    setCachedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const getCacheSize = useCallback(async (): Promise<number> => {
    const cache = await loadCache();
    return Object.values(cache).reduce((sum, f) => sum + (f.size ?? 0), 0);
  }, []);

  const clearAllCache = useCallback(async () => {
    try { await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true }); } catch {}
    await AsyncStorage.removeItem(CACHE_KEY);
    setCachedIds(new Set());
  }, []);

  return {
    downloading, progress, cachedIds, isCached,
    loadCachedIds, downloadFile, getLocalPath,
    removeFile, getCacheSize, clearAllCache,
  };
}
