import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../types';
import { useTaskStore } from '../stores';
import { useAuth } from '../lib/AuthContext';
import { notifyUsers, saveNotification } from '../lib/notifications';

export function useTasks(projectId?: string) {
  const { user } = useAuth();
  const { tasksByProject, setTasks, upsertTask, removeTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasks = projectId ? (tasksByProject[projectId] ?? []) : Object.values(tasksByProject).flat();

  const fetchTasks = useCallback(async (pid?: string) => {
    if (!user) return;
    const targetId = pid ?? projectId;
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, role),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
          checklist:task_checklist(*),
          project:projects(id, name)
        `)
        .order('created_at', { ascending: false });

      if (targetId) {
        query = query.eq('project_id', targetId);
      } else {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (targetId) {
        setTasks(targetId, (data ?? []) as Task[]);
      } else {
        const grouped: Record<string, Task[]> = {};
        for (const task of (data ?? []) as Task[]) {
          if (!grouped[task.project_id]) grouped[task.project_id] = [];
          grouped[task.project_id].push(task);
        }
        for (const [pid, tasks] of Object.entries(grouped)) {
          setTasks(pid, tasks);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar tareas');
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId, setTasks]);

  const createTask = async (dto: CreateTaskDTO): Promise<Task> => {
    if (!user) throw new Error('No hay sesión activa');
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...dto, created_by: user.id })
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, role),
        checklist:task_checklist(*),
        project:projects(id, name)
      `)
      .single();
    if (error) throw error;
    const task = data as Task;
    upsertTask(task);

    if (dto.assigned_to && dto.assigned_to !== user.id) {
      const title = '📋 Nueva tarea asignada';
      const body = `${dto.title}`;
      await notifyUsers([dto.assigned_to], title, body, { resource_type: 'task', resource_id: task.id });
      await saveNotification({
        userId: dto.assigned_to, type: 'task_assigned', title, description: body,
        resourceType: 'task', resourceId: task.id, createdBy: user.id,
      });
    }
    return task;
  };

  const updateTask = async (id: string, dto: Partial<UpdateTaskDTO>): Promise<Task> => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, role),
        checklist:task_checklist(*),
        project:projects(id, name)
      `)
      .single();
    if (error) throw error;
    const task = data as Task;
    upsertTask(task);

    if (dto.status && task.assigned_to && task.assigned_to !== user?.id) {
      const statusMap: Record<string, string> = {
        completed: '✅ Tarea completada', in_review: '👀 Tarea en revisión', in_progress: '🔄 Tarea en progreso',
      };
      const title = statusMap[dto.status];
      if (title) await notifyUsers([task.assigned_to], title, task.title, { resource_type: 'task', resource_id: task.id });
    }
    return task;
  };

  const toggleTaskStatus = async (task: Task): Promise<void> => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined });
  };

  const deleteTask = async (task: Task): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) throw error;
    removeTask(task.project_id, task.id);
  };

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean): Promise<void> => {
    const { error } = await supabase
      .from('task_checklist')
      .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null, completed_by: isCompleted ? user?.id : null })
      .eq('id', itemId);
    if (error) throw error;
    if (projectId) await fetchTasks(projectId);
  };

  const addChecklistItem = async (taskId: string, item: string, orderIndex: number): Promise<void> => {
    const { error } = await supabase.from('task_checklist').insert({ task_id: taskId, item, order_index: orderIndex, is_completed: false });
    if (error) throw error;
    if (projectId) await fetchTasks(projectId);
  };

  return {
    tasks, isLoading, error,
    fetchTasks, createTask, updateTask, toggleTaskStatus, deleteTask,
    toggleChecklistItem, addChecklistItem,
  };
}
