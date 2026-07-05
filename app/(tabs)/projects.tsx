import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects } from '../../src/hooks/useProjects';
import { useProjectStore } from '../../src/stores';
import { useAuth } from '../../src/lib/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { useTasks } from '../../src/hooks/useTasks';
import { useReport } from '../../src/hooks/useReport';
import { ProjectCard } from '../../src/components/tasks/ProjectCard';
import { ProjectFormModal } from '../../src/components/tasks/ProjectFormModal';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { EmptyState } from '../../src/components/ui';
import { ProjectCardSkeleton } from '../../src/components/ui/SkeletonLoader';
import { Project, ProjectStatus } from '../../src/types';

const STATUS_FILTERS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'planning', label: 'Planeación' },
  { value: 'on_hold', label: 'En pausa' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completados' },
];

export default function ProjectsScreen() {
  const { colors, typography } = useTheme();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { projects, isLoading, fetchProjects, createProject, updateProject, deleteProject } = useProjects();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const { tasks } = useTasks();
  const { generateReport, isGenerating } = useReport();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Cargar los roles del usuario en todos sus proyectos
  useEffect(() => {
    if (!user) return;
    supabase
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const roles: Record<string, string> = {};
        (data ?? []).forEach((m: any) => { roles[m.project_id] = m.role; });
        setUserRoles(roles);
      });
  }, [user?.id]);

  const canGeneratePDF = (project: Project) =>
    project.created_by === user?.id ||
    ['admin', 'project_manager', 'supervisor'].includes(userRoles[project.id] ?? '');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.city ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleLeave = (project: Project) => {
    Alert.alert(
      'Dejar proyecto',
      `¿Estás seguro de que quieres salir de "${project.name}"?\n\nYa no podrás ver este proyecto hasta que alguien te vuelva a invitar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dejar proyecto',
          style: 'destructive',
          onPress: async () => {
            try {
              const { supabase } = await import('../../src/lib/supabase');
              await supabase
                .from('project_members')
                .delete()
                .eq('project_id', project.id)
                .eq('user_id', user?.id);
              await fetchProjects();
            } catch {
              Alert.alert('Error', 'No se pudo salir del proyecto. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (project: Project) => {
    if (project.created_by !== user?.id) {
      Alert.alert('Sin permiso', 'Solo el creador del proyecto puede eliminarlo.');
      return;
    }
    Alert.alert('Eliminar proyecto', `¿Estás seguro de eliminar "${project.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await deleteProject(project.id); }
          catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Error al eliminar'); }
        },
      },
    ]);
  };

  const handleSetActive = (project: Project) => {
    setActiveProjectId(project.id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
          <Text style={typography.h2}>Proyectos</Text>
          <TouchableOpacity
            onPress={() => { setEditingProject(null); setModalVisible(true); }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md }}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Buscar proyecto..." placeholderTextColor={colors.textMuted} style={{ flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 12 }} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></TouchableOpacity> : null}
        </View>

        <FlatList
          horizontal data={STATUS_FILTERS} keyExtractor={(i) => i.value}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setStatusFilter(item.value)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, marginRight: 8, borderWidth: 1, borderColor: statusFilter === item.value ? colors.primary : colors.border, backgroundColor: statusFilter === item.value ? colors.primaryMuted : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: statusFilter === item.value ? colors.primary : colors.textSecondary }}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading && projects.length === 0 ? (
        <View style={{ paddingHorizontal: Spacing.lg }}>{[1, 2, 3].map((i) => <ProjectCardSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />}
              title={search ? 'Sin resultados' : 'Sin proyectos'}
              subtitle={search ? 'Intenta con otro término' : 'Crea tu primer proyecto tocando el botón +'}
            />
          }
          renderItem={({ item }) => {
            const isActive = activeProjectId === item.id;
            return (
              <View style={{ marginBottom: Spacing.sm }}>
                <View style={{ position: 'relative' }}>
                  <ProjectCard project={item} onPress={() => handleSetActive(item)} />
                  {isActive && (
                    <View style={{
                      position: 'absolute', top: Spacing.lg, right: Spacing.lg,
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3,
                      borderRadius: Radius.full,
                    }}>
                      <Ionicons name="checkmark-circle" size={11} color={colors.textInverse} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textInverse }}>ACTIVO</Text>
                    </View>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: -Spacing.xs, marginBottom: Spacing.sm }}
                  contentContainerStyle={{ flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.xs }}
                >
                  {!isActive && (
                    <TouchableOpacity
                      onPress={() => handleSetActive(item)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.primary }}
                    >
                      <Ionicons name="star-outline" size={13} color={colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Hacer activo</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/plans/[projectId]', params: { projectId: item.id, projectName: item.name } } as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.border }}
                  >
                    <Ionicons name="map-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>Planos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/documents/[projectId]', params: { projectId: item.id, projectName: item.name } } as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.border }}
                  >
                    <Ionicons name="folder-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>Docs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setEditingProject(item); setModalVisible(true); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.border }}
                  >
                    <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>Editar</Text>
                  </TouchableOpacity>
                  {canGeneratePDF(item) && (
                    <TouchableOpacity
                      onPress={() => generateReport(item, tasks)}
                      disabled={isGenerating}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.border, opacity: isGenerating ? 0.6 : 1 }}
                    >
                      <Ionicons name="document-text-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>PDF</Text>
                    </TouchableOpacity>
                  )}
                  {item.created_by === user?.id ? (
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.dangerMuted, borderWidth: 0.5, borderColor: colors.danger }}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.danger }}>Eliminar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleLeave(item)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 0.5, borderColor: colors.textMuted }}
                    >
                      <Ionicons name="log-out-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>Salir</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            );
          }}
        />
      )}

      <ProjectFormModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingProject(null); }}
        onSubmit={editingProject ? (dto) => updateProject(editingProject.id, dto) : createProject}
        initialData={editingProject}
      />

      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, minWidth: 200 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.bodySmall, { fontWeight: '700', color: colors.textPrimary }]}>Generando reporte PDF...</Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>Esto puede tomar unos segundos</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
