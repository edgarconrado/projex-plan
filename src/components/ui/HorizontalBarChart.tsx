import { View, Text } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';

interface BarSegment {
  label: string;
  value: number;
  color: string;
}

interface HorizontalBarChartProps {
  segments: BarSegment[];
}

export function HorizontalBarChart({ segments }: HorizontalBarChartProps) {
  const max = Math.max(...segments.map((s) => s.value), 1);

  return (
    <View style={{ gap: Spacing.md }}>
      {segments.map((s, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>{s.label}</Text>
            <Text style={[Typography.bodySmall, { fontWeight: '600', color: Colors.textPrimary }]}>{s.value}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: Colors.surfaceTertiary, borderRadius: Radius.full, overflow: 'hidden' }}>
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
