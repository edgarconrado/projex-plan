import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/AuthContext';
import { useProjects } from '../../src/hooks/useProjects';
import { useTasks } from '../../src/hooks/useTasks';
import { useProjectStore } from '../../src/stores';
import { Colors, Typography, Spacing, Radius, getStatusColor, getStatusLabel, getPriorityColor } from '../../src/lib/theme';
import { ProgressBar, Avatar } from '../../src/components/ui';
import { DonutChart, DonutLegend } from '../../src/components/ui/DonutChart';
import { HorizontalBarChart } from '../../src/components/ui/HorizontalBarChart';

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}>
        <Ionicons name={icon as never} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.textPrimary }}>{value}</Text>
      <Text style={[Typography.caption, { marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.lg }}>
      {children}
    </View>
  );
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const { projects, fetchProjects } = useProjects();
  const { tasks, fetchTasks } = useTasks();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchProjects(); fetchTasks(); }, [fetchProjects, fetchTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProjects(), fetchTasks()]);
    setRefreshing(false);
  }, [fetchProjects, fetchTasks]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const recentProjects = [...projects].slice(0, 4);

  // Tareas SOLO del proyecto activo
  const projectTasks = activeProjectId ? tasks.filter((t) => t.project_id === activeProjectId) : [];
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = projectTasks.filter((t) => t.status === 'in_progress').length;
  const inReviewTasks = projectTasks.filter((t) => t.status === 'in_review').length;
  const pendingTasks = projectTasks.filter((t) => t.status === 'pending').length;

  // % de progreso basado en tareas completadas del proyecto activo (no en projects.progress)
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusSegments = [
    { label: 'Completadas', value: completedTasks, color: Colors.success },
    { label: 'En progreso', value: inProgressTasks, color: Colors.statusActive },
    { label: 'En revisión', value: inReviewTasks, color: Colors.info },
    { label: 'Pendientes', value: pendingTasks, color: Colors.textMuted },
  ];

  const priorityCounts = {
    critical: projectTasks.filter((t) => t.priority === 'critical').length,
    high: projectTasks.filter((t) => t.priority === 'high').length,
    medium: projectTasks.filter((t) => t.priority === 'medium').length,
    low: projectTasks.filter((t) => t.priority === 'low').length,
  };

  const prioritySegments = [
    { label: 'Crítica', value: priorityCounts.critical, color: getPriorityColor('critical') },
    { label: 'Alta', value: priorityCounts.high, color: getPriorityColor('high') },
    { label: 'Media', value: priorityCounts.medium, color: getPriorityColor('medium') },
    { label: 'Baja', value: priorityCounts.low, color: getPriorityColor('low') },
  ];

  const overdueTasks = projectTasks.filter((t) =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  ).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100, gap: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>{greeting},</Text>
            <Text style={Typography.h2}>{profile?.full_name?.split(' ')[0] ?? 'Usuario'} 👋</Text>
          </View>
          {profile && <Avatar name={profile.full_name} size={44} />}
        </View>

        {/* Proyecto activo */}
        {activeProject ? (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/tasks' as never)}
            style={{
              backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg,
              borderWidth: 1, borderColor: Colors.primary,
              padding: Spacing.lg,
              flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="briefcase" size={20} color={Colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption, { color: Colors.primary, fontWeight: '600' }]}>PROYECTO ACTIVO</Text>
              <Text style={[Typography.body, { fontWeight: '600', marginTop: 1 }]} numberOfLines={1}>{activeProject.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/projects' as never)}
            style={{
              backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg,
              borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
              padding: Spacing.lg,
              flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.textMuted} />
            <Text style={[Typography.bodySmall, { color: Colors.textMuted, flex: 1 }]}>
              Selecciona un proyecto activo para ver sus estadísticas
            </Text>
          </TouchableOpacity>
        )}

        {activeProject && (
          <>
            {/* Stats rápidas del proyecto activo */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <StatCard label="Tareas" value={totalTasks} icon="checkbox-outline" color={Colors.primary} />
              <StatCard label="Completadas" value={completedTasks} icon="checkmark-circle-outline" color={Colors.success} />
              <StatCard label="Vencidas" value={overdueTasks} icon="alert-circle-outline" color={overdueTasks > 0 ? Colors.danger : Colors.textMuted} />
            </View>

            {/* Progreso con dona */}
            <SectionCard>
              <Text style={[Typography.h4, { marginBottom: Spacing.lg }]}>Progreso de "{activeProject.name}"</Text>
              {totalTasks === 0 ? (
                <Text style={[Typography.bodySmall, { color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg }]}>
                  Aún no hay tareas en este proyecto
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xl }}>
                  <DonutChart
                    segments={statusSegments}
                    centerValue={`${taskProgress}%`}
                    centerLabel="completado"
                  />
                  <View style={{ flex: 1 }}>
                    <DonutLegend segments={statusSegments} />
                  </View>
                </View>
              )}
            </SectionCard>

            {/* Distribución por prioridad */}
            {totalTasks > 0 && (
              <SectionCard>
                <Text style={[Typography.h4, { marginBottom: Spacing.lg }]}>Tareas por prioridad</Text>
                <HorizontalBarChart segments={prioritySegments} />
              </SectionCard>
            )}
          </>
        )}

        {/* Lista de proyectos */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <Text style={Typography.h4}>Todos los proyectos</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/projects' as never)}>
              <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: '500' }}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {recentProjects.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/projects' as never)}
              style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm }}
            >
              <Ionicons name="add-circle-outline" size={32} color={Colors.textMuted} />
              <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>Crea tu primer proyecto</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {recentProjects.map((project) => {
                const isActive = project.id === activeProjectId;
                return (
                  <TouchableOpacity
                    key={project.id}
                    onPress={() => setActiveProjectId(project.id)}
                    style={{
                      backgroundColor: isActive ? Colors.primaryMuted : Colors.surfaceSecondary,
                      borderRadius: Radius.lg, borderWidth: isActive ? 1 : 0.5,
                      borderColor: isActive ? Colors.primary : Colors.border,
                      padding: Spacing.md,
                      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                    }}
                  >
                    <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: getStatusColor(project.status) }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.body, { fontWeight: '500' }]} numberOfLines={1}>{project.name}</Text>
                      <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                        {getStatusLabel(project.status)}
                      </Text>
                    </View>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
