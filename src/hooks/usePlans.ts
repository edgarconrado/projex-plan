import { useState, useCallback } from 'react';
import { supabase, uploadFile, generateFileName, STORAGE_BUCKETS } from '../lib/supabase';
import { Plan, PlanAnnotation, CreateAnnotationDTO } from '../types';
import { useAuth } from '../lib/AuthContext';

// Incrementa un código de revisión tipo letra (A→B→C...) o número (R0→R1→R2...).
// Si no reconoce el patrón, simplemente le agrega un sufijo.
function nextRevisionCode(current: string): string {
  const trimmed = current.trim();

  // Patrón "Rev. N" o "Rev N" (con o sin punto/espacio), ej. "Rev. 1", "Rev 2"
  const revMatch = trimmed.match(/^(Rev\.?\s*)(\d+)$/i);
  if (revMatch) {
    const n = parseInt(revMatch[2], 10) + 1;
    return `${revMatch[1]}${n}`;
  }

  // Patrón "R" + número, ej. R0, R1, R12
  const rMatch = trimmed.match(/^([Rr])(\d+)$/);
  if (rMatch) {
    const n = parseInt(rMatch[2], 10) + 1;
    return `${rMatch[1]}${n}`;
  }

  // Patrón letra única, ej. A, B, ... Z, luego AA, AB...
  if (/^[A-Za-z]$/.test(trimmed)) {
    const code = trimmed.toUpperCase().charCodeAt(0);
    return code === 90 ? 'AA' : String.fromCharCode(code + 1);
  }

  // Patrón numérico simple, ej. 1, 2, 3
  if (/^\d+$/.test(trimmed)) {
    return String(parseInt(trimmed, 10) + 1);
  }

  return `${trimmed}-rev2`;
}

export function usePlans(projectId: string) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Solo trae las revisiones VIGENTES (is_current_revision = true) — el
  // historial de versiones anteriores se consulta aparte con fetchRevisionHistory.
  const fetchPlans = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`*, uploader:profiles(id, full_name), annotations:plan_annotations(*)`)
        .eq('project_id', projectId)
        .eq('is_current_revision', true)
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
        is_current_revision: true,
      })
      .select(`*, uploader:profiles(id, full_name), annotations:plan_annotations(*)`)
      .single();

    if (error) throw error;
    setUploadProgress(100);
    const plan = data as Plan;
    // plan_group_id apunta a sí mismo en la primera subida — así todas las
    // revisiones futuras de este plano se agrupan bajo este mismo ID.
    await supabase.from('plans').update({ plan_group_id: plan.id }).eq('id', plan.id);
    plan.plan_group_id = plan.id;
    setPlans((prev) => [plan, ...prev]);
    return plan;
  };

  // Sube un archivo nuevo como siguiente revisión del plano dado.
  // El plano actual se marca is_current_revision=false (pasa al historial,
  // con sus anotaciones intactas) y el nuevo registro queda como vigente,
  // empezando sin anotaciones.
  const uploadRevision = async (
    previousPlan: Plan,
    fileUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<Plan> => {
    if (!user) throw new Error('No hay sesión');
    console.log('[uploadRevision] previousPlan.id:', previousPlan.id, '| user.id:', user.id);
    setUploadProgress(0);
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileType = (['pdf', 'png', 'jpg'].includes(ext) ? ext : 'jpg') as 'pdf' | 'png' | 'jpg';
    const newRevisionCode = nextRevisionCode(previousPlan.revision);
    const storagePath = `${projectId}/${generateFileName(fileName, previousPlan.code)}`;

    setUploadProgress(20);
    const fileUrl = await uploadFile(STORAGE_BUCKETS.PLANS, storagePath, fileUri, mimeType);
    setUploadProgress(70);

    // Marcar la versión anterior como histórica (no vigente)
    const { data: archiveData, error: archiveError, count: archiveCount } = await supabase
      .from('plans')
      .update({ is_current_revision: false, status: 'Obsoleto' })
      .eq('id', previousPlan.id)
      .select();
    console.log('[uploadRevision] archive UPDATE result:', JSON.stringify(archiveData), '| error:', JSON.stringify(archiveError));
    if (archiveError) throw archiveError;
    if (!archiveData || archiveData.length === 0) {
      console.warn('[uploadRevision] ADVERTENCIA: el UPDATE no afectó ninguna fila — posible bloqueo de RLS silencioso');
    }

    // Crear el registro de la nueva revisión, agrupado con el mismo plan_group_id
    const { data, error } = await supabase
      .from('plans')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        mime_type: mimeType,
        code: previousPlan.code,
        title: previousPlan.title,
        discipline: previousPlan.discipline,
        level: previousPlan.level,
        scale: previousPlan.scale,
        revision: newRevisionCode,
        status: 'Vigente',
        is_current_revision: true,
        plan_group_id: previousPlan.plan_group_id ?? previousPlan.id,
      })
      .select(`*, uploader:profiles(id, full_name), annotations:plan_annotations(*)`)
      .single();

    if (error) throw error;
    setUploadProgress(100);
    const newPlan = data as Plan;

    // Reemplazar en la lista local: el plano anterior sale de "vigentes",
    // el nuevo entra en su lugar.
    setPlans((prev) => prev.map((p) => (p.id === previousPlan.id ? newPlan : p)));
    return newPlan;
  };

  // Trae todo el historial de revisiones de un plano (incluyendo la vigente),
  // ordenado de más reciente a más antigua.
  const fetchRevisionHistory = async (planGroupId: string): Promise<Plan[]> => {
    const { data, error } = await supabase
      .from('plans')
      .select(`*, uploader:profiles(id, full_name), annotations:plan_annotations(*)`)
      .eq('plan_group_id', planGroupId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Plan[];
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

  const updateScale = async (planId: string, scale: string): Promise<void> => {
    const { error } = await supabase
      .from('plans')
      .update({ scale })
      .eq('id', planId);
    if (error) throw error;
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, scale } : p))
    );
  };

  return {
    plans, isLoading, uploadProgress,
    fetchPlans, uploadPlan, deletePlan,
    addAnnotation, deleteAnnotation, updateScale,
    uploadRevision, fetchRevisionHistory,
  };
}
