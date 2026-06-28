import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority, TaskStatus, CreateTaskDTO, Profile } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { Button, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDTO | Partial<Task>) => Promise<void>;
  projectId: string;
  initialData?: Task | null;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: Colors.priorityLow },
  { value: 'medium', label: 'Media', color: Colors.priorityMedium },
  { value: 'high', label: 'Alta', color: Colors.priorityHigh },
  { value: 'critical', label: 'Crítica', color: Colors.priorityUrgent },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completada' },
];

export function TaskFormModal({ visible, onClose, onSubmit, projectId, initialData }: TaskFormModalProps) {
  const isEditing = !!initialData;
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status ?? 'pending');
  const [dueDate, setDueDate] = useState(initialData?.due_date ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
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
      await onSubmit({
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
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={Typography.h4}>{isEditing ? 'Editar tarea' : 'Nueva tarea'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={{ backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.danger }}>
              <Text style={[Typography.bodySmall, { color: Colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Ej. Revisar cimentación piso 3"
            leftIcon={<Ionicons name="checkbox-outline" size={18} color={Colors.textMuted} />} />

          <Input label="Descripción" value={description} onChangeText={setDescription} placeholder="Detalles de la tarea..."
            multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top', paddingTop: 8 }} />

          {/* Prioridad */}
          <View style={{ gap: 8 }}>
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity key={p.value} onPress={() => setPriority(p.value)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center',
                    borderColor: priority === p.value ? p.color : Colors.border,
                    backgroundColor: priority === p.value ? `${p.color}20` : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: priority === p.value ? p.color : Colors.textMuted }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={{ gap: 8 }}>
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Estado</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUSES.map((s) => (
                <TouchableOpacity key={s.value} onPress={() => setStatus(s.value)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                    borderColor: status === s.value ? Colors.primary : Colors.border,
                    backgroundColor: status === s.value ? Colors.primaryMuted : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: status === s.value ? Colors.primary : Colors.textSecondary }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Asignar */}
          {members.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[Typography.label, { color: Colors.textSecondary }]}>Asignar a</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => setAssignedTo('')}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                      borderColor: !assignedTo ? Colors.primary : Colors.border,
                      backgroundColor: !assignedTo ? Colors.primaryMuted : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: !assignedTo ? Colors.primary : Colors.textSecondary }}>
                      Sin asignar
                    </Text>
                  </TouchableOpacity>
                  {members.map((m) => (
                    <TouchableOpacity key={m.id} onPress={() => setAssignedTo(m.id)}
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                        borderColor: assignedTo === m.id ? Colors.primary : Colors.border,
                        backgroundColor: assignedTo === m.id ? Colors.primaryMuted : 'transparent' }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: assignedTo === m.id ? Colors.primary : Colors.textSecondary }}>
                        {m.full_name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginBottom: 6 }]}>Fecha límite</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
                borderWidth: 0.5, borderColor: Colors.border,
                paddingHorizontal: Spacing.md, paddingVertical: 14,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
              <Text style={{ color: dueDate ? Colors.textPrimary : Colors.textMuted, fontSize: 15 }}>
                {dueDate
                  ? new Date(dueDate + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Selecciona una fecha'}
              </Text>
              {dueDate ? (
                <TouchableOpacity onPress={() => setDueDate('')} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
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
                leftIcon={<Ionicons name="layers-outline" size={18} color={Colors.textMuted} />} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Zona" value={zone} onChangeText={setZone} placeholder="Sector A"
                leftIcon={<Ionicons name="map-outline" size={18} color={Colors.textMuted} />} />
            </View>
          </View>

          <Button label={isEditing ? 'Guardar cambios' : 'Crear tarea'} onPress={handleSubmit} loading={loading} size="lg" style={{ marginTop: Spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
