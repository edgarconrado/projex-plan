import { ReactNode } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  ViewStyle, TextStyle, TextInputProps, TouchableOpacityProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';

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
  const sizes: Record<string, { c: ViewStyle; t: TextStyle }> = {
    sm: { c: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md }, t: { fontSize: 13 } },
    md: { c: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: Radius.md }, t: { fontSize: 15 } },
    lg: { c: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: Radius.lg }, t: { fontSize: 16 } },
  };
  const variants: Record<string, { c: ViewStyle; t: TextStyle }> = {
    primary: { c: { backgroundColor: disabled ? Colors.primaryMuted : Colors.primary }, t: { color: Colors.textInverse, fontWeight: '600' } },
    secondary: { c: { backgroundColor: Colors.surfaceSecondary, borderWidth: 0.5, borderColor: Colors.border }, t: { color: Colors.textPrimary, fontWeight: '500' } },
    outline: { c: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary }, t: { color: Colors.primary, fontWeight: '500' } },
    ghost: { c: { backgroundColor: 'transparent' }, t: { color: Colors.textSecondary } },
    danger: { c: { backgroundColor: Colors.dangerMuted, borderWidth: 0.5, borderColor: Colors.danger }, t: { color: Colors.danger, fontWeight: '500' } },
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
        ? <ActivityIndicator size="small" color={variant === 'primary' ? Colors.textInverse : Colors.primary} />
        : <>{icon && iconPosition === 'left' && icon}<Text style={[Typography.button, s.t, v.t]}>{label}</Text>{icon && iconPosition === 'right' && icon}</>
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
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && <Text style={[Typography.label, { color: Colors.textSecondary }]}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: error ? Colors.danger : Colors.border, paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
        {leftIcon}
        <TextInput
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          style={[{ flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 13 }, style]}
          {...props}
        />
        {rightIcon}
      </View>
      {error && <Text style={[Typography.caption, { color: Colors.danger }]}>{error}</Text>}
      {hint && !error && <Text style={[Typography.caption, { color: Colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = Colors.textPrimary, bgColor = Colors.surfaceTertiary, size = 'sm', style }: {
  label: string; color?: string; bgColor?: string; size?: 'sm' | 'md'; style?: ViewStyle;
}) {
  return (
    <View style={[{ borderRadius: Radius.full, paddingHorizontal: size === 'sm' ? 8 : 12, paddingVertical: size === 'sm' ? 2 : 5, backgroundColor: bgColor, alignSelf: 'flex-start' }, style]}>
      <Text style={{ fontSize: size === 'sm' ? 11 : 12, fontWeight: '500', color }}>{label}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 36, style }: { name: string; size?: number; style?: ViewStyle }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
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
  const base: ViewStyle = { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding };
  if (onPress) return <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[base, style]}>{children}</TouchableOpacity>;
  return <View style={[base, style]}>{children}</View>;
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 0.5, backgroundColor: Colors.border, marginVertical: Spacing.md }, style]} />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }: {
  icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, gap: Spacing.md }}>
      {icon}
      <Text style={[Typography.h4, { textAlign: 'center' }]}>{title}</Text>
      {subtitle && <Text style={[Typography.bodySmall, { textAlign: 'center' }]}>{subtitle}</Text>}
      {action}
    </View>
  );
}

// ─── LoadingOverlay ───────────────────────────────────────────────────────────
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>{message}</Text>}
    </View>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = Colors.primary, height = 4, style }: {
  value: number; color?: string; height?: number; style?: ViewStyle;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={[{ backgroundColor: Colors.surfaceTertiary, borderRadius: height, overflow: 'hidden', height }, style]}>
      <View style={{ width: `${clamped}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}
