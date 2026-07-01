import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Project, CreateProjectDTO, UpdateProjectDTO } from '../types';
import { useProjectStore } from '../stores';
import { useAuth } from '../lib/AuthContext';
import { cacheProjects, getCachedProjects } from './useOfflineCache';

export function useProjects() {
  const { user } = useAuth();
  const { projects, setProjects, upsertProject, removeProject } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchProjects = useCallback(async () => {
    if (!user || isFetching.current) return;
    isFetching.current = true;

    const hasCache = projects.length > 0;
    if (!hasCache) setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        // Sin conexión — cargar desde caché
        const cached = await getCachedProjects();
        if (cached.length > 0) setProjects(cached);
        else throw error;
      } else {
        const list = (data ?? []) as Project[];
        setProjects(list);
        cacheProjects(list); // guardar para uso offline
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar proyectos');
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const createProject = async (dto: CreateProjectDTO): Promise<Project> => {
    if (!user) throw new Error('No hay sesión activa');
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...dto, created_by: user.id, progress: 0 })
      .select('*')
      .single();
    if (error) throw error;
    const project = data as Project;
    upsertProject(project);
    await supabase.from('project_members').insert({
      project_id: project.id, user_id: user.id, role: 'admin',
    });
    return project;
  };

  const updateProject = async (id: string, dto: UpdateProjectDTO): Promise<Project> => {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const project = data as Project;
    upsertProject(project);
    return project;
  };

  const deleteProject = async (id: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    removeProject(id);
  };

  const getProjectById = (id: string) => projects.find((p) => p.id === id) ?? null;

  return {
    projects, isLoading, error,
    fetchProjects, createProject, updateProject, deleteProject, getProjectById,
  };
}
