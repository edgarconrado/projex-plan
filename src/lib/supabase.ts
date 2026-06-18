import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const STORAGE_BUCKETS = {
  PLANS: 'plans',
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  AVATARS: 'photos', // usamos el mismo bucket de photos para avatares
} as const;

export async function uploadFile(
  bucket: string,
  path: string,
  fileUri: string,
  mimeType: string,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Genera una URL firmada temporal para buckets privados.
 * Útil cuando el bucket no está marcado como público.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Extrae el path relativo de un archivo a partir de su URL pública,
 * para poder regenerar una URL firmada si el bucket es privado.
 */
export function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export function generateFileName(originalName: string, prefix?: string): string {
  const ext = originalName.split('.').pop() ?? 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 7);
  return prefix ? `${prefix}_${timestamp}_${random}.${ext}` : `${timestamp}_${random}.${ext}`;
}
