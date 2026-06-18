import { useState, useCallback } from 'react';
import { supabase, uploadFile, generateFileName, STORAGE_BUCKETS } from '../lib/supabase';
import { Plan, PlanAnnotation, CreateAnnotationDTO } from '../types';
import { useAuth } from '../lib/AuthContext';

export function usePlans(projectId: string) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchPlans = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`*, uploader:profiles(id, full_name), annotations:plan_annotations(*)`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPlans((data ?? []) as Plan[]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const uploadPlan = async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    meta: { code: string; title: string; discipline: string; level: string; revision: string; scale?: string }
  ): Promise<Plan> => {
    if (!user) throw new Error('No hay sesión');
    setUploadProgress(0);
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileType = (['pdf', 'png', 'jpg'].includes(ext) ? ext : 'jpg') as 'pdf' | 'png' | 'jpg';
    const storagePath = `${projectId}/${generateFileName(fileName, meta.code)}`;

    setUploadProgress(30);
    const fileUrl = await uploadFile(STORAGE_BUCKETS.PLANS, storagePath, fileUri, mimeType);
    setUploadProgress(80);

    const { data, error } = await supabase
      .from('plans')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        mime_type: mimeType,
        ...meta,
        status: 'Vigente',
      })
      .select(`*, uploader:profiles(id, full_name), annotations:plan_annotations(*)`)
      .single();

    if (error) throw error;
    setUploadProgress(100);
    const plan = data as Plan;
    setPlans((prev) => [plan, ...prev]);
    return plan;
  };

  const deletePlan = async (planId: string): Promise<void> => {
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (error) throw error;
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  const addAnnotation = async (dto: CreateAnnotationDTO): Promise<PlanAnnotation> => {
    if (!user) throw new Error('No hay sesión');
    const { data, error } = await supabase
      .from('plan_annotations')
      .insert({ ...dto, created_by: user.id })
      .select()
      .single();
    if (error) throw error;
    const annotation = data as PlanAnnotation;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === dto.plan_id
          ? { ...p, annotations: [...(p.annotations ?? []), annotation] }
          : p
      )
    );
    return annotation;
  };

  const deleteAnnotation = async (annotationId: string, planId: string): Promise<void> => {
    const { error } = await supabase.from('plan_annotations').delete().eq('id', annotationId);
    if (error) throw error;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, annotations: (p.annotations ?? []).filter((a) => a.id !== annotationId) }
          : p
      )
    );
  };

  return {
    plans, isLoading, uploadProgress,
    fetchPlans, uploadPlan, deletePlan,
    addAnnotation, deleteAnnotation,
  };
}
