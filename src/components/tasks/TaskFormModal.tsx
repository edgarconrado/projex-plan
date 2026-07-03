import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority, TaskStatus, CreateTaskDTO, Profile } from '../../types';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { Button, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import { useChecklistTemplates } from '../../hooks/useChecklist';
import { useProjectStore } from '../../stores';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDTO | Partial<Task>) => Promise<void>;
  projectId: string;
  initialData?: Task | null;
}

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
];

export function TaskFormModal({ visible, onClose, onSubmit, projectId, initialData }: TaskFormModalProps) {
  const { colors, typography } = useTheme();
  const isEditing = !!initialData;

  // Resetear todos los campos cuando se abre el modal para CREAR (no editar)
  useEffect(() => {
    if (visible && !isEditing) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('pending');
      setDueDate('');
      setFloor('');
      setZone('');
      setAssignedTo('');
      setChecklistItems([]);
      setNewCheckItem('');
      setShowTemplateList(false);
      setShowSaveTemplateInForm(false);
      setTemplateNameInForm('');
      setError('');
    }
  }, [visible]);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status ?? 'pending');
  const [dueDate, setDueDate] = useState(initialData?.due_date ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { activeProjectId } = useProjectStore();
  const { templates, saveTemplate } = useChecklistTemplates(activeProjectId ?? undefined);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showSaveTemplateInForm, setShowSaveTemplateInForm] = useState(false);
  const [templateNameInForm, setTemplateNameInForm] = useState('');
  const [floor, setFloor] = useState(initialData?.floor ?? '');
  const [zone, setZone] = useState(initialData?.zone ?? '');
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to ?? '');
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && projectId) {
      supabase
        .from('project_members')
        .select('profile:profiles(id, full_name, avatar_url, role, email, is_online, created_at, updated_at)')
        .eq('project_id', projectId)
        .then(({ data }) => {
          if (data) setMembers(data.map((m: any) => m.profile).filter(Boolean) as Profile[]);
        });
    }
  }, [visible, projectId]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('El título es requerido'); return; }
    setError(''); setLoading(true);
    try {
      console.log('[TaskForm] Enviando:', {
        project_id: projectId,
        title: title.trim(),
        priority, status,
        assigned_to: assignedTo || null,
      });
      const createdTask = await onSubmit({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
        due_date: dueDate.trim() || null,
        floor: floor.trim() || null,
        zone: zone.trim() || null,
        assigned_to: assignedTo || null,
        estimated_hours: null,
      });
      console.log('[TaskForm] Éxito');

      // Si se definieron items de checklist antes de crear la tarea, los guardamos ahora
      console.log('[TaskForm] checklistItems al guardar:', checklistItems);
      if (createdTask?.id && checklistItems.length > 0) {
        const { error: clError } = await supabase.from('task_checklist').insert(
          checklistItems.map((text, idx) => ({
            task_id: createdTask.id,
            item: text,
            is_completed: false,
            order_index: idx,
          }))
        );
        console.log('[TaskForm] checklist insert error:', JSON.stringify(clError));
      }

      onClose();
    } catch (e: unknown) {
      console.log('[TaskForm] ERROR COMPLETO:', JSON.stringify(e, null, 2));
      console.log('[TaskForm] ERROR message:', e instanceof Error ? e.message : String(e));
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={typography.h4}>{isEditing ? 'Editar tarea' : 'Nueva tarea'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={{ backgroundColor: colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: colors.danger }}>
              <Text style={[typography.bodySmall, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Ej. Revisar cimentación piso 3"
            leftIcon={<Ionicons name="checkbox-outline" size={18} color={colors.textMuted} />} />

          <Input label="Descripción" value={description} onChangeText={setDescription} placeholder="Detalles de la tarea..."
            multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top', paddingTop: 8 }} />

          {/* Prioridad */}
          <View style={{ gap: 8 }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity key={p.value} onPress={() => setPriority(p.value)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center',
                    borderColor: priority === p.value ? p.color : colors.border,
                    backgroundColor: priority === p.value ? `${p.color}20` : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: priority === p.value ? p.color : colors.textMuted }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={{ gap: 8 }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Estado</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map((s) => (
                <TouchableOpacity key={s.value} onPress={() => setStatus(s.value)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                    borderColor: status === s.value ? colors.primary : colors.border,
                    backgroundColor: status === s.value ? colors.primaryMuted : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: status === s.value ? colors.primary : colors.textSecondary }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Asignar */}
          {members.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>Asignar a</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => setAssignedTo('')}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                      borderColor: !assignedTo ? colors.primary : colors.border,
                      backgroundColor: !assignedTo ? colors.primaryMuted : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: !assignedTo ? colors.primary : colors.textSecondary }}>
                      Sin asignar
                    </Text>
                  </TouchableOpacity>
                  {members.map((m) => (
                    <TouchableOpacity key={m.id} onPress={() => setAssignedTo(m.id)}
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                        borderColor: assignedTo === m.id ? colors.primary : colors.border,
                        backgroundColor: assignedTo === m.id ? colors.primaryMuted : 'transparent' }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: assignedTo === m.id ? colors.primary : colors.textSecondary }}>
                        {m.full_name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: 6 }]}>Fecha límite</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md,
                borderWidth: 0.5, borderColor: colors.border,
                paddingHorizontal: Spacing.md, paddingVertical: 14,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={{ color: dueDate ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
                {dueDate
                  ? new Date(dueDate + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Selecciona una fecha'}
              </Text>
              {dueDate ? (
                <TouchableOpacity onPress={() => setDueDate('')} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate + 'T00:00:00') : new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  const iso = selectedDate.toISOString().split('T')[0];
                  setDueDate(iso);
                }
              }}
            />
          )}

          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Piso" value={floor} onChangeText={setFloor} placeholder="Planta baja"
                leftIcon={<Ionicons name="layers-outline" size={18} color={colors.textMuted} />} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Zona" value={zone} onChangeText={setZone} placeholder="Sector A"
                leftIcon={<Ionicons name="map-outline" size={18} color={colors.textMuted} />} />
            </View>
          </View>

          {/* Checklist — solo en creación, no en edición (edición tiene su propio ChecklistSection) */}
          {!isEditing && (
            <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
                  <Text style={[typography.bodySmall, { fontWeight: '700' }]}>
                    Checklist {checklistItems.length > 0 ? `(${checklistItems.length})` : '(opcional)'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {checklistItems.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowSaveTemplateInForm(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.primary, backgroundColor: colors.primaryMuted }}
                    >
                      <Ionicons name="bookmark" size={12} color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Guardar plantilla</Text>
                    </TouchableOpacity>
                  )}
                  {templates.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowTemplateList(!showTemplateList)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.primary }}
                    >
                      <Ionicons name="copy-outline" size={12} color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Plantillas ({templates.length})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Lista de plantillas disponibles */}
              {showTemplateList && (
                <View style={{ gap: Spacing.xs }}>
                  {templates.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => {
                        setChecklistItems((t.items as { text: string }[]).map(i => i.text));
                        setShowTemplateList(false);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.sm }}
                    >
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{t.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{t.items.length} elementos</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Items del checklist */}
              {checklistItems.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="square-outline" size={18} color={colors.textMuted} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary }}>{item}</Text>
                  <TouchableOpacity onPress={() => setChecklistItems((prev) => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Input nuevo item */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <TextInput
                  value={newCheckItem}
                  onChangeText={setNewCheckItem}
                  placeholder="Agregar elemento..."
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (newCheckItem.trim()) {
                      setChecklistItems((prev) => [...prev, newCheckItem.trim()]);
                      setNewCheckItem('');
                    }
                  }}
                  style={{ flex: 1, fontSize: 13, color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
                />
                {newCheckItem.trim().length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setChecklistItems((prev) => [...prev, newCheckItem.trim()]);
                    setNewCheckItem('');
                  }}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <Button label={isEditing ? 'Guardar cambios' : 'Crear tarea'} onPress={handleSubmit} loading={loading} size="lg" style={{ marginTop: Spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal guardar plantilla desde formulario de creación */}
      <Modal visible={showSaveTemplateInForm} transparent animationType="fade" onRequestClose={() => setShowSaveTemplateInForm(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: Spacing.xl }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md }}>
            <Text style={typography.h4}>Guardar como plantilla</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Se guardarán {checklistItems.length} elemento{checklistItems.length !== 1 ? 's' : ''}.
            </Text>
            <TextInput
              value={templateNameInForm}
              onChangeText={setTemplateNameInForm}
              placeholder="Nombre de la plantilla..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14 }}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                onPress={() => { setShowSaveTemplateInForm(false); setTemplateNameInForm(''); }}
                style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!templateNameInForm.trim()) return;
                  await saveTemplate(templateNameInForm, checklistItems.map(text => ({ text })));
                  setShowSaveTemplateInForm(false);
                  setTemplateNameInForm('');
                }}
                disabled={!templateNameInForm.trim()}
                style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: colors.primary, alignItems: 'center', opacity: templateNameInForm.trim() ? 1 : 0.5 }}
              >
                <Text style={{ color: colors.textInverse, fontWeight: '700' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
