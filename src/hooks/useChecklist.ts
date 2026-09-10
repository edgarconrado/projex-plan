import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface ChecklistItem {
  id: string;
  task_id: string;
  item: string;
  is_completed: boolean;
  order_index: number;
}

export interface ChecklistTemplate {
  id: string;
  project_id: string;
  name: string;
  items: { text: string; position: number }[];
  created_at: string;
}

export function useChecklist(taskId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const completedCount = items.filter((i) => i.is_completed).length;
  const totalCount = items.length;

  const fetchItems = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('task_checklist')
        .select('*')
        .eq('task_id', taskId)
        .order('order_index');
      setItems((data ?? []) as ChecklistItem[]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    fetchItems();

    const channel = supabase
      .channel(`checklist:${taskId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'task_checklist', filter: `task_id=eq.${taskId}` },
        () => fetchItems()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [taskId, fetchItems]);

  const addItem = async (text: string) => {
    if (!taskId || !text.trim()) return;
    const position = items.length;
    console.log('[Checklist] addItem:', { taskId, item: text.trim(), order_index: position });
    const { data, error } = await supabase
      .from('task_checklist')
      .insert({ task_id: taskId, item: text.trim(), is_completed: false, order_index: position })
      .select()
      .single();
    console.log('[Checklist] addItem result:', { data, error: JSON.stringify(error) });
    if (!error && data) setItems((prev) => [...prev, data as ChecklistItem]);
  };

  const toggleItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newVal = !item.is_completed;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_completed: newVal } : i));
    await supabase.from('task_checklist').update({ is_completed: newVal }).eq('id', id);
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('task_checklist').delete().eq('id', id);
  };

  const updateItemText = async (id: string, text: string) => {
    if (!text.trim()) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, item: text.trim() } : i));
    await supabase.from('task_checklist').update({ item: text.trim() }).eq('id', id);
  };

  // Aplica una plantilla: inserta todos sus items en la tarea actual
  const applyTemplate = async (template: ChecklistTemplate) => {
    if (!taskId) return;
    const newItems = template.items.map((tmplItem, idx) => ({
      task_id: taskId,
      item: tmplItem.text,
      is_completed: false,
      order_index: items.length + idx,
    }));
    const { data } = await supabase.from('task_checklist').insert(newItems).select();
    if (data) setItems((prev) => [...prev, ...(data as ChecklistItem[])]);
  };

  return { items, isLoading, completedCount, totalCount, fetchItems, addItem, toggleItem, deleteItem, updateItemText, applyTemplate };
}

export function useChecklistTemplates(projectId?: string) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  const fetchTemplates = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');
    setTemplates((data ?? []) as ChecklistTemplate[]);
  }, [projectId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const saveTemplate = async (name: string, items: { text: string }[]) => {
    if (!projectId || !user || !name.trim() || items.length === 0) return null;
    const { data } = await supabase
      .from('checklist_templates')
      .insert({
        project_id: projectId,
        created_by: user.id,
        name: name.trim(),
        items: items.map((item, idx) => ({ text: item.text, position: idx })),
      })
      .select()
      .single();
    if (data) {
      setTemplates((prev) => [...prev, data as ChecklistTemplate]);
      return data as ChecklistTemplate;
    }
    return null;
  };

  const deleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('checklist_templates').delete().eq('id', id);
  };

  return { templates, fetchTemplates, saveTemplate, deleteTemplate };
}
