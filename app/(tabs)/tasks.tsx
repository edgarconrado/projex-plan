import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../../src/hooks/useTasks';
import { useProjects } from '../../src/hooks/useProjects';
import { useProjectStore } from '../../src/stores';
import { TaskItem } from '../../src/components/tasks/TaskItem';
import { TaskFormModal } from '../../src/components/tasks/TaskFormModal';
import { Colors, Typography, Spacing, Radius } from '../../src/lib/theme';
import { EmptyState } from '../../src/components/ui';
import { TaskItemSkeleton } from '../../src/components/ui/SkeletonLoader';
import { Task, TaskPriority, TaskStatus } from '../../src/types';

const STATUS_FILTERS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completadas' },
];

const PRIORITY_FILTERS: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

export default function TasksScreen() {
  const { tasks, isLoading, fetchTasks, createTask, toggleTaskStatus, deleteTask } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  useEffect(() => { fetchTasks(); fetchProjects(); }, [fetchTasks, fetchProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, [fetchTasks]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const filtered = tasks.filter((t) => {
    if (!activeProjectId) return false;
    if (t.project_id !== activeProjectId) return false;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleDelete = (task: Task) => {
    Alert.alert('Eliminar tarea', `¿Eliminar "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await deleteTask(task); } catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Error'); } } },
    ]);
  };

  const handleCreateTask = async (dto: any) => {
    await createTask(dto);
    await fetchTasks();
  };

  if (!activeProjectId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg }}>
          <Ionicons name="briefcase-outline" size={48} color={Colors.textMuted} />
          <Text style={[Typography.h4, { textAlign: 'center' }]}>Selecciona un proyecto activo</Text>
          <Text style={[Typography.bodySmall, { textAlign: 'center', color: Colors.textMuted }]}>
            Ve a la pestaña Proyectos y toca "Hacer activo" en el proyecto que quieras ver
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/projects' as never)}
            style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md, marginTop: Spacing.sm }}
          >
            <Text style={{ color: Colors.textInverse, fontWeight: '600' }}>Ir a Proyectos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={Typography.h2}>Tareas</Text>
            <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>{filtered.length} tarea{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
          {/* Botón crear tarea */}
          <TouchableOpacity
            onPress={() => setTaskModalVisible(true)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={24} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setPickerVisible((v) => !v)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
            backgroundColor: Colors.primaryMuted, borderWidth: 0.5, borderColor: Colors.primary,
            borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
            marginBottom: Spacing.md,
          }}
        >
          <Ionicons name="briefcase" size={16} color={Colors.primary} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary }} numberOfLines={1}>
            {activeProject?.name ?? 'Proyecto'}
          </Text>
          <Ionicons name={pickerVisible ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
        </TouchableOpacity>

        {pickerVisible && (
          <View style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' }}>
            {projects.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => { setActiveProjectId(p.id); setPickerVisible(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                  paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                  backgroundColor: p.id === activeProjectId ? Colors.primaryMuted : 'transparent',
                  borderBottomWidth: 0.5, borderBottomColor: Colors.border,
                }}
              >
                {p.id === activeProjectId && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
                <Text style={{ fontSize: 13, color: p.id === activeProjectId ? Colors.primary : Colors.textPrimary, fontWeight: p.id === activeProjectId ? '600' : '400' }}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md }}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Buscar tarea..." placeholderTextColor={Colors.textMuted} style={{ flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 12 }} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>

        <FlatList horizontal data={STATUS_FILTERS} keyExtractor={(i) => i.value} showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setStatusFilter(item.value)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginRight: 8, borderWidth: 1, borderColor: statusFilter === item.value ? Colors.primary : Colors.border, backgroundColor: statusFilter === item.value ? Colors.primaryMuted : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: statusFilter === item.value ? Colors.primary : Colors.textSecondary }}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
        <FlatList horizontal data={PRIORITY_FILTERS} keyExtractor={(i) => i.value} showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setPriorityFilter(item.value)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginRight: 8, borderWidth: 1, borderColor: priorityFilter === item.value ? Colors.primary : Colors.border, backgroundColor: priorityFilter === item.value ? Colors.primaryMuted : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: priorityFilter === item.value ? Colors.primary : Colors.textSecondary }}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading && tasks.length === 0 ? (
        <View style={{ paddingHorizontal: Spacing.lg }}>{[1, 2, 3, 4].map((i) => <TaskItemSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={filtered} keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="checkbox-outline" size={48} color={Colors.textMuted} />}
              title={search ? 'Sin resultados' : 'Sin tareas'}
              subtitle={search ? 'Intenta con otro término' : `Toca + para crear la primera tarea de ${activeProject?.name ?? 'este proyecto'}`}
            />
          }
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              showProject={false}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } } as never)}
              onToggle={() => toggleTaskStatus(item)}
            />
          )}
        />
      )}

      {/* Modal crear tarea — usa el proyecto activo automáticamente */}
      <TaskFormModal
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        onSubmit={handleCreateTask}
        projectId={activeProjectId}
      />
    </SafeAreaView>
  );
}
