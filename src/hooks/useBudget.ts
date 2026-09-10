import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface BudgetCategory {
  id: string;
  project_id: string;
  name: string;
  budgeted: number;
  spent: number;
  created_at: string;
}

export function useBudget(projectId?: string) {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const totalBudgeted = categories.reduce((s, c) => s + c.budgeted, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const remaining = totalBudgeted - totalSpent;
  const pct = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  const fetchCategories = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw error;
      setCategories((data ?? []) as BudgetCategory[]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchCategories();
    const channel = supabase
      .channel(`budget:${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'budget_categories', filter: `project_id=eq.${projectId}` },
        () => fetchCategories()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchCategories]);

  const addCategory = async (name: string, budgeted: number, spent: number = 0) => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from('budget_categories')
      .insert({ project_id: projectId, name: name.trim(), budgeted, spent })
      .select().single();
    if (error) throw error;
    setCategories(prev => [...prev, data as BudgetCategory]);
  };

  const updateCategory = async (id: string, updates: { name?: string; budgeted?: number; spent?: number }) => {
    const { data, error } = await supabase
      .from('budget_categories')
      .update(updates)
      .eq('id', id)
      .select().single();
    if (error) throw error;
    setCategories(prev => prev.map(c => c.id === id ? data as BudgetCategory : c));
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    await supabase.from('budget_categories').delete().eq('id', id);
  };

  return {
    categories, isLoading, totalBudgeted, totalSpent, remaining, pct,
    fetchCategories, addCategory, updateCategory, deleteCategory,
  };
}
