import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/AuthContext';
import { useProjects } from '../../src/hooks/useProjects';
import { useTasks } from '../../src/hooks/useTasks';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useReport } from '../../src/hooks/useReport';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useProjectStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { Spacing, Radius, getStatusColor, getStatusLabel, getPriorityColor } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { ProgressBar, Avatar } from '../../src/components/ui';
import { DonutChart, DonutLegend } from '../../src/components/ui/DonutChart';
import { HorizontalBarChart } from '../../src/components/ui/HorizontalBarChart';
import { useProjectPermissions } from '../../src/hooks/useProjectPermissions';
import { useSubscription } from '../../src/hooks/useSubscription';
import { PaywallModal } from '../../src/components/ui/PaywallModal';

function StatCard({ label, value, icon, color, colors, typography }: {
  label: string; value: number | string; icon: string; color: string;
  colors: ReturnType<typeof useTheme>['colors']; typography: ReturnType<typeof useTheme>['typography'];
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}>
        <Ionicons name={icon as never} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary }}>{value}</Text>
      <Text style={[typography.caption, { marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function SectionCard({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.lg }}>
      {children}
    </View>
  );
}

export default function DashboardScreen() {
  const { colors, typography } = useTheme();
  const { profile, user } = useAuth();
  const sub = useSubscription();
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const { generateReport, isGenerating } = useReport();
  const { projects, fetchProjects } = useProjects();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const { tasks, fetchTasks } = useTasks(activeProjectId ?? undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [userProjectRole, setUserProjectRole] = useState<string | null>(null);

  useEffect(() => { fetchProjects(); fetchTasks(); }, [fetchProjects, fetchTasks]);

  useEffect(() => {
    if (!activeProjectId || !user) { setUserProjectRole(null); return; }
    supabase
      .from('project_members')
      .select('role')
      .eq('project_id', activeProjectId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setUserProjectRole(data?.role ?? null));
  }, [activeProjectId, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProjects(), fetchTasks()]);
    setRefreshing(false);
  }, [fetchProjects, fetchTasks]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const recentProjects = [...projects].slice(0, 4);

  // Solo Admin, Project Manager y Supervisor pueden generar PDF
  const canGeneratePDF = activeProject?.created_by === user?.id ||
    ['admin', 'project_manager', 'supervisor'].includes(userProjectRole ?? '');

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
    { label: 'Completadas', value: completedTasks, color: colors.success },
    { label: 'En progreso', value: inProgressTasks, color: colors.statusActive },
    { label: 'En revisión', value: inReviewTasks, color: colors.info },
    { label: 'Pendientes', value: pendingTasks, color: colors.textMuted },
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100, gap: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 36, height: 36, borderRadius: 9 }}
            />
            <View>
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>{greeting},</Text>
              <Text style={typography.h2}>{profile?.full_name?.split(' ')[0] ?? 'Usuario'} 👋</Text>
            </View>
          </View>
          {profile && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/notifications' as never)}
              style={{ position: 'relative' }}
            >
              <Avatar name={profile.full_name} imageUrl={profile.avatar_url} size={44} />
              {unreadNotifCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: colors.danger, borderRadius: Radius.full,
                  minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 3, borderWidth: 2, borderColor: colors.background,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Proyecto activo */}
        {activeProject ? (
          <View style={{
            backgroundColor: colors.primaryMuted, borderRadius: Radius.lg,
            borderWidth: 1, borderColor: colors.primary,
            padding: Spacing.lg,
            flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
          }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/tasks' as never)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="briefcase" size={20} color={colors.textInverse} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>PROYECTO ACTIVO</Text>
                <Text style={[typography.body, { fontWeight: '600', marginTop: 1 }]} numberOfLines={1}>{activeProject.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
            {canGeneratePDF && (
              <TouchableOpacity
                onPress={() => {
                  if (!sub.canCreatePDF) { setPaywallFeature('Reportes PDF'); return; }
                  generateReport(activeProject, tasks);
                }}
                disabled={isGenerating}
                style={{
                  backgroundColor: colors.primary, borderRadius: Radius.md,
                  paddingHorizontal: 10, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  opacity: isGenerating ? 0.6 : 1,
                }}
              >
                {isGenerating
                  ? <Ionicons name="hourglass-outline" size={14} color={colors.textInverse} />
                  : <Ionicons name="document-text-outline" size={14} color={colors.textInverse} />}
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textInverse }}>
                  {isGenerating ? 'PDF...' : 'PDF'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/projects' as never)}
            style={{
              backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg,
              borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
              padding: Spacing.lg,
              flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.textMuted} />
            <Text style={[typography.bodySmall, { color: colors.textMuted, flex: 1 }]}>
              Selecciona un proyecto activo para ver sus estadísticas
            </Text>
          </TouchableOpacity>
        )}

        {/* Accesos rápidos al proyecto activo: fila 1 */}
        {activeProject && (
          <View style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <TouchableOpacity
                onPress={() => router.push(`/plans/${activeProject.id}` as never)}
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Planos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/documents/${activeProject.id}` as never)}
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="folder-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Docs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push({ pathname: '/sitelog/[projectId]', params: { projectId: activeProject.id, projectName: activeProject.name } } as never)}
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Bitácora</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => sub.canUseBudget ? router.push({ pathname: '/budget/[projectId]', params: { projectId: activeProject.id, projectName: activeProject.name } } as never) : setPaywallFeature('Control de presupuesto')}
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Segunda fila de accesos: Riesgos, Gantt, EVM */}
        {activeProject && (
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/risks/[projectId]', params: { projectId: activeProject.id, projectName: activeProject.name } } as never)}
              style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="warning-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Riesgos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push({ pathname: '/gantt/[projectId]', params: { projectId: activeProject.id, projectName: activeProject.name } } as never)}
              style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3B82F615', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="bar-chart-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Gantt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push({ pathname: '/team/[projectId]', params: { projectId: activeProject.id, projectName: activeProject.name } } as never)}
              style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#8B5CF615', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Equipo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => sub.canUseEVM ? router.push({ pathname: '/evm/[projectId]', params: { projectId: activeProject.id, projectName: activeProject.name } } as never) : setPaywallFeature('EVM — Valor Ganado')}
              style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#22C55E15', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trending-up-outline" size={18} color="#22C55E" />
              </View>
              <Text style={[typography.bodySmall, { fontWeight: '600' }]}>EVM</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeProject && (
          <>
            {/* Stats rápidas del proyecto activo */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <StatCard colors={colors} typography={typography} label="Tareas" value={totalTasks} icon="checkbox-outline" color={colors.primary} />
              <StatCard colors={colors} typography={typography} label="Completadas" value={completedTasks} icon="checkmark-circle-outline" color={colors.success} />
              <StatCard colors={colors} typography={typography} label="Vencidas" value={overdueTasks} icon="alert-circle-outline" color={overdueTasks > 0 ? colors.danger : colors.textMuted} />
            </View>

            {/* Progreso con dona */}
            <SectionCard colors={colors}>
              <Text style={[typography.h4, { marginBottom: Spacing.lg }]}>Progreso de "{activeProject.name}"</Text>
              {totalTasks === 0 ? (
                <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg }]}>
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
              <SectionCard colors={colors}>
                <Text style={[typography.h4, { marginBottom: Spacing.lg }]}>Tareas por prioridad</Text>
                <HorizontalBarChart segments={prioritySegments} />
              </SectionCard>
            )}
          </>
        )}

        {/* Lista de proyectos */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <Text style={typography.h4}>Todos los proyectos</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/projects' as never)}>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {recentProjects.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/projects' as never)}
              style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm }}
            >
              <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} />
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Crea tu primer proyecto</Text>
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
                      backgroundColor: isActive ? colors.primaryMuted : colors.surfaceSecondary,
                      borderRadius: Radius.lg, borderWidth: isActive ? 1 : 0.5,
                      borderColor: isActive ? colors.primary : colors.border,
                      padding: Spacing.md,
                      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                    }}
                  >
                    <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: getStatusColor(project.status) }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { fontWeight: '500' }]} numberOfLines={1}>{project.name}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                        {getStatusLabel(project.status)}
                      </Text>
                    </View>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallFeature !== null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature ?? ''}
      />

      {/* Spinner overlay al generar PDF */}
      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, minWidth: 200 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.bodySmall, { fontWeight: '700' }]}>Generando reporte PDF...</Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>Esto puede tomar unos segundos</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
