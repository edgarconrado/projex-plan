import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, RefreshControl, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useRisks, ProjectRisk, RiskLevel, RiskStatus, calcRisk, levelScore } from '../../src/hooks/useRisks';
import { Spacing, Radius } from '../../src/lib/theme';

const PROB_LABELS: Record<RiskLevel, string> = { A: 'Alta', M: 'Media', B: 'Baja' };
const STATUS_COLORS: Record<RiskStatus, string> = { Abierto: '#EF4444', Cerrado: '#22C55E', Presente: '#F59E0B' };
const QUAL_COLORS: Record<string, string> = { MA: '#7C3AED', A: '#EF4444', M: '#F59E0B', B: '#3B82F6', MB: '#22C55E' };

export default function RisksScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { risks, isLoading, fetchRisks, addRisk, updateRisk, deleteRisk } = useRisks(projectId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProjectRisk | null>(null);
  const [name, setName] = useState('');
  const [responsible, setResponsible] = useState('');
  const [status, setStatus] = useState<RiskStatus>('Abierto');
  const [probability, setProbability] = useState<RiskLevel>('M');
  const [impact, setImpact] = useState<RiskLevel>('M');
  const [mitigation, setMitigation] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchRisks(); }, [fetchRisks]));
  const onRefresh = async () => { setRefreshing(true); await fetchRisks(); setRefreshing(false); };

  const openNew = () => {
    setEditing(null);
    setName(''); setResponsible(''); setStatus('Abierto');
    setProbability('M'); setImpact('M'); setMitigation('');
    setShowForm(true);
  };

  const openEdit = (r: ProjectRisk) => {
    setEditing(r);
    setName(r.name); setResponsible(r.responsible ?? '');
    setStatus(r.status); setProbability(r.probability);
    setImpact(r.impact); setMitigation(r.mitigation ?? '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Requerido', 'El nombre del riesgo es obligatorio'); return; }
    setSaving(true);
    try {
      const data = {
        name: name.trim(), responsible: responsible.trim() || null,
        status, probability, impact,
        mitigation: mitigation.trim() || null,
        identified_at: format(new Date(), 'yyyy-MM-dd'),
      };
      if (editing) await updateRisk(editing.id, data);
      else await addRisk(data);
      setShowForm(false);
    } catch { Alert.alert('Error', 'No se pudo guardar el riesgo'); }
    finally { setSaving(false); }
  };

  const handleDelete = (r: ProjectRisk) => {
    Alert.alert('Eliminar riesgo', `¿Eliminar "${r.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRisk(r.id) },
    ]);
  };

  // Resumen por estado
  const abiertos = risks.filter(r => r.status === 'Abierto').length;
  const presentes = risks.filter(r => r.status === 'Presente').length;
  const cerrados = risks.filter(r => r.status === 'Cerrado').length;
  const mayAlto = risks.filter(r => calcRisk(r.probability, r.impact).qual === 'MA').length;

  const LevelBtn = ({ val, current, onPress }: { val: RiskLevel; current: RiskLevel; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{
      flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1,
      borderColor: current === val ? colors.primary : colors.border,
      backgroundColor: current === val ? colors.primaryMuted : colors.surfaceSecondary,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: current === val ? colors.primary : colors.textMuted }}>
        {PROB_LABELS[val]}
      </Text>
    </TouchableOpacity>
  );

  const StatusBtn = ({ val, current, onPress }: { val: RiskStatus; current: RiskStatus; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{
      flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1,
      borderColor: current === val ? STATUS_COLORS[val] : colors.border,
      backgroundColor: current === val ? `${STATUS_COLORS[val]}20` : colors.surfaceSecondary,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: current === val ? STATUS_COLORS[val] : colors.textMuted }}>{val}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h4}>Registro de riesgos</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{projectName ?? 'Proyecto'}</Text>
        </View>
        <TouchableOpacity onPress={openNew} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={risks}
        keyExtractor={r => r.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        ListHeaderComponent={risks.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            {[['Abiertos', abiertos, '#EF4444'], ['Presentes', presentes, '#F59E0B'], ['Cerrados', cerrados, '#22C55E'], ['Muy Alto', mayAlto, '#7C3AED']].map(([label, count, color]) => (
              <View key={label as string} style={{ flex: 1, backgroundColor: `${color}15`, borderRadius: Radius.md, borderWidth: 0.5, borderColor: `${color}40`, padding: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: color as string }}>{count as number}</Text>
                <Text style={{ fontSize: 10, color: color as string, fontWeight: '600' }}>{label as string}</Text>
              </View>
            ))}
          </View>
        ) : null}
        ListEmptyComponent={!isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing.md }}>
            <Ionicons name="warning-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.h4, { color: colors.textMuted }]}>Sin riesgos registrados</Text>
            <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>Toca + para registrar el primer riesgo del proyecto</Text>
          </View>
        ) : null}
        renderItem={({ item: r, index }) => {
          const { score, qual } = calcRisk(r.probability, r.impact);
          const qColor = QUAL_COLORS[qual] ?? '#6B7280';
          const sColor = STATUS_COLORS[r.status];
          return (
            <TouchableOpacity onPress={() => openEdit(r)} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: qColor, padding: Spacing.md, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>#{index + 1}</Text>
                    <Text style={[typography.bodySmall, { fontWeight: '700', flex: 1 }]}>{r.name}</Text>
                  </View>
                  {r.responsible && <Text style={[typography.caption, { color: colors.textMuted }]}>Resp: {r.responsible}</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
                  <View style={{ backgroundColor: `${qColor}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: qColor }}>{qual} · {score}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(r)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ backgroundColor: `${sColor}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 0.5, borderColor: `${sColor}40` }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: sColor }}>{r.status}</Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>P: {PROB_LABELS[r.probability]} · I: {PROB_LABELS[r.impact]}</Text>
              </View>
              {r.mitigation && <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>↳ {r.mitigation}</Text>}
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal form */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={typography.h4}>{editing ? 'Editar riesgo' : 'Nuevo riesgo'}</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Nombre del riesgo *</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Describe el riesgo..." placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.md }} />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Responsable</Text>
                <TextInput value={responsible} onChangeText={setResponsible} placeholder="Iniciales o nombre..." placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.md }} />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Estado</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  {(['Abierto', 'Presente', 'Cerrado'] as RiskStatus[]).map(s => (
                    <StatusBtn key={s} val={s} current={status} onPress={() => setStatus(s)} />
                  ))}
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Probabilidad</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  {(['A', 'M', 'B'] as RiskLevel[]).map(l => (
                    <LevelBtn key={l} val={l} current={probability} onPress={() => setProbability(l)} />
                  ))}
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Impacto</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  {(['A', 'M', 'B'] as RiskLevel[]).map(l => (
                    <LevelBtn key={l} val={l} current={impact} onPress={() => setImpact(l)} />
                  ))}
                </View>

                {/* Preview NPR */}
                <View style={{ backgroundColor: `${QUAL_COLORS[calcRisk(probability, impact).qual]}20`, borderRadius: Radius.md, padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <Ionicons name="analytics-outline" size={16} color={QUAL_COLORS[calcRisk(probability, impact).qual]} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: QUAL_COLORS[calcRisk(probability, impact).qual] }}>
                    NPR: {calcRisk(probability, impact).score} — Clasificación: {calcRisk(probability, impact).qual}
                  </Text>
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Plan de mitigación</Text>
                <TextInput value={mitigation} onChangeText={setMitigation} placeholder="Acciones para mitigar el riesgo..." placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top', minHeight: 80, marginBottom: Spacing.lg }} />

                <TouchableOpacity onPress={handleSave} disabled={saving || !name.trim()}
                  style={{ backgroundColor: saving || !name.trim() ? colors.surfaceTertiary : colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <Ionicons name="save-outline" size={18} color={saving || !name.trim() ? colors.textMuted : colors.textInverse} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !name.trim() ? colors.textMuted : colors.textInverse }}>
                    {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar riesgo'}
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
