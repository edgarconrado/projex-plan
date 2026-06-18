import { useState, useCallback } from 'react';
import { supabase, uploadFile, generateFileName, STORAGE_BUCKETS } from '../lib/supabase';
import { Document } from '../types';
import { useAuth } from '../lib/AuthContext';

export function useDocuments(projectId: string) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`*, uploader:profiles(id, full_name, avatar_url)`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments((data ?? []) as Document[]);
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
