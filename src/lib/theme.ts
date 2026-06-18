import { TextStyle, ViewStyle } from 'react-native';

export const Colors = {
  primary: '#FFD700',
  primaryDark: '#E6C200',
  primaryLight: '#FFE44D',
  primaryMuted: 'rgba(255, 215, 0, 0.15)',
  background: '#0A0A0A',
  surface: '#111111',
  surfaceSecondary: '#1A1A1A',
  surfaceTertiary: '#222222',
  border: '#2A2A2A',
  borderLight: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#999999',
  textMuted: '#555555',
  textInverse: '#000000',
  statusPlanning: '#6366F1',
  statusActive: '#FFD700',
  statusOnHold: '#F59E0B',
  statusCompleted: '#22C55E',
  statusCancelled: '#6B7280',
  priorityLow: '#22C55E',
  priorityMedium: '#F59E0B',
  priorityHigh: '#EF4444',
  priorityUrgent: '#DC2626',
  success: '#22C55E',
  successMuted: 'rgba(34,197,94,0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245,158,11,0.15)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239,68,68,0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59,130,246,0.15)',
  overlay: 'rgba(0,0,0,0.7)',
} as const;

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 } as TextStyle,
  h2: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.3 } as TextStyle,
  h3: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary } as TextStyle,
  h4: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary } as TextStyle,
  body: { fontSize: 15, fontWeight: '400', color: Colors.textPrimary, lineHeight: 22 } as TextStyle,
  bodySmall: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary, lineHeight: 18 } as TextStyle,
  caption: { fontSize: 11, fontWeight: '400', color: Colors.textMuted } as TextStyle,
  label: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 } as TextStyle,
  button: { fontSize: 15, fontWeight: '600', letterSpacing: 0.2 } as TextStyle,
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const Radius = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 999,
} as const;

export const Shadows = {
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
};

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    planning: Colors.statusPlanning,
    in_progress: Colors.statusActive,
    on_hold: Colors.statusOnHold,
    in_review: Colors.info,
    completed: Colors.statusCompleted,
    cancelled: Colors.statusCancelled,
  };
  return map[status] ?? Colors.textMuted;
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: Colors.priorityLow,
    medium: Colors.priorityMedium,
    high: Colors.priorityHigh,
    critical: Colors.priorityUrgent,
  };
  return map[priority] ?? Colors.textMuted;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    planning: 'Planeación', active: 'Activo', on_hold: 'En pausa',
    completed: 'Completado', cancelled: 'Cancelado',
    pending: 'Pendiente', in_progress: 'En progreso', in_review: 'En revisión',
  };
  return map[status] ?? status;
}

export function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
  };
  return map[priority] ?? priority;
}

export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrador', project_manager: 'Project Manager',
    supervisor: 'Supervisor', worker: 'Trabajador',
  };
  return map[role] ?? role;
}
