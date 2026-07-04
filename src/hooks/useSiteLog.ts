import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface SiteLogEntry {
  id: string;
  project_id: string;
  created_by: string;
  activity: string;
  observations: string | null;
  visited_at: string;
  created_at: string;
  creator?: { id: string; full_name: string; avatar_url?: string | null };
}

export function useSiteLog(projectId?: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SiteLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_log')
        .select('*, creator:profiles(id, full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('visited_at', { ascending: false });
      if (error) throw error;
      setEntries((data ?? []) as SiteLogEntry[]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchEntries();

    const channel = supabase
      .channel(`site_log:${projectId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'site_log', filter: `project_id=eq.${projectId}` },
        (payload) => setEntries((prev) => [payload.new as SiteLogEntry, ...prev])
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'site_log', filter: `project_id=eq.${projectId}` },
        (payload) => setEntries((prev) => prev.filter((e) => e.id !== (payload.old as any).id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchEntries]);

  const addEntry = async (data: { activity: string; observations?: string; visited_at: string }) => {
    if (!user || !projectId) return;
    const { data: newEntry, error } = await supabase
      .from('site_log')
      .insert({
        project_id: projectId,
        created_by: user.id,
        activity: data.activity.trim(),
        observations: data.observations?.trim() || null,
        visited_at: data.visited_at,
      })
      .select('*, creator:profiles(id, full_name, avatar_url)')
      .single();
    if (error) throw error;
    return newEntry as SiteLogEntry;
  };

  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('site_log').delete().eq('id', id);
  };

  const updateEntry = async (id: string, data: { activity: string; observations?: string; visited_at: string }) => {
    const { data: updated, error } = await supabase
      .from('site_log')
      .update({
        activity: data.activity.trim(),
        observations: data.observations?.trim() || null,
        visited_at: data.visited_at,
      })
      .eq('id', id)
      .select('*, creator:profiles(id, full_name, avatar_url)')
      .single();
    if (error) throw error;
    setEntries((prev) => prev.map((e) => e.id === id ? updated as SiteLogEntry : e));
  };

  return { entries, isLoading, fetchEntries, addEntry, deleteEntry, updateEntry };
}
