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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useProjectPermissions } from '../../src/hooks/useProjectPermissions';
import { useEVM, EVMWeek } from '../../src/hooks/useEVM';
import { useSubscription } from '../../src/hooks/useSubscription';
import { PaywallModal } from '../../src/components/ui/PaywallModal';
import { Spacing, Radius } from '../../src/lib/theme';

const CURRENCY = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export default function EVMScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const sub = useSubscription();
  const perms = useProjectPermissions(projectId, null);
  const { weeks, isLoading, fetchWeeks, upsertWeek, deleteWeek, cpi, spi } = useEVM(projectId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EVMWeek | null>(null);
  const [weekNum, setWeekNum] = useState('');
  const [weekDate, setWeekDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pv, setPv] = useState('');
  const [ev, setEv] = useState('');
  const [ac, setAc] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchWeeks(); }, [fetchWeeks]));
  const onRefresh = async () => { setRefreshing(true); await fetchWeeks(); setRefreshing(false); };

  const openNew = () => {
    setEditing(null);
    const nextWeek = weeks.length > 0 ? Math.max(...weeks.map(w => w.week_number)) + 1 : 1;
    setWeekNum(nextWeek.toString());
    setWeekDate(new Date());
    setPv(''); setEv(''); setAc('');
    setShowForm(true);
  };

  const openEdit = (w: EVMWeek) => {
    setEditing(w);
    setWeekNum(w.week_number.toString());
    setWeekDate(new Date(w.week_date));
    setPv(w.pv.toString()); setEv(w.ev.toString()); setAc(w.ac.toString());
    setShowForm(true);
  };

  const handleSave = async () => {
    const wn = parseInt(weekNum);
    const pvN = parseFloat(pv || '0');
    const evN = parseFloat(ev || '0');
    const acN = parseFloat(ac || '0');
    if (!weekNum || isNaN(wn) || wn < 1) { Alert.alert('Error', 'Número de semana inválido'); return; }
    setSaving(true);
    try {
      await upsertWeek({ week_number: wn, week_date: format(weekDate, 'yyyy-MM-dd'), pv: pvN, ev: evN, ac: acN });
      setShowForm(false);
    } catch { Alert.alert('Error', 'No se pudo guardar el registro'); }
    finally { setSaving(false); }
  };

  const handleDelete = (w: EVMWeek) => {
    Alert.alert('Eliminar semana', `¿Eliminar Semana ${w.week_number}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteWeek(w.id) },
    ]);
  };

  const cpiColor = cpi === null ? colors.textMuted : cpi >= 1 ? '#22C55E' : cpi >= 0.9 ? '#F59E0B' : '#EF4444';
  const spiColor = spi === null ? colors.textMuted : spi >= 1 ? '#22C55E' : spi >= 0.9 ? '#F59E0B' : '#EF4444';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h4}>EVM — Valor Ganado</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{projectName ?? 'Proyecto'}</Text>
        </View>
        {perms.canCreateEVM && (
          <TouchableOpacity onPress={openNew} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={weeks}
        keyExtractor={w => w.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        ListHeaderComponent={weeks.length > 0 ? (
          <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.sm }}>
            <Text style={[typography.h4, { marginBottom: 4 }]}>Indicadores actuales</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <View style={{ flex: 1, backgroundColor: `${cpiColor}15`, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>CPI</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: cpiColor }}>{cpi !== null ? cpi.toFixed(2) : '—'}</Text>
                <Text style={[typography.caption, { color: cpiColor, textAlign: 'center' }]}>
                  {cpi === null ? '' : cpi >= 1 ? 'Bajo presupuesto' : 'Sobre presupuesto'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: `${spiColor}15`, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>SPI</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: spiColor }}>{spi !== null ? spi.toFixed(2) : '—'}</Text>
                <Text style={[typography.caption, { color: spiColor, textAlign: 'center' }]}>
                  {spi === null ? '' : spi >= 1 ? 'Adelantado' : 'Retrasado'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        ListEmptyComponent={!isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing.md }}>
            <Ionicons name="trending-up-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.h4, { color: colors.textMuted }]}>Sin datos EVM</Text>
            <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>Toca + para registrar el avance de la primera semana</Text>
          </View>
        ) : null}
        renderItem={({ item: w }) => {
          const wCpi = w.ac > 0 ? (w.ev / w.ac).toFixed(2) : '—';
          const wSpi = w.pv > 0 ? (w.ev / w.pv).toFixed(2) : '—';
          return (
            <TouchableOpacity onPress={() => openEdit(w)} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[typography.bodySmall, { fontWeight: '700' }]}>Semana {w.week_number}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{format(new Date(w.week_date), 'dd/MM/yyyy')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>CPI: {wCpi} · SPI: {wSpi}</Text>
                  <TouchableOpacity onPress={() => handleDelete(w)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {[['PV', w.pv, '#3B82F6'], ['EV', w.ev, '#22C55E'], ['AC', w.ac, '#F59E0B']].map(([label, val, color]) => (
                  <View key={label as string} style={{ flex: 1, backgroundColor: `${color}15`, borderRadius: Radius.sm, padding: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: color as string, fontWeight: '700' }}>{label as string}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>{CURRENCY(val as number)}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={typography.h4}>{editing ? 'Editar semana' : 'Nueva semana'}</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Semana #</Text>
                    <TextInput value={weekNum} onChangeText={setWeekNum} keyboardType="numeric" placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14 }} />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Fecha inicio</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}>
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={{ fontSize: 14, color: colors.textPrimary }}>{format(weekDate, 'dd/MM/yyyy')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {showDatePicker && (
                  <DateTimePicker value={weekDate} mode="date" display="default"
                    onChange={(_, d) => { setShowDatePicker(false); if (d) setWeekDate(d); }} />
                )}

                {[['PV (Valor Planeado)', pv, setPv, '#3B82F6'], ['EV (Valor Ganado)', ev, setEv, '#22C55E'], ['AC (Costo Real)', ac, setAc, '#F59E0B']].map(([label, val, setter, color]) => (
                  <View key={label as string} style={{ marginBottom: Spacing.md }}>
                    <Text style={[typography.label, { color: color as string, marginBottom: 6 }]}>{label as string}</Text>
                    <TextInput value={val as string} onChangeText={setter as (v: string) => void}
                      placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="numeric"
                      style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: color as string, padding: Spacing.md, color: colors.textPrimary, fontSize: 14 }} />
                  </View>
                ))}

                <TouchableOpacity onPress={handleSave} disabled={saving || !weekNum.trim()}
                  style={{ backgroundColor: saving || !weekNum.trim() ? colors.surfaceTertiary : colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <Ionicons name="save-outline" size={18} color={saving || !weekNum.trim() ? colors.textMuted : colors.textInverse} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !weekNum.trim() ? colors.textMuted : colors.textInverse }}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <PaywallModal
        visible={!sub.isLoading && !sub.canUseEVM}
        onClose={() => router.back()}
        feature="EVM — Valor Ganado"
        description="Mide el desempeño real de tu proyecto con indicadores CPI y SPI semana a semana."
      />
    </SafeAreaView>
  );
}
