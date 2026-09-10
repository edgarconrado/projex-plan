import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, addDays, startOfDay, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useTasks } from '../../src/hooks/useTasks';
import { useProjectStore } from '../../src/stores';
import { Spacing, Radius } from '../../src/lib/theme';
import { Task } from '../../src/types';

const SCREEN_W = Dimensions.get('window').width;
const LABEL_W = 130;
const DAY_W = 24;
const ROW_H = 36;

const STATUS_COLORS: Record<string, string> = {
  completed: '#22C55E', in_progress: '#F59E0B',
  in_review: '#3B82F6', pending: '#6B7280', cancelled: '#EF4444',
};

export default function GanttScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { setActiveProjectId } = useProjectStore();
  const { tasks, fetchTasks } = useTasks(projectId);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    if (projectId) { setActiveProjectId(projectId); fetchTasks(); }
  }, [projectId, fetchTasks, setActiveProjectId]));

  const onRefresh = async () => { setRefreshing(true); await fetchTasks(); setRefreshing(false); };

  // Solo tareas con fechas válidas
  const validTasks = tasks.filter(t =>
    t.project_id === projectId &&
    t.due_date && isValid(parseISO(t.due_date))
  );

  if (validTasks.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={typography.h4}>Gantt</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{projectName}</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl }}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
          <Text style={[typography.h4, { color: colors.textMuted }]}>Sin datos para el Gantt</Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
            Las tareas necesitan tener fecha límite para aparecer en el Gantt. Agrega fechas a tus tareas desde el detalle de cada una.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calcular rango de fechas
  const allDates = validTasks.flatMap(t => [
    t.start_date ? parseISO(t.start_date) : parseISO(t.created_at),
    parseISO(t.due_date!),
  ]);
  const minDate = startOfDay(new Date(Math.min(...allDates.map(d => d.getTime()))));
  const maxDate = startOfDay(new Date(Math.max(...allDates.map(d => d.getTime()))));
  const totalDays = differenceInDays(maxDate, minDate) + 2;

  // Generar encabezados de semanas
  const weekHeaders: { label: string; days: number }[] = [];
  let cursor = new Date(minDate);
  while (cursor <= maxDate) {
    const weekStart = new Date(cursor);
    const weekEnd = addDays(weekStart, 6);
    const daysInRange = Math.min(differenceInDays(weekEnd > maxDate ? maxDate : weekEnd, cursor) + 1, 7);
    weekHeaders.push({ label: format(weekStart, "'Sem' w", { locale: es }), days: daysInRange });
    cursor = addDays(cursor, daysInRange);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h4}>Gantt</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{projectName}</Text>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Header de semanas */}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: LABEL_W, borderRightWidth: 0.5, borderColor: colors.border }} />
              {weekHeaders.map((wh, i) => (
                <View key={i} style={{ width: wh.days * DAY_W, borderRightWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>{wh.label}</Text>
                </View>
              ))}
            </View>

            {/* Hoy marker */}
            {(() => {
              const todayOffset = differenceInDays(startOfDay(new Date()), minDate);
              if (todayOffset < 0 || todayOffset > totalDays) return null;
              return (
                <View style={{ position: 'absolute', left: LABEL_W + todayOffset * DAY_W + DAY_W / 2, top: 0, bottom: 0, width: 1.5, backgroundColor: colors.danger, zIndex: 10 }} />
              );
            })()}

            {/* Filas de tareas */}
            {validTasks.map((task, idx) => {
              const start = task.start_date ? parseISO(task.start_date) : parseISO(task.created_at);
              const end = parseISO(task.due_date!);
              const startOffset = Math.max(0, differenceInDays(startOfDay(start), minDate));
              const duration = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);
              const barColor = STATUS_COLORS[task.status] ?? '#6B7280';
              const pct = task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : task.status === 'in_review' ? 75 : 0;

              return (
                <View key={task.id} style={{ flexDirection: 'row', height: ROW_H, borderBottomWidth: 0.5, borderColor: colors.border, backgroundColor: idx % 2 === 0 ? colors.surface : colors.surfaceSecondary }}>
                  {/* Label */}
                  <View style={{ width: LABEL_W, justifyContent: 'center', paddingHorizontal: 8, borderRightWidth: 0.5, borderColor: colors.border }}>
                    <Text style={{ fontSize: 11, color: colors.textPrimary, fontWeight: '500' }} numberOfLines={1}>{task.title}</Text>
                  </View>
                  {/* Barra */}
                  <View style={{ width: totalDays * DAY_W, position: 'relative', justifyContent: 'center' }}>
                    {/* Fondo de la barra */}
                    <View style={{
                      position: 'absolute',
                      left: startOffset * DAY_W + 2,
                      width: duration * DAY_W - 4,
                      height: ROW_H - 10,
                      borderRadius: 6,
                      backgroundColor: `${barColor}30`,
                      borderWidth: 1,
                      borderColor: `${barColor}60`,
                      overflow: 'hidden',
                    }}>
                      {/* Progreso */}
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: `${barColor}80` }} />
                    </View>
                    {/* Etiqueta de % */}
                    {pct > 0 && (
                      <Text style={{ position: 'absolute', left: startOffset * DAY_W + 6, fontSize: 9, fontWeight: '700', color: barColor }}>
                        {pct}%
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Leyenda */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.lg }}>
          {Object.entries({ 'Completada': '#22C55E', 'En progreso': '#F59E0B', 'En revisión': '#3B82F6', 'Pendiente': '#6B7280', 'Cancelada': '#EF4444' }).map(([label, color]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
