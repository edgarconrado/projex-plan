import { TextStyle, ViewStyle } from 'react-native';

// Paleta oscura — la original de la app, ahora también exportada como DarkColors
// para que el ThemeContext pueda alternar entre ella y LightColors.
export const DarkColors = {
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

// Paleta clara — mismos acentos (amarillo, estados, prioridades) sobre fondos
// claros y texto oscuro, manteniendo el mismo "significado" de cada color.
export const LightColors = {
  primary: '#CC9900',
  primaryDark: '#A87D00',
  primaryLight: '#E6B800',
  primaryMuted: 'rgba(204, 153, 0, 0.12)',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F2',
  surfaceTertiary: '#E8E8E8',
  border: '#DDDDDD',
  borderLight: '#CCCCCC',
  textPrimary: '#111111',
  textSecondary: '#555555',
  textMuted: '#999999',
  textInverse: '#FFFFFF',
  statusPlanning: '#6366F1',
  statusActive: '#CC9900',
  statusOnHold: '#D97706',
  statusCompleted: '#16A34A',
  statusCancelled: '#6B7280',
  priorityLow: '#16A34A',
  priorityMedium: '#D97706',
  priorityHigh: '#DC2626',
  priorityUrgent: '#B91C1C',
  success: '#16A34A',
  successMuted: 'rgba(22,163,74,0.12)',
  warning: '#D97706',
  warningMuted: 'rgba(217,119,6,0.12)',
  danger: '#DC2626',
  dangerMuted: 'rgba(220,38,38,0.12)',
  info: '#2563EB',
  infoMuted: 'rgba(37,99,235,0.12)',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export type ThemeColors = typeof DarkColors;
export type ThemeMode = 'dark' | 'light';

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? LightColors : DarkColors;
}

// Colors sigue exportado igual que siempre (apunta a la paleta oscura) para
// que ninguna pantalla existente se rompa. Las pantallas que quieras hacer
// reactivas al tema deben migrar a `const { colors } = useTheme()` en vez de
// importar `Colors` directamente.
export const Colors = DarkColors;

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

// Construye un objeto Typography ligado a una paleta específica — útil dentro
// de pantallas migradas al ThemeContext, donde los colores cambian en runtime.
export function getTypography(colors: ThemeColors) {
  return {
    h1: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 } as TextStyle,
    h2: { fontSize: 22, fontWeight: '600', color: colors.textPrimary, letterSpacing: -0.3 } as TextStyle,
    h3: { fontSize: 18, fontWeight: '600', color: colors.textPrimary } as TextStyle,
    h4: { fontSize: 16, fontWeight: '600', color: colors.textPrimary } as TextStyle,
    body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary, lineHeight: 22 } as TextStyle,
    bodySmall: { fontSize: 13, fontWeight: '400', color: colors.textSecondary, lineHeight: 18 } as TextStyle,
    caption: { fontSize: 11, fontWeight: '400', color: colors.textMuted } as TextStyle,
    label: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.8 } as TextStyle,
    button: { fontSize: 15, fontWeight: '600', letterSpacing: 0.2 } as TextStyle,
  };
}

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

export function getStatusColor(status: string, colors: ThemeColors = Colors): string {
  const map: Record<string, string> = {
    planning: colors.statusPlanning,
    in_progress: colors.statusActive,
    on_hold: colors.statusOnHold,
    in_review: colors.info,
    completed: colors.statusCompleted,
    cancelled: colors.statusCancelled,
  };
  return map[status] ?? colors.textMuted;
}

export function getPriorityColor(priority: string, colors: ThemeColors = Colors): string {
  const map: Record<string, string> = {
    low: colors.priorityLow,
    medium: colors.priorityMedium,
    high: colors.priorityHigh,
    critical: colors.priorityUrgent,
  };
  return map[priority] ?? colors.textMuted;
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
