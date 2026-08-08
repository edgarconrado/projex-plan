import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useBudget, BudgetCategory } from '../../src/hooks/useBudget';
import { useSubscription } from '../../src/hooks/useSubscription';
import { PaywallModal } from '../../src/components/ui/PaywallModal';
import { Spacing, Radius } from '../../src/lib/theme';

const CURRENCY = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

const CATEGORY_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'];

export default function BudgetScreen() {
  const { projectId, projectName, createdBy } = useLocalSearchParams<{ projectId: string; projectName: string; createdBy?: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const sub = useSubscription();
  const [projectCreatorIsPro, setProjectCreatorIsPro] = useState(false);
  useEffect(() => {
    if (createdBy) sub.isProjectCreatorPro(createdBy).then(setProjectCreatorIsPro);
  }, [createdBy, sub.isPro]);
  const effectiveCan = sub.canUseBudget || projectCreatorIsPro;
  const {
    categories, isLoading, totalBudgeted, totalSpent, remaining, pct,
    fetchCategories, addCategory, updateCategory, deleteCategory,
  } = useBudget(projectId);

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [name, setName] = useState('');
  const [budgeted, setBudgeted] = useState('');
  const [spent, setSpent] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchCategories(); }, [fetchCategories]));

  const onRefresh = async () => { setRefreshing(true); await fetchCategories(); setRefreshing(false); };

  const openNew = () => {
    setEditingCategory(null);
    setName(''); setBudgeted(''); setSpent('');
    setShowForm(true);
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setBudgeted(cat.budgeted.toString());
    setSpent(cat.spent.toString());
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !budgeted) { Alert.alert('Requerido', 'Nombre y presupuesto son obligatorios'); return; }
    const bud = parseFloat(budgeted.replace(/,/g, ''));
    const sp = parseFloat((spent || '0').replace(/,/g, ''));
    console.log('[Budget] handleSave:', { name: name.trim(), budgeted: bud, spent: sp, isEditing: !!editingCategory });
    if (isNaN(bud) || bud < 0) { Alert.alert('Error', 'El presupuesto debe ser un número válido'); return; }
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: name.trim(), budgeted: bud, spent: sp });
      } else {
        await addCategory(name.trim(), bud, sp);
      }
      setShowForm(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: BudgetCategory) => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${cat.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteCategory(cat.id) },
    ]);
  };

  // Genera los paths SVG para la gráfica de pastel
  const buildPieSlices = (cats: BudgetCategory[]) => {
    const total = cats.reduce((s, c) => s + c.budgeted, 0);
    if (total === 0) return [];
    const cx = 80, cy = 80, r = 70;
    let startAngle = -Math.PI / 2;
    return cats.map((cat, i) => {
      const pct = cat.budgeted / total;
      const angle = pct * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const midAngle = startAngle + angle / 2;
      const lx = cx + (r * 0.65) * Math.cos(midAngle);
      const ly = cy + (r * 0.65) * Math.sin(midAngle);
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
      const result = { path, color, label: pct >= 0.08 ? `${Math.round(pct * 100)}%` : '', lx, ly };
      startAngle = endAngle;
      return result;
    });
  };

  const pieSlices = buildPieSlices(categories);
  const statusColor = (cat: BudgetCategory) => {
    if (cat.budgeted === 0) return colors.textMuted;
    const p = cat.spent / cat.budgeted;
    if (p >= 1) return '#EF4444';
    if (p >= 0.8) return '#F59E0B';
    return '#22C55E';
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      {/* Header */}
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
          <Text style={typography.h4}>Presupuesto</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {projectName ?? 'Proyecto'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openNew}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={c => c.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        ListHeaderComponent={
          totalBudgeted > 0 ? (
            <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.sm }}>
              <Text style={[typography.h4, { marginBottom: 4 }]}>Resumen general</Text>

              {/* Gráfica de pastel + leyenda */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <Svg width={160} height={160} viewBox="0 0 160 160">
                  <G>
                    {pieSlices.map((s, i) => (
                      <G key={i}>
                        <Path d={s.path} fill={s.color} opacity={0.9} />
                        {s.label ? (
                          <SvgText x={s.lx} y={s.ly} fontSize="9" fontWeight="700" fill="white" textAnchor="middle" alignmentBaseline="middle">
                            {s.label}
                          </SvgText>
                        ) : null}
                      </G>
                    ))}
                  </G>
                </Svg>
                <View style={{ flex: 1, gap: 6 }}>
                  {categories.map((cat, i) => (
                    <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <Text style={[typography.caption, { flex: 1, color: colors.textPrimary }]} numberOfLines={1}>{cat.name}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{CURRENCY(cat.budgeted)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Barra de progreso general */}
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Gasto vs Presupuesto</Text>
                  <Text style={[typography.caption, { fontWeight: '700', color: pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E' }]}>{pct}%</Text>
                </View>
                <View style={{ backgroundColor: colors.surfaceTertiary, borderRadius: 6, height: 10, overflow: 'hidden' }}>
                  <View style={{ height: 10, borderRadius: 6, width: `${pct}%`, backgroundColor: pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E' }} />
                </View>
              </View>

              {/* Tres métricas */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 2 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Presupuesto</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{CURRENCY(totalBudgeted)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 2 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Gastado</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: totalSpent > totalBudgeted ? '#EF4444' : colors.textPrimary }}>{CURRENCY(totalSpent)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 2 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Disponible</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: remaining < 0 ? '#EF4444' : '#22C55E' }}>{CURRENCY(remaining)}</Text>
                </View>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing.md }}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h4, { color: colors.textMuted }]}>Sin categorías</Text>
              <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
                Toca + para agregar la primera categoría de presupuesto
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: cat, index }) => {
          const catPct = cat.budgeted > 0 ? Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) : 0;
          const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          const sColor = statusColor(cat);
          return (
            <TouchableOpacity
              onPress={() => openEdit(cat)}
              style={{
                backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg,
                borderWidth: 0.5, borderColor: colors.border,
                borderLeftWidth: 4, borderLeftColor: color,
                padding: Spacing.md, gap: Spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.bodySmall, { fontWeight: '700', flex: 1 }]}>{cat.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={{ backgroundColor: `${sColor}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: sColor }}>{catPct}%</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(cat)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ backgroundColor: colors.surfaceTertiary, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 4, width: `${catPct}%`, backgroundColor: sColor }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Presupuesto</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{CURRENCY(cat.budgeted)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Gastado</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: cat.spent > cat.budgeted ? '#EF4444' : colors.textPrimary }}>{CURRENCY(cat.spent)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Disponible</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: cat.budgeted - cat.spent < 0 ? '#EF4444' : '#22C55E' }}>{CURRENCY(cat.budgeted - cat.spent)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal nueva/editar categoría */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={typography.h4}>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Nombre *</Text>
                <TextInput
                  value={name} onChangeText={setName}
                  placeholder="Ej. Materiales, Mano de obra, Equipo..."
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.md }}
                />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Presupuesto (MXN) *</Text>
                <TextInput
                  value={budgeted} onChangeText={setBudgeted}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.md }}
                />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Gasto real (MXN)</Text>
                <TextInput
                  value={spent} onChangeText={setSpent}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.lg }}
                />

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving || !name.trim() || !budgeted}
                  style={{ backgroundColor: saving || !name.trim() || !budgeted ? colors.surfaceTertiary : colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}
                >
                  <Ionicons name="save-outline" size={18} color={saving || !name.trim() || !budgeted ? colors.textMuted : colors.textInverse} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: saving || !name.trim() || !budgeted ? colors.textMuted : colors.textInverse }}>
                    {saving ? 'Guardando...' : editingCategory ? 'Guardar cambios' : 'Crear categoría'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <PaywallModal
        visible={!sub.isLoading && !effectiveCan}
        onClose={() => router.back()}
        feature="Control de presupuesto"
        description="Lleva un control detallado de tus gastos vs presupuesto por categorías con gráficas en tiempo real."
      />
    </SafeAreaView>
  );
}
