import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Task, Notification, FilterOptions } from '../types';

interface ProjectStore {
  projects: Project[];
  selectedProject: Project | null;
  activeProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (project: Project | null) => void;
  setActiveProjectId: (id: string | null) => void;
  upsertProject: (project: Project) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      selectedProject: null,
      activeProjectId: null,

      setProjects: (projects) => set({ projects }),
      setSelectedProject: (project) => set({ selectedProject: project }),
      setActiveProjectId: (id) => set({ activeProjectId: id }),

      upsertProject: (project) =>
        set((state) => {
          const exists = state.projects.find((p) => p.id === project.id);
          return {
            projects: exists
              ? state.projects.map((p) => (p.id === project.id ? project : p))
              : [project, ...state.projects],
          };
        }),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          // Si el proyecto activo se elimina, limpiar selección
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
    }),
    {
      name: 'projex-active-project',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistimos el ID del proyecto activo, no toda la lista
      partialize: (state) => ({ activeProjectId: state.activeProjectId }),
    }
  )
);

interface TaskStore {
  tasksByProject: Record<string, Task[]>;
  selectedTask: Task | null;
  filters: FilterOptions;
  setTasks: (projectId: string, tasks: Task[]) => void;
  setSelectedTask: (task: Task | null) => void;
  upsertTask: (task: Task) => void;
  removeTask: (projectId: string, taskId: string) => void;
  removeTaskById: (taskId: string) => void;
  setFilters: (filters: FilterOptions) => void;
  resetFilters: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasksByProject: {},
  selectedTask: null,
  filters: { status: 'all', priority: 'all', search: '' },
  setTasks: (projectId, tasks) => set((state) => ({
    tasksByProject: { ...state.tasksByProject, [projectId]: tasks },
  })),
  setSelectedTask: (task) => set({ selectedTask: task }),
  upsertTask: (task) => set((state) => {
    const current = state.tasksByProject[task.project_id] ?? [];
    const exists = current.find((t) => t.id === task.id);
    return {
      tasksByProject: {
        ...state.tasksByProject,
        [task.project_id]: exists
          ? current.map((t) => (t.id === task.id ? task : t))
          : [task, ...current],
      },
    };
  }),
  removeTask: (projectId, taskId) => set((state) => ({
    tasksByProject: {
      ...state.tasksByProject,
      [projectId]: (state.tasksByProject[projectId] ?? []).filter((t) => t.id !== taskId),
    },
  })),
  // Elimina una tarea por ID sin necesitar conocer de antemano su project_id
  // — recorre todos los grupos y la quita de donde aparezca. Útil para
  // eventos de Realtime DELETE, cuyo payload puede no incluir project_id.
  removeTaskById: (taskId) => set((state) => {
    const next: Record<string, Task[]> = {};
    for (const [pid, list] of Object.entries(state.tasksByProject)) {
      next[pid] = list.filter((t) => t.id !== taskId);
    }
    return { tasksByProject: next };
  }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: { status: 'all', priority: 'all', search: '' } }),
}));

interface UIStore {
  notifications: Notification[];
  unreadCount: number;
  chatUnreadCount: number;
  setNotifications: (n: Notification[]) => void;
  addNotification: (n: Notification) => void;
  markAllRead: () => void;
  setChatUnread: (count: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  chatUnreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.is_read).length,
  }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
  })),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    unreadCount: 0,
  })),
  setChatUnread: (count) => set({ chatUnreadCount: count }),
}));
