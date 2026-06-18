import { useState } from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Project, ProjectStatus, CreateProjectDTO } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { Button, Input } from '../ui';

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
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(initialData?.status ?? 'planning');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [budget, setBudget] = useState(initialData?.budget ? String(initialData.budget) : '');
  const [deadline, setDeadline] = useState(initialData?.deadline ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={Typography.h4}>{isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={{ backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.danger }}>
              <Text style={[Typography.bodySmall, { color: Colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Nombre del proyecto *"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Torre Reforma Norte"
            leftIcon={<Ionicons name="briefcase-outline" size={18} color={Colors.textMuted} />}
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
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Estado</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setStatus(opt.value)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7,
                    borderRadius: Radius.full,
                    borderWidth: 1,
                    borderColor: status === opt.value ? Colors.primary : Colors.border,
                    backgroundColor: status === opt.value ? Colors.primaryMuted : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '500',
                    color: status === opt.value ? Colors.primary : Colors.textSecondary,
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
            leftIcon={<Ionicons name="location-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Dirección"
            value={address}
            onChangeText={setAddress}
            placeholder="Av. Reforma 123"
            leftIcon={<Ionicons name="map-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Presupuesto (MXN)"
            value={budget}
            onChangeText={setBudget}
            placeholder="0.00"
            keyboardType="numeric"
            leftIcon={<Ionicons name="cash-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Fecha límite (YYYY-MM-DD)"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="2025-12-31"
            leftIcon={<Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />}
          />

          <Button
            label={isEditing ? 'Guardar cambios' : 'Crear proyecto'}
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
