import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Project, ProjectStatus, CreateProjectDTO } from '../../types';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { Button, Input } from '../ui';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ProjectFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectDTO) => Promise<void>;
  initialData?: Project | null;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planeación' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'on_hold', label: 'En pausa' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function ProjectFormModal({
  visible, onClose, onSubmit, initialData,
}: ProjectFormModalProps) {
  const { colors, typography } = useTheme();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(initialData?.status ?? 'planning');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [budget, setBudget] = useState(initialData?.budget ? String(initialData.budget) : '');
  const [deadline, setDeadline] = useState(initialData?.deadline ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resetear campos cada vez que el modal se abre o cambia el proyecto a editar
  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setDescription(initialData?.description ?? '');
      setStatus(initialData?.status ?? 'planning');
      setCity(initialData?.city ?? '');
      setAddress(initialData?.address ?? '');
      setBudget(initialData?.budget ? String(initialData.budget) : '');
      setDeadline(initialData?.deadline ?? '');
      setError('');
    }
  }, [visible, initialData?.id]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setError(''); setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        status,
        city: city.trim() || null,
        address: address.trim() || null,
        budget: budget ? parseFloat(budget) : null,
        deadline: deadline.trim() || null,
        start_date: null,
        end_date: null,
      });
      onClose();
    } catch (e: unknown) {
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
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={typography.h4}>{isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={{ backgroundColor: colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: colors.danger }}>
              <Text style={[typography.bodySmall, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Nombre del proyecto *"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Torre Reforma Norte"
            leftIcon={<Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />}
          />

          <Input
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción del proyecto..."
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top', paddingTop: 8 }}
          />

          {/* Status */}
          <View style={{ gap: 8 }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Estado</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: Radius.full,
                    borderWidth: 1,
                    borderColor: status === opt.value ? colors.primary : colors.border,
                    backgroundColor: status === opt.value ? colors.primaryMuted : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '500',
                    color: status === opt.value ? colors.primary : colors.textSecondary,
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Ciudad"
            value={city}
            onChangeText={setCity}
            placeholder="Guadalajara"
            leftIcon={<Ionicons name="location-outline" size={18} color={colors.textMuted} />}
          />

          <Input
            label="Dirección"
            value={address}
            onChangeText={setAddress}
            placeholder="Av. Reforma 123"
            leftIcon={<Ionicons name="map-outline" size={18} color={colors.textMuted} />}
          />

          <Input
            label="Presupuesto (MXN)"
            value={budget}
            onChangeText={setBudget}
            placeholder="0.00"
            keyboardType="numeric"
            leftIcon={<Ionicons name="cash-outline" size={18} color={colors.textMuted} />}
          />

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
              <Text style={{ color: deadline ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
                {deadline
                  ? new Date(deadline + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Selecciona una fecha'}
              </Text>
              {deadline ? (
                <TouchableOpacity onPress={() => setDeadline('')} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={deadline ? new Date(deadline + 'T00:00:00') : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  const iso = selectedDate.toISOString().split('T')[0];
                  setDeadline(iso);
                }
              }}
            />
          )}

          <Button
            label={isEditing ? 'Guardar cambios' : 'Crear proyecto'}
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
