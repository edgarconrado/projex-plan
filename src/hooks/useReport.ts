import { useState } from 'react';
import { Alert } from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { generateReportHTML } from '../lib/reportGenerator';
import { Project, Task, Plan, Document, PlanAnnotation } from '../types';

export function useReport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async (project: Project, tasks: Task[]) => {
    setIsGenerating(true);
    try {
      const [{ printToFileAsync }, { shareAsync }, FileSystem] = await Promise.all([
        import('expo-print'),
        import('expo-sharing'),
        import('expo-file-system/legacy'),
      ]);

      // Timeout de 30s — si expo-print se cuelga (típicamente por imágenes
      // externas que no cargan), cancelamos en vez de quedarnos bloqueados.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado generando el PDF')), 30000)
      );

      const { data: plansData } = await supabase
        .from('plans')
        .select('*, uploader:profiles(id, full_name)')
        .eq('project_id', project.id)
        .eq('is_current_revision', true)
        .order('created_at', { ascending: false });

      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      // Solo contamos las fotos de evidencia — no las incrustamos en el HTML
      // para evitar que expo-print se cuelgue esperando URLs externas.
      const { data: annotationsData } = await supabase
        .from('plan_annotations')
        .select('id, type, attachment_type, attachment_thumbnail, label')
        .eq('project_id', project.id)
        .eq('type', 'reference')
        .not('attachment_thumbnail', 'is', null);

      const html = generateReportHTML({
        project,
        tasks: tasks.filter(t => t.project_id === project.id),
        plans: (plansData ?? []) as Plan[],
        documents: (docsData ?? []) as Document[],
        annotations: (annotationsData ?? []) as PlanAnnotation[],
      });

      const { uri: tempUri } = await Promise.race([
        printToFileAsync({ html, base64: false }),
        timeoutPromise,
      ]);

      // Renombrar el archivo temporal con un nombre profesional
      const projectSlug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 30);
      const dateStr = format(new Date(), 'yyyyMMdd');
      const finalName = `ReporteAvance_${projectSlug}_${dateStr}.pdf`;
      const finalUri = `${FileSystem.cacheDirectory}${finalName}`;
      await FileSystem.moveAsync({ from: tempUri, to: finalUri });

      await shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Compartir reporte · ${project.name}`,
        UTI: 'com.adobe.pdf',
      });

    } catch (e: unknown) {
      console.log('[useReport] Error:', e);
      const msg = e instanceof Error ? e.message : 'No se pudo generar el reporte.';
      Alert.alert('Error', msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateReport, isGenerating };
}
