import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../../lib/theme';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ segments, size = 140, strokeWidth = 18, centerLabel, centerValue }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  let cumulativeOffset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const fraction = total > 0 ? seg.value / total : 0;
      const dashLength = fraction * circumference;
      const dashOffset = circumference - cumulativeOffset;
      cumulativeOffset += dashLength;
      return { ...seg, dashLength, dashOffset };
    });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Track de fondo */}
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={Colors.surfaceTertiary} strokeWidth={strokeWidth} fill="none"
          />
          {total === 0 ? null : arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              stroke={arc.color} strokeWidth={strokeWidth} fill="none"
              strokeDasharray={`${arc.dashLength} ${circumference}`}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {centerValue && <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.textPrimary }}>{centerValue}</Text>}
        {centerLabel && <Text style={[Typography.caption, { color: Colors.textMuted }]}>{centerLabel}</Text>}
      </View>
    </View>
  );
}

export function DonutLegend({ segments }: { segments: DonutSegment[] }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {segments.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
          <Text style={[Typography.bodySmall, { flex: 1, color: Colors.textSecondary }]}>{s.label}</Text>
          <Text style={[Typography.bodySmall, { fontWeight: '600', color: Colors.textPrimary }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}
