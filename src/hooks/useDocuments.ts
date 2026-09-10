import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, uploadFile, generateFileName, STORAGE_BUCKETS } from '../lib/supabase';
import { Document } from '../types';
import { useAuth } from '../lib/AuthContext';
import { notifyUsers, saveNotification } from '../lib/notifications';

async function getOtherProjectMemberIds(projectId: string, excludeUserId: string): Promise<string[]> {
  const { data } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);
  return (data ?? [])
    .map((m: any) => m.user_id)
    .filter((id: string) => id !== excludeUserId);
}

export function useDocuments(projectId: string) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    const CACHE_KEY = `@projex:documents:${projectId}`;
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`*, uploader:profiles(id, full_name, avatar_url)`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const docs = (data ?? []) as Document[];
      setDocuments(docs);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(docs));
    } catch {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) setDocuments(JSON.parse(cached) as Document[]);
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const uploadDocument = async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    meta: { description?: string; documentType?: string; tags?: string[] }
  ): Promise<Document> => {
    if (!user) throw new Error('No hay sesión');
    setUploadProgress(10);

    const storagePath = `${projectId}/${generateFileName(fileName)}`;
    setUploadProgress(40);

    const fileUrl = await uploadFile(STORAGE_BUCKETS.DOCUMENTS, storagePath, fileUri, mimeType);
    setUploadProgress(80);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        document_type: meta.documentType ?? null,
        description: meta.description ?? null,
        tags: meta.tags ?? [],
        version: 1,
      })
      .select(`*, uploader:profiles(id, full_name, avatar_url)`)
      .single();

    if (error) throw error;
    setUploadProgress(100);
    const doc = data as Document;
    setDocuments((prev) => [doc, ...prev]);

    const memberIds = await getOtherProjectMemberIds(projectId, user.id);
    if (memberIds.length > 0) {
      const title = '📄 Nuevo documento';
      const body = fileName;
      await notifyUsers(memberIds, title, body, { resource_type: 'document', resource_id: projectId });
      for (const uid of memberIds) {
        await saveNotification({
          userId: uid, type: 'document_uploaded', title, description: body,
          resourceType: 'document', resourceId: projectId, createdBy: user.id,
        });
      }
    }

    return doc;
  };

  const deleteDocument = async (docId: string): Promise<void> => {
    const { error } = await supabase.from('documents').delete().eq('id', docId);
    if (error) throw error;
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  return {
    documents, isLoading, uploadProgress,
    fetchDocuments, uploadDocument, deleteDocument,
  };
}
