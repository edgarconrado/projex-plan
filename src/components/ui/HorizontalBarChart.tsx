import { View, Text } from 'react-native';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

interface BarSegment {
  label: string;
  value: number;
  color: string;
}

interface HorizontalBarChartProps {
  segments: BarSegment[];
}

export function HorizontalBarChart({ segments }: HorizontalBarChartProps) {
  const { colors, typography } = useTheme();
  const max = Math.max(...segments.map((s) => s.value), 1);

  return (
    <View style={{ gap: Spacing.md }}>
      {segments.map((s, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{s.label}</Text>
            <Text style={[typography.bodySmall, { fontWeight: '600', color: colors.textPrimary }]}>{s.value}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: Radius.full, overflow: 'hidden' }}>
            <View style={{
              height: 8,
              width: `${Math.max((s.value / max) * 100, s.value > 0 ? 4 : 0)}%`,
              backgroundColor: s.color,
              borderRadius: Radius.full,
            }} />
          </View>
        </View>
      ))}
    </View>
  );
}
