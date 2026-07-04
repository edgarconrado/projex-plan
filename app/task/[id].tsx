import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTasks } from '../../src/hooks/useTasks';
import { useAuth } from '../../src/lib/AuthContext';
import { Spacing, Radius, getPriorityColor, getPriorityLabel, getStatusLabel } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { Avatar, Badge, LoadingOverlay } from '../../src/components/ui';
import { ChecklistSection } from '../../src/components/tasks/ChecklistSection';
import { EvidencePhotoModal } from '../../src/components/tasks/EvidencePhotoModal';
import { Task, TaskPriority, TaskStatus, Profile, TaskChecklistItem } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: '#6B7280' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'high', label: 'Alta', color: '#EF4444' },
  { value: 'critical', label: 'Crítica', color: '#7C3AED' },
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
  const { user } = useAuth();
  const { colors, typography } = useTheme();
  const { updateTask, deleteTask, toggleChecklistItem, addChecklistItem } = useTasks();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProjectRole, setUserProjectRole] = useState<string | null>(null);
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
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

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
      // Cargar miembros del proyecto
      supabase
        .from('project_members')
        .select('profile:profiles(id, full_name, avatar_url, role, email, is_online, created_at, updated_at)')
        .eq('project_id', task.project_id)
        .then(({ data }) => {
          if (data) setMembers(data.map((m: any) => m.profile).filter(Boolean) as Profile[]);
        });

      // Obtener el rol del usuario actual en este proyecto
      if (user) {
        supabase
          .from('project_members')
          .select('role')
          .eq('project_id', task.project_id)
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => {
            setUserProjectRole(data?.role ?? null);
          });
      }
    }
  }, [task?.project_id, user]);

  const handleUpdate = async (updates: Record<string, unknown>) => {
    if (!task) return;
    setSaving(true);
    try {
      console.log('[TaskDetail] Actualizando con:', JSON.stringify(updates));
      await updateTask(task.id, updates as any);
      await fetchTask();
    } catch (e: unknown) {
      console.log('[TaskDetail] ERROR completo:', JSON.stringify(e, Object.getOwnPropertyNames(e instanceof Error ? e : (e as object) ?? {})));
      const message =
        e instanceof Error
          ? e.message
          : (e as any)?.message || (e as any)?.error_description || (e as any)?.details || 'No se pudo actualizar';
      Alert.alert('Error', message);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={typography.h4}>Tarea no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: colors.primary }}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const priorityColor = getPriorityColor(task.priority);
  const completedCount = task.checklist?.filter((i) => i.is_completed).length ?? 0;
  const totalCount = task.checklist?.length ?? 0;

  // El viewer solo puede leer — no puede editar estado, prioridad, asignación ni campos
  const canEdit = userProjectRole !== 'viewer' &&
    (task.created_by === user?.id ||
     task.assigned_to === user?.id ||
     ['admin', 'project_manager', 'supervisor'].includes(userProjectRole ?? ''));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {task.project?.name ?? 'Tarea'}
        </Text>
        <TouchableOpacity onPress={handleDeleteTask}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                  fontSize: 22, fontWeight: '600', color: colors.textPrimary,
                  borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 4,
                }}
              />
            ) : (
              <TouchableOpacity onPress={() => setEditingTitle(true)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Text style={[typography.h2, { flex: 1 }]}>{task.title}</Text>
                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Badge label={getStatusLabel(task.status)} color={colors.primary} bgColor={colors.primaryMuted} size="md" />
            <Badge label={getPriorityLabel(task.priority)} color={priorityColor} bgColor={`${priorityColor}20`} size="md" />
          </View>

          <View>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Descripción</Text>
            {editingDescription ? (
              <TextInput
                value={description}
                onChangeText={setDescription}
                onBlur={handleSaveDescription}
                multiline
                autoFocus
                placeholder="Agrega una descripción..."
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: colors.primary, padding: Spacing.md,
                  color: colors.textPrimary, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setEditingDescription(true)}
                style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, minHeight: 60 }}
              >
                <Text style={[typography.body, { color: task.description ? colors.textPrimary : colors.textMuted }]}>
                  {task.description || 'Toca para agregar descripción...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Checklist — permite agregar/completar items y usar plantillas */}
          {task && (
            <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.lg }}>
              <ChecklistSection taskId={task.id} />

              {/* Foto de evidencia — se muestra si ya fue completada con foto */}
              {task.evidence_photo_url && (
                <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: `${colors.success}60`, padding: Spacing.md, gap: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Ionicons name="camera" size={16} color={colors.success} />
                    <Text style={[typography.bodySmall, { fontWeight: '700', color: colors.success }]}>Foto de evidencia</Text>
                  </View>
                  <Image
                    source={{ uri: task.evidence_photo_url }}
                    style={{ width: '100%', height: 180, borderRadius: Radius.md }}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}

          {/* Banner informativo para usuarios con rol viewer */}
          {!canEdit && userProjectRole !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}>
              <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                Solo tienes permisos de lectura en este proyecto
              </Text>
            </View>
          )}

          <View>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Estado</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => {
                    if (!canEdit) return;
                    if (s.value === 'completed') {
                      setShowEvidenceModal(true);
                    } else {
                      handleUpdate({ status: s.value, completed_at: null });
                    }
                  }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1,
                    borderColor: task.status === s.value ? colors.primary : colors.border,
                    backgroundColor: task.status === s.value ? colors.primaryMuted : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: task.status === s.value ? colors.primary : colors.textSecondary }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => canEdit && handleUpdate({ priority: p.value })}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center',
                    borderColor: task.priority === p.value ? p.color : colors.border,
                    backgroundColor: task.priority === p.value ? `${p.color}20` : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: task.priority === p.value ? p.color : colors.textMuted }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Asignado a</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => canEdit && handleUpdate({ assigned_to: null })}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1,
                    borderColor: !task.assigned_to ? colors.primary : colors.border,
                    backgroundColor: !task.assigned_to ? colors.primaryMuted : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: !task.assigned_to ? colors.primary : colors.textSecondary }}>
                    Sin asignar
                  </Text>
                </TouchableOpacity>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => canEdit && handleUpdate({ assigned_to: m.id })}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1,
                      borderColor: task.assigned_to === m.id ? colors.primary : colors.border,
                      backgroundColor: task.assigned_to === m.id ? colors.primaryMuted : 'transparent',
                    }}
                  >
                    <Avatar name={m.full_name} imageUrl={m.avatar_url} size={20} />
                    <Text style={{ fontSize: 13, fontWeight: '500', color: task.assigned_to === m.id ? colors.primary : colors.textSecondary }}>
                      {m.full_name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View>
            <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Fecha límite</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              onBlur={() => handleUpdate({ due_date: dueDate.trim() || null })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md,
                borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.md,
                paddingVertical: 12, color: colors.textPrimary, fontSize: 14,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Piso</Text>
              <TextInput
                value={floor}
                onChangeText={setFloor}
                onBlur={() => handleUpdate({ floor: floor.trim() || null })}
                placeholder="Planta baja"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, color: colors.textPrimary, fontSize: 14 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 8 }]}>Zona</Text>
              <TextInput
                value={zone}
                onChangeText={setZone}
                onBlur={() => handleUpdate({ zone: zone.trim() || null })}
                placeholder="Sector A"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.md, paddingVertical: 12, color: colors.textPrimary, fontSize: 14 }}
              />
            </View>
          </View>

          <View style={{ gap: 6, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: colors.border }}>
            {task.creator && (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Creada por {task.creator.full_name} · {format(new Date(task.created_at), "d MMM yyyy, HH:mm", { locale: es })}
              </Text>
            )}
            {task.completed_at && (
              <Text style={[typography.caption, { color: colors.success }]}>
                Completada el {format(new Date(task.completed_at), "d MMM yyyy, HH:mm", { locale: es })}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {saving && (
        <View style={{
          position: 'absolute', top: 70, right: Spacing.lg,
          backgroundColor: colors.surface, borderRadius: Radius.full,
          paddingHorizontal: 12, paddingVertical: 6,
          borderWidth: 0.5, borderColor: colors.border,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <Ionicons name="cloud-upload-outline" size={12} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.primary }]}>Guardando...</Text>
        </View>
      )}

      {task && (
        <EvidencePhotoModal
          visible={showEvidenceModal}
          taskTitle={task.title}
          projectId={task.project_id}
          onConfirm={async (photoUrl) => {
            setShowEvidenceModal(false);
            await handleUpdate({
              status: 'completed',
              completed_at: new Date().toISOString(),
              evidence_photo_url: photoUrl,
            });
          }}
          onSkip={async () => {
            setShowEvidenceModal(false);
            await handleUpdate({
              status: 'completed',
              completed_at: new Date().toISOString(),
            });
          }}
          onClose={() => setShowEvidenceModal(false)}
        />
      )}
    </SafeAreaView>
  );
}
