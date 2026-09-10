import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export type ProjectRole = 'admin' | 'project_manager' | 'supervisor' | 'inspector' | 'worker' | 'viewer';

export interface ProjectPermissions {
  role: ProjectRole | null;
  isOwner: boolean;
  canCreateTask: boolean;      // Admin, PM, Supervisor
  canEditTask: boolean;        // Admin, PM, Supervisor
  canAssignTask: boolean;      // Admin, PM, Supervisor
  canCompleteTask: boolean;    // Admin, PM, Supervisor, Inspector, Worker
  canToggleChecklist: boolean; // Admin, PM, Supervisor, Inspector, Worker
  canChat: boolean;            // Admin, PM, Supervisor, Inspector, Worker
  canCreateSiteLog: boolean;   // Admin, PM, Supervisor, Inspector
  canCreateRisk: boolean;      // Admin, PM only
  canCreateEVM: boolean;       // Admin, PM only
  canGeneratePDF: boolean;     // Admin, PM, Supervisor
  canInvite: boolean;          // Admin, PM
  isReadOnly: boolean;         // Viewer
  isLoading: boolean;
}

const DEFAULT: ProjectPermissions = {
  role: null, isOwner: false,
  canCreateTask: false, canEditTask: false, canAssignTask: false,
  canCompleteTask: false, canToggleChecklist: false, canChat: false,
  canCreateSiteLog: false, canCreateRisk: false, canCreateEVM: false,
  canGeneratePDF: false, canInvite: false, isReadOnly: false, isLoading: true,
};

function buildPermissions(role: ProjectRole | null, isOwner: boolean): ProjectPermissions {
  const is = (...roles: ProjectRole[]) => role !== null && roles.includes(role);
  return {
    role, isOwner, isLoading: false,
    isReadOnly: role === 'viewer',
    canCreateTask:      isOwner || is('admin', 'project_manager', 'supervisor'),
    canEditTask:        isOwner || is('admin', 'project_manager', 'supervisor'),
    canAssignTask:      isOwner || is('admin', 'project_manager', 'supervisor'),
    canCompleteTask:    isOwner || is('admin', 'project_manager', 'supervisor', 'inspector', 'worker'),
    canToggleChecklist: isOwner || is('admin', 'project_manager', 'supervisor', 'inspector', 'worker'),
    canChat:            isOwner || is('admin', 'project_manager', 'supervisor', 'inspector', 'worker'),
    canCreateSiteLog:   isOwner || is('admin', 'project_manager', 'supervisor', 'inspector'),
    canCreateRisk:      isOwner || is('admin', 'project_manager'),
    canCreateEVM:       isOwner || is('admin', 'project_manager'),
    canGeneratePDF:     isOwner || is('admin', 'project_manager', 'supervisor'),
    canInvite:          isOwner || is('admin', 'project_manager'),
  };
}

export function useProjectPermissions(projectId?: string | null, createdBy?: string | null): ProjectPermissions {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ProjectPermissions>(DEFAULT);

  const load = useCallback(async () => {
    if (!user || !projectId) { setPermissions({ ...DEFAULT, isLoading: false }); return; }
    setPermissions(p => ({ ...p, isLoading: true }));
    const isOwner = createdBy === user.id;
    if (isOwner) {
      setPermissions(buildPermissions('admin', true));
      return;
    }
    const { data } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    const role = (data?.role ?? null) as ProjectRole | null;
    setPermissions(buildPermissions(role, false));
  }, [user, projectId, createdBy]);

  useEffect(() => { load(); }, [load]);

  return permissions;
}
