import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Task, Notification } from '../types';

const KEYS = {
  PROJECTS: 'offline:projects',
  TASKS: 'offline:tasks',
  NOTIFICATIONS: 'offline:notifications',
  PENDING_TOGGLES: 'offline:pending_toggles',
};

export interface PendingToggle {
  taskId: string;
  projectId: string;
  newStatus: string;
  completedAt: string | null;
  queuedAt: string;
}

// ── Guardar en caché ──────────────────────────────────────────────────────────

export async function cacheProjects(projects: Project[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.warn('[OfflineCache] Error guardando proyectos:', e);
  }
}

export async function cacheTasks(tasks: Task[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn('[OfflineCache] Error guardando tareas:', e);
  }
}

export async function cacheNotifications(notifications: Notification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (e) {
    console.warn('[OfflineCache] Error guardando notificaciones:', e);
  }
}

// ── Leer del caché ────────────────────────────────────────────────────────────

export async function getCachedProjects(): Promise<Project[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROJECTS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function getCachedTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TASKS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function getCachedNotifications(): Promise<Notification[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Cola de toggles pendientes ────────────────────────────────────────────────

export async function queueToggle(toggle: PendingToggle): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_TOGGLES);
    const queue: PendingToggle[] = raw ? JSON.parse(raw) : [];
    // Si ya hay una operación pendiente para esta tarea, la reemplazamos
    const filtered = queue.filter((t) => t.taskId !== toggle.taskId);
    filtered.push(toggle);
    await AsyncStorage.setItem(KEYS.PENDING_TOGGLES, JSON.stringify(filtered));
  } catch (e) {
    console.warn('[OfflineCache] Error encolando toggle:', e);
  }
}

export async function getPendingToggles(): Promise<PendingToggle[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_TOGGLES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearPendingToggles(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.PENDING_TOGGLES);
  } catch { }
}

export async function removePendingToggle(taskId: string): Promise<void> {
  try {
    const queue = await getPendingToggles();
    const filtered = queue.filter((t) => t.taskId !== taskId);
    await AsyncStorage.setItem(KEYS.PENDING_TOGGLES, JSON.stringify(filtered));
  } catch { }
}
