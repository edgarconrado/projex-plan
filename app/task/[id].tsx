import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTasks } from '../../src/hooks/useTasks';
import { Colors, Typography, Spacing, Radius, getPriorityColor, getPriorityLabel, getStatusLabel } from '../../src/lib/theme';
import { Avatar, Badge, LoadingOverlay } from '../../src/components/ui';
import { Task, TaskPriority, TaskStatus, Profile, TaskChecklistItem } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: Colors.priorityLow },
  { value: 'medium', label: 'Media', color: Colors.priorityMedium },
  { value: 'high', label: 'Alta', color: Colors.priorityHigh },
  { value: 'urgent', label: 'Urgente', color: Colors.priorityUrgent },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateTask, deleteTask, toggleChecklistItem, addChecklistItem } = useTasks();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<Profile[]>([]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('');
  const [zone, setZone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTask = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, role),
        creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
        checklist:task_checklist(*),
        project:projects(id, name)
      `)
      .eq('id', id)
      .single();
    if (!error && data) {
      setTask(data as Task);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setFloor(data.floor ?? '');
      setZone(data.zone ?? '');
      setDueDate(data.due_date ?? '');
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchTask(); }, [id]);

  useEffect(() => {
    if (task?.project_id) {
      supabase
        .from('project_members')
        .select('profile:profiles(id, full_name, avatar_url, role, email, is_online, created_at, updated_at)')
        .eq('project_id', task.project_id)
        .then(({ data }) => {
          if (data) setMembers(data.map((m: any) => m.profile).filter(Boolean) as Profile[]);
        });
    }
  }, [task?.project_id]);

  const handleUpdate = async (updates: Record<string, unknown>) => {
    if (!task) return;
    setSaving(true);
    try {
      console.log('[TaskDetail] Actualizando:', task.id, JSON.stringify(updates));
      await updateTask(task.id, updates as any);
      await fetchTask();
    } catch (e: unknown) {
      console.log('[TaskDetail] ERROR:', JSON.stringify(e, null, 2));
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) { setTitle(task?.title ?? ''); setEditingTitle(false); return; }
    await handleUpdate({ title: title.trim() });
    setEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    await handleUpdate({ description: description.trim() || null });
    setEditingDescription(false);
  };

  const handleToggleChecklistItem = async (item: TaskChecklistItem) => {
    await toggleChecklistItem(item.id, !item.is_completed);
    await fetchTask();
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !task) return;
    const orderIndex = (task.checklist?.length ?? 0);
    await addChecklistItem(task.id, newChecklistItem.trim(), orderIndex);
    setNewChecklistItem('');
    await fetchTask();
  };

  const handleDeleteTask = () => {
    if (!task) return;
    Alert.alert('Eliminar tarea', `¿Eliminar "${task.title}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(task);
            router.back();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingOverlay message="Cargando tarea..." />;
  if (!task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={Typography.h4}>Tarea no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.primary }}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const priorityColor = getPriorityColor(task.priority);
  const completedCount = task.checklist?.filter((i) => i.is_completed).length ?? 0;
  const totalCount = task.checklist?.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[Typography.caption, { color: Colors.textMuted }]}>
          {task.project?.name ?? 'Tarea'}
        </Text>
        <TouchableOpacity onPress={handleDeleteTask}>
          <Ionicons name="trash-outline" size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View>
            {editingTitle ? (
              <TextInput
                value={title}
                onChangeText={setTitle}
                onBlur={handleSaveTitle}
                onSubmitEditing={handleSaveTitle}
                autoFocus
                style={{
                  fontSize: 22, fontWeight: '600', color: Colors.textPrimary,
                  borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 4,
                }}
              />
            ) : (
              <TouchableOpacity onPress={() => setEditingTitle(true)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Text style={[Typography.h2, { flex: 1 }]}>{task.title}</Text>
                <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Badge label={getStatusLabel(task.status)} color={Colors.primary} bgColor={Colors.primaryMuted} size="md" />
            <Badge label={getPriorityLabel(task.priority)} color={priorityColor} bgColor={`${priorityColor}20`} size="md" />
          </View>

          <View>
            <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Descripción</Text>
            {editingDescription ? (
              <TextInput
                value={description}
                onChangeText={setDescription}
                onBlur={handleSaveDescription}
                multiline
                autoFocus
                placeholder="Agrega una descripción..."
                placeholderTextColor={Colors.textMuted}
                style={{
                  backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.primary, padding: Spacing.md,
                  color: Colors.textPrimary, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setEditingDescription(true)}
                style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, minHeight: 60 }}
              >
                <Text style={[Typography.body, { color: task.description ? Colors.textPrimary : Colors.textMuted }]}>
                  {task.description || 'Toca para agregar descripción...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View>
            <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Estado</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => handleUpdate({ status: s.value, completed_at: s.value === 'completed' ? new Date().toISOString() : null })}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1,
                    borderColor: task.status === s.value ? Colors.primary : Colors.border,
                    backgroundColor: task.status === s.value ? Colors.primaryMuted : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: task.status === s.value ? Colors.primary : Colors.textSecondary }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => handleUpdate({ priority: p.value })}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center',
                    borderColor: task.priority === p.value ? p.color : Colors.border,
                    backgroundColor: task.priority === p.value ? `${p.color}20` : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: task.priority === p.value ? p.color : Colors.textMuted }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Asignado a</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleUpdate({ assigned_to: null })}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1,
                    borderColor: !task.assigned_to ? Colors.primary : Colors.border,
                    backgroundColor: !task.assigned_to ? Colors.primaryMuted : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: !task.assigned_to ? Colors.primary : Colors.textSecondary }}>
                    Sin asignar
                  </Text>
                </TouchableOpacity>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => handleUpdate({ assigned_to: m.id })}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1,
                      borderColor: task.assigned_to === m.id ? Colors.primary : Colors.border,
                      backgroundColor: task.assigned_to === m.id ? Colors.primaryMuted : 'transparent',
                    }}
                  >
                    <Avatar name={m.full_name} size={20} />
                    <Text style={{ fontSize: 13, fontWeight: '500', color: task.assigned_to === m.id ? Colors.primary : Colors.textSecondary }}>
                      {m.full_name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[Typography.label, { color: Colors.textSecondary }]}>Checklist</Text>
              {totalCount > 0 && (
                <Text style={[Typography.caption, { color: completedCount === totalCount ? Colors.success : Colors.textMuted }]}>
                  {completedCount}/{totalCount}
                </Text>
              )}
            </View>

            <View style={{ gap: 6 }}>
              {(task.checklist ?? [])
                .sort((a, b) => a.order_index - b.order_index)
                .map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleToggleChecklistItem(item)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                      backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
                      borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.sm,
                    }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 5,
                      borderWidth: item.is_completed ? 0 : 1.5,
                      borderColor: Colors.border,
                      backgroundColor: item.is_completed ? Colors.success : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.is_completed && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <Text style={[
                      Typography.bodySmall,
                      { flex: 1, color: Colors.textPrimary },
                      item.is_completed && { textDecorationLine: 'line-through', color: Colors.textMuted },
                    ]}>
                      {item.item}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <TextInput
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                placeholder="Agregar punto..."
                placeholderTextColor={Colors.textMuted}
                onSubmitEditing={handleAddChecklistItem}
                style={{
                  flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
                  borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md,
                  paddingVertical: 10, color: Colors.textPrimary, fontSize: 13,
                }}
              />
              <TouchableOpacity
                onPress={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
                style={{
                  width: 38, height: 38, borderRadius: Radius.md,
                  backgroundColor: newChecklistItem.trim() ? Colors.primary : Colors.surfaceSecondary,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={20} color={newChecklistItem.trim() ? Colors.textInverse : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Fecha límite</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              onBlur={() => handleUpdate({ due_date: dueDate.trim() || null })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              style={{
                backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
                borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md,
                paddingVertical: 12, color: Colors.textPrimary, fontSize: 14,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Piso</Text>
              <TextInput
                value={floor}
                onChangeText={setFloor}
                onBlur={() => handleUpdate({ floor: floor.trim() || null })}
                placeholder="Planta baja"
                placeholderTextColor={Colors.textMuted}
                style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.textPrimary, fontSize: 14 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: Colors.textSecondary, marginBottom: 8 }]}>Zona</Text>
              <TextInput
                value={zone}
                onChangeText={setZone}
                onBlur={() => handleUpdate({ zone: zone.trim() || null })}
                placeholder="Sector A"
                placeholderTextColor={Colors.textMuted}
                style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.textPrimary, fontSize: 14 }}
              />
            </View>
          </View>

          <View style={{ gap: 6, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.border }}>
            {task.creator && (
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                Creada por {task.creator.full_name} · {format(new Date(task.created_at), "d MMM yyyy, HH:mm", { locale: es })}
              </Text>
            )}
            {task.completed_at && (
              <Text style={[Typography.caption, { color: Colors.success }]}>
                Completada el {format(new Date(task.completed_at), "d MMM yyyy, HH:mm", { locale: es })}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {saving && (
        <View style={{
          position: 'absolute', top: 70, right: Spacing.lg,
          backgroundColor: Colors.surface, borderRadius: Radius.full,
          paddingHorizontal: 12, paddingVertical: 6,
          borderWidth: 0.5, borderColor: Colors.border,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <Ionicons name="cloud-upload-outline" size={12} color={Colors.primary} />
          <Text style={[Typography.caption, { color: Colors.primary }]}>Guardando...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
