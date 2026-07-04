import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useSiteLog } from '../../src/hooks/useSiteLog';
import { Avatar } from '../../src/components/ui';
import { Spacing, Radius } from '../../src/lib/theme';

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export default function SiteLogScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { entries, isLoading, fetchEntries, addEntry, deleteEntry, updateEntry } = useSiteLog(projectId);

  const [showForm, setShowForm] = useState(false);
  const [activity, setActivity] = useState('');
  const [observations, setObservations] = useState('');
  const [visitedAt, setVisitedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<typeof entries[0] | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useFocusEffect(useCallback(() => { fetchEntries(); }, [fetchEntries]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const resetForm = () => {
    setActivity('');
    setObservations('');
    setVisitedAt(new Date());
    setShowForm(false);
  };

  const openDetail = (entry: typeof entries[0]) => {
    setEditingEntry(entry);
    setActivity(entry.activity);
    setObservations(entry.observations ?? '');
    setVisitedAt(new Date(entry.visited_at));
    setShowDetailModal(true);
  };

  const handleUpdate = async () => {
    if (!editingEntry || !activity.trim()) return;
    setSaving(true);
    try {
      await updateEntry(editingEntry.id, {
        activity,
        observations,
        visited_at: visitedAt.toISOString(),
      });
      setShowDetailModal(false);
      setEditingEntry(null);
      setActivity('');
      setObservations('');
      setVisitedAt(new Date());
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el registro');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!activity.trim()) { Alert.alert('Requerido', 'La actividad es obligatoria'); return; }
    setSaving(true);
    try {
      await addEntry({ activity, observations, visited_at: visitedAt.toISOString() });
      resetForm();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el registro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar registro', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteEntry(id) },
    ]);
  };

  const grouped: { label: string; items: typeof entries }[] = [];
  for (const entry of entries) {
    const label = formatDateLabel(entry.visited_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else grouped.push({ label, items: [entry] });
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 0.5, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h4}>Bitácora de obra</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {projectName ?? 'Proyecto'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.label}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing.md }}>
              <Ionicons name="book-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h4, { color: colors.textMuted }]}>Sin registros</Text>
              <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
                Toca + para registrar la primera visita de obra
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: group }) => (
          <View style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }]}>
                {group.label}
              </Text>
              <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
            </View>
            {group.items.map((entry) => (
              <TouchableOpacity key={entry.id} onPress={() => openDetail(entry)} style={{
                backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg,
                borderWidth: 0.5, borderColor: colors.border,
                borderLeftWidth: 3, borderLeftColor: colors.primary,
                padding: Spacing.md, gap: Spacing.xs,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Text style={[typography.bodySmall, { fontWeight: '700', flex: 1 }]}>{entry.activity}</Text>
                  <TouchableOpacity onPress={() => handleDelete(entry.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
                {entry.observations ? (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{entry.observations}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 }}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {format(new Date(entry.visited_at), 'HH:mm')}
                  </Text>
                  {entry.creator && (
                    <>
                      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted }} />
                      <Avatar name={entry.creator.full_name} imageUrl={entry.creator.avatar_url} size={16} />
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{entry.creator.full_name}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={resetForm}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={typography.h4}>Nuevo registro</Text>
                  <TouchableOpacity onPress={resetForm}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Fecha y hora de visita</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: colors.textPrimary }}>{format(visitedAt, 'dd/MM/yyyy')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: colors.textPrimary }}>{format(visitedAt, 'HH:mm')}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker value={visitedAt} mode="date" display="default"
                    onChange={(_, d) => { setShowDatePicker(false); if (d) setVisitedAt(d); }} />
                )}
                {showTimePicker && (
                  <DateTimePicker value={visitedAt} mode="time" display="default" is24Hour
                    onChange={(_, d) => { setShowTimePicker(false); if (d) setVisitedAt(d); }} />
                )}

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Actividad realizada *</Text>
                <TextInput
                  value={activity} onChangeText={setActivity}
                  placeholder="Ej. Supervisión de cimentación, revisión de instalaciones..."
                  placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top', marginBottom: Spacing.md, minHeight: 80 }}
                />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Observaciones</Text>
                <TextInput
                  value={observations} onChangeText={setObservations}
                  placeholder="Notas adicionales, incidencias, acuerdos..."
                  placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top', marginBottom: Spacing.lg, minHeight: 80 }}
                />

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving || !activity.trim()}
                  style={{ backgroundColor: saving || !activity.trim() ? colors.surfaceTertiary : colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}
                >
                  <Ionicons name="save-outline" size={18} color={saving || !activity.trim() ? colors.textMuted : colors.textInverse} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !activity.trim() ? colors.textMuted : colors.textInverse }}>
                    {saving ? 'Guardando...' : 'Guardar registro'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Modal detalle/edición de registro */}
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={typography.h4}>Editar registro</Text>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDetailModal(false);
                        if (editingEntry) handleDelete(editingEntry.id);
                      }}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                      <Ionicons name="close" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Fecha y hora de visita</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: colors.textPrimary }}>{format(visitedAt, 'dd/MM/yyyy')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: colors.textPrimary }}>{format(visitedAt, 'HH:mm')}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker value={visitedAt} mode="date" display="default"
                    onChange={(_, d) => { setShowDatePicker(false); if (d) setVisitedAt(d); }} />
                )}
                {showTimePicker && (
                  <DateTimePicker value={visitedAt} mode="time" display="default" is24Hour
                    onChange={(_, d) => { setShowTimePicker(false); if (d) setVisitedAt(d); }} />
                )}

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Actividad realizada *</Text>
                <TextInput
                  value={activity} onChangeText={setActivity}
                  placeholder="Actividad realizada..."
                  placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top', marginBottom: Spacing.md, minHeight: 80 }}
                />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Observaciones</Text>
                <TextInput
                  value={observations} onChangeText={setObservations}
                  placeholder="Notas adicionales..."
                  placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top', marginBottom: Spacing.lg, minHeight: 80 }}
                />

                <TouchableOpacity
                  onPress={handleUpdate}
                  disabled={saving || !activity.trim()}
                  style={{ backgroundColor: saving || !activity.trim() ? colors.surfaceTertiary : colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}
                >
                  <Ionicons name="save-outline" size={18} color={saving || !activity.trim() ? colors.textMuted : colors.textInverse} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !activity.trim() ? colors.textMuted : colors.textInverse }}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
