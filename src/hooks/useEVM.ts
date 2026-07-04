import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface EVMWeek {
  id: string;
  project_id: string;
  week_number: number;
  week_date: string;
  pv: number;
  ev: number;
  ac: number;
}

export function useEVM(projectId?: string) {
  const [weeks, setWeeks] = useState<EVMWeek[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeeks = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('evm_weekly')
        .select('*')
        .eq('project_id', projectId)
        .order('week_number');
      if (error) throw error;
      setWeeks((data ?? []) as EVMWeek[]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWeeks();
  }, [fetchWeeks]);

  const upsertWeek = async (data: { week_number: number; week_date: string; pv: number; ev: number; ac: number }) => {
    if (!projectId) return;
    const { data: result, error } = await supabase
      .from('evm_weekly')
      .upsert({ ...data, project_id: projectId }, { onConflict: 'project_id,week_number' })
      .select().single();
    if (error) throw error;
    setWeeks(prev => {
      const exists = prev.find(w => w.week_number === data.week_number);
      if (exists) return prev.map(w => w.week_number === data.week_number ? result as EVMWeek : w);
      return [...prev, result as EVMWeek].sort((a, b) => a.week_number - b.week_number);
    });
  };

  const deleteWeek = async (id: string) => {
    setWeeks(prev => prev.filter(w => w.id !== id));
    await supabase.from('evm_weekly').delete().eq('id', id);
  };

  // Calcular métricas de la última semana
  const lastWeek = weeks[weeks.length - 1];
  const cpi = lastWeek && lastWeek.ac > 0 ? lastWeek.ev / lastWeek.ac : null;
  const spi = lastWeek && lastWeek.pv > 0 ? lastWeek.ev / lastWeek.pv : null;

  return { weeks, isLoading, fetchWeeks, upsertWeek, deleteWeek, cpi, spi, lastWeek };
}
