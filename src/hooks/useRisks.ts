import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export type RiskStatus = 'Abierto' | 'Cerrado' | 'Presente';
export type RiskLevel = 'A' | 'M' | 'B';

export interface ProjectRisk {
  id: string;
  project_id: string;
  created_by?: string;
  name: string;
  responsible: string | null;
  identified_at: string;
  status: RiskStatus;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation: string | null;
  created_at: string;
}

// Calcula puntaje numérico (A=3, M=2, B=1)
export const levelScore = (l: RiskLevel) => l === 'A' ? 3 : l === 'M' ? 2 : 1;

// Calcula NPR y clasificación cualitativa
export const calcRisk = (prob: RiskLevel, impact: RiskLevel) => {
  const score = levelScore(prob) * levelScore(impact);
  const qual = score >= 9 ? 'MA' : score >= 6 ? 'A' : score >= 4 ? 'M' : score >= 2 ? 'B' : 'MB';
  return { score, qual };
};

export function useRisks(projectId?: string) {
  const { user } = useAuth();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRisks = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_risks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw error;
      setRisks((data ?? []) as ProjectRisk[]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchRisks();
    const channel = supabase
      .channel(`risks:${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'project_risks', filter: `project_id=eq.${projectId}` },
        () => fetchRisks()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchRisks]);

  const addRisk = async (data: Omit<ProjectRisk, 'id' | 'project_id' | 'created_by' | 'created_at'>) => {
    if (!projectId || !user) return;
    const { data: newRisk, error } = await supabase
      .from('project_risks')
      .insert({ ...data, project_id: projectId, created_by: user.id })
      .select().single();
    if (error) throw error;
    setRisks(prev => [...prev, newRisk as ProjectRisk]);
    return newRisk as ProjectRisk;
  };

  const updateRisk = async (id: string, data: Partial<ProjectRisk>) => {
    const { data: updated, error } = await supabase
      .from('project_risks')
      .update(data).eq('id', id).select().single();
    if (error) throw error;
    setRisks(prev => prev.map(r => r.id === id ? updated as ProjectRisk : r));
  };

  const deleteRisk = async (id: string) => {
    setRisks(prev => prev.filter(r => r.id !== id));
    await supabase.from('project_risks').delete().eq('id', id);
  };

  return { risks, isLoading, fetchRisks, addRisk, updateRisk, deleteRisk };
}
