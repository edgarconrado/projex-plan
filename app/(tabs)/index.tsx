import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/AuthContext';
import { useProjects } from '../../src/hooks/useProjects';
import { useProjectStore } from '../../src/stores';
import { Colors, Typography, Spacing, Radius, getStatusColor, getStatusLabel } from '../../src/lib/theme';
import { ProgressBar, Avatar } from '../../src/components/ui';

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

export default function DashboardScreen() {
  const { profile } = useAuth();
  const { projects, fetchProjects } = useProjects();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeProjects = projects.filter((p) => p.status === 'in_progress');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const recentProjects = [...projects].slice(0, 4);

  const avgProgress = projects.length
    ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
          <View>
            <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>{greeting},</Text>
            <Text style={Typography.h2}>{profile?.full_name?.split(' ')[0] ?? 'Usuario'} 👋</Text>
          </View>
          {profile && <Avatar name={profile.full_name} size={44} />}
        </View>

        {/* Proyecto activo — destacado arriba */}
        {activeProject ? (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/tasks' as never)}
            style={{
              backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg,
              borderWidth: 1, borderColor: Colors.primary,
              padding: Spacing.lg, marginBottom: Spacing.xl,
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
              padding: Spacing.lg, marginBottom: Spacing.xl,
              flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.textMuted} />
            <Text style={[Typography.bodySmall, { color: Colors.textMuted, flex: 1 }]}>
              Selecciona un proyecto activo para empezar
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }}>
          <StatCard label="Proyectos" value={projects.length} icon="briefcase-outline" color={Colors.primary} />
          <StatCard label="Activos" value={activeProjects.length} icon="flash-outline" color={Colors.statusActive} />
          <StatCard label="Completados" value={completedProjects.length} icon="checkmark-circle-outline" color={Colors.statusCompleted} />
        </View>

        {projects.length > 0 && (
          <View style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              <Text style={Typography.h4}>Progreso general</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.primary }}>{avgProgress}%</Text>
            </View>
            <ProgressBar value={avgProgress} height={8} />
            <Text style={[Typography.caption, { marginTop: Spacing.sm, color: Colors.textMuted }]}>
              Promedio de {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
            </Text>
          </View>
        )}

        <View style={{ marginBottom: Spacing.lg }}>
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
            recentProjects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => setActiveProjectId(project.id)}
                  style={{
                    backgroundColor: isActive ? Colors.primaryMuted : Colors.surfaceSecondary,
                    borderRadius: Radius.lg, borderWidth: isActive ? 1 : 0.5,
                    borderColor: isActive ? Colors.primary : Colors.border,
                    padding: Spacing.md, marginBottom: Spacing.sm,
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                  }}
                >
                  <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: getStatusColor(project.status) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.body, { fontWeight: '500' }]} numberOfLines={1}>{project.name}</Text>
                    <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                      {getStatusLabel(project.status)} · {project.progress}%
                    </Text>
                    <ProgressBar value={project.progress} height={3} color={getStatusColor(project.status)} style={{ marginTop: 6 }} />
                  </View>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
