import { ReactNode } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image,
  ViewStyle, TextStyle, TextInputProps, TouchableOpacityProps,
} from 'react-native';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  label, variant = 'primary', size = 'md', loading = false,
  icon, iconPosition = 'left', style, disabled, ...props
}: ButtonProps) {
  const { colors, typography } = useTheme();
  const sizes: Record<string, { c: ViewStyle; t: TextStyle }> = {
    sm: { c: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md }, t: { fontSize: 13 } },
    md: { c: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: Radius.md }, t: { fontSize: 15 } },
    lg: { c: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: Radius.lg }, t: { fontSize: 16 } },
  };
  const variants: Record<string, { c: ViewStyle; t: TextStyle }> = {
    primary: { c: { backgroundColor: disabled ? colors.primaryMuted : colors.primary }, t: { color: colors.textInverse, fontWeight: '600' } },
    secondary: { c: { backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.border }, t: { color: colors.textPrimary, fontWeight: '500' } },
    outline: { c: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }, t: { color: colors.primary, fontWeight: '500' } },
    ghost: { c: { backgroundColor: 'transparent' }, t: { color: colors.textSecondary } },
    danger: { c: { backgroundColor: colors.dangerMuted, borderWidth: 0.5, borderColor: colors.danger }, t: { color: colors.danger, fontWeight: '500' } },
  };
  const s = sizes[size];
  const v = variants[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.75} disabled={disabled || loading}
      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, s.c, v.c, disabled && { opacity: 0.5 }, style]}
      {...props}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' ? colors.textInverse : colors.primary} />
        : <>{icon && iconPosition === 'left' && icon}<Text style={[typography.button, s.t, v.t]}>{label}</Text>{icon && iconPosition === 'right' && icon}</>
      }
    </TouchableOpacity>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, hint, leftIcon, rightIcon, containerStyle, style, ...props }: InputProps) {
  const { colors, typography } = useTheme();
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && <Text style={[typography.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: error ? colors.danger : colors.border, paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
        {leftIcon}
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          style={[{ flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 13 }, style]}
          {...props}
        />
        {rightIcon}
      </View>
      {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
      {hint && !error && <Text style={[typography.caption, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color, bgColor, size = 'sm', style }: {
  label: string; color?: string; bgColor?: string; size?: 'sm' | 'md'; style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const finalColor = color ?? colors.textPrimary;
  const finalBgColor = bgColor ?? colors.surfaceTertiary;
  return (
    <View style={[{ borderRadius: Radius.full, paddingHorizontal: size === 'sm' ? 8 : 12, paddingVertical: size === 'sm' ? 2 : 5, backgroundColor: finalBgColor, alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontSize: size === 'sm' ? 11 : 12, fontWeight: '500', color: finalColor }}>{label}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, imageUrl, size = 36, style }: { name: string; imageUrl?: string | null; size?: number; style?: ViewStyle }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},50%,25%)` }, style]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},50%,25%)`, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '600', color: `hsl(${hue},80%,75%)` }}>{initials}</Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, padding = Spacing.lg }: {
  children: ReactNode; style?: ViewStyle; onPress?: () => void; padding?: number;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = { backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding };
  if (onPress) return <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[base, style]}>{children}</TouchableOpacity>;
  return <View style={[base, style]}>{children}</View>;
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={[{ height: 0.5, backgroundColor: colors.border, marginVertical: Spacing.md }, style]} />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }: {
  icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode;
}) {
  const { typography } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.md }}>
      {icon}
      <Text style={[typography.h4, { textAlign: 'center' }]}>{title}</Text>
      {subtitle && <Text style={[typography.bodySmall, { textAlign: 'center' }]}>{subtitle}</Text>}
      {action}
    </View>
  );
}

// ─── LoadingOverlay ───────────────────────────────────────────────────────────
export function LoadingOverlay({ message }: { message?: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color, height = 4, style }: {
  value: number; color?: string; height?: number; style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const finalColor = color ?? colors.primary;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={[{ backgroundColor: colors.surfaceTertiary, borderRadius: height, overflow: 'hidden', height }, style]}>
      <View style={{ width: `${clamped}%`, height, backgroundColor: finalColor, borderRadius: height }} />
    </View>
  );
}

export { OfflineBanner } from './OfflineBanner';
