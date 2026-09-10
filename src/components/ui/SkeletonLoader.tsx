import { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { Radius, Spacing } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

function SkeletonBox({ width, height, style, color }: { width: number | string; height: number; style?: ViewStyle; color: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[{ width, height, borderRadius: Radius.md, backgroundColor: color, opacity }, style]} />
  );
}

export function ProjectCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox color={colors.surfaceTertiary} width="60%" height={18} />
        <SkeletonBox color={colors.surfaceTertiary} width={70} height={22} style={{ borderRadius: Radius.full }} />
      </View>
      <SkeletonBox color={colors.surfaceTertiary} width="40%" height={13} />
      <SkeletonBox color={colors.surfaceTertiary} width="100%" height={5} style={{ borderRadius: 4 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBox color={colors.surfaceTertiary} width={80} height={13} />
        <SkeletonBox color={colors.surfaceTertiary} width={80} height={13} />
      </View>
    </View>
  );
}

export function TaskItemSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
      <SkeletonBox color={colors.surfaceTertiary} width={22} height={22} style={{ borderRadius: 6 }} />
      <View style={{ flex: 1, gap: Spacing.sm }}>
        <SkeletonBox color={colors.surfaceTertiary} width="70%" height={15} />
        <SkeletonBox color={colors.surfaceTertiary} width="40%" height={12} />
      </View>
      <SkeletonBox color={colors.surfaceTertiary} width={28} height={28} style={{ borderRadius: 14 }} />
    </View>
  );
}

export function ChatItemSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <SkeletonBox color={colors.surfaceTertiary} width={46} height={46} style={{ borderRadius: 23 }} />
      <View style={{ flex: 1, gap: Spacing.sm }}>
        <SkeletonBox color={colors.surfaceTertiary} width="50%" height={15} />
        <SkeletonBox color={colors.surfaceTertiary} width="80%" height={12} />
      </View>
      <SkeletonBox color={colors.surfaceTertiary} width={35} height={12} />
    </View>
  );
}

export function ProfileSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ padding: Spacing.lg, gap: Spacing.xl }}>
      <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
        <SkeletonBox color={colors.surfaceTertiary} width={88} height={88} style={{ borderRadius: 44 }} />
        <SkeletonBox color={colors.surfaceTertiary} width={160} height={20} />
        <SkeletonBox color={colors.surfaceTertiary} width={120} height={14} />
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <SkeletonBox color={colors.surfaceTertiary} width={36} height={36} style={{ borderRadius: 10 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox color={colors.surfaceTertiary} width="50%" height={14} />
            <SkeletonBox color={colors.surfaceTertiary} width="70%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
