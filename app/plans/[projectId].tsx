import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlans } from '../../src/hooks/usePlans';
import { PlanViewer } from '../../src/components/plans/PlanViewer';
import { UploadPlanModal } from '../../src/components/plans/UploadPlanModal';
import { MapPlanViewer } from '../../src/components/plans/MapPlanViewer';
import { NewRevisionModal } from '../../src/components/plans/NewRevisionModal';
import { RevisionHistoryModal } from '../../src/components/plans/RevisionHistoryModal';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { EmptyState, LoadingOverlay, Badge } from '../../src/components/ui';
import { Plan } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PlansScreen() {
  const { colors, typography } = useTheme();
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { plans, isLoading, uploadProgress, fetchPlans, uploadPlan, deletePlan, addAnnotation, deleteAnnotation, updateScale, uploadRevision, fetchRevisionHistory } = usePlans(projectId ?? '');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyTargetPlan, setHistoryTargetPlan] = useState<Plan | null>(null);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlans();
    setRefreshing(false);
  };

  const handleDelete = (plan: Plan) => {
    Alert.alert('Eliminar plano', `¿Eliminar "${plan.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await deletePlan(plan.id); }
          catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Error'); }
        },
      },
    ]);
  };

  const statusColor: Record<string, string> = {
    'Vigente': colors.success,
    'Revisión': colors.warning,
    'Obsoleto': colors.danger,
  };

  if (isLoading && plans.length === 0) return <LoadingOverlay message="Cargando planos..." />;

  // Vista de detalle de un plano
  if (selectedPlan) {
    const plan = plans.find((p) => p.id === selectedPlan.id) ?? selectedPlan;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
          <TouchableOpacity onPress={() => setSelectedPlan(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h4]} numberOfLines={1}>{plan.title}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {plan.code} · {plan.discipline} · {plan.revision}
            </Text>
          </View>
          <Badge
            label={plan.status}
            color={statusColor[plan.status] ?? colors.textMuted}
            bgColor={`${statusColor[plan.status] ?? colors.textMuted}20`}
          />
          <TouchableOpacity
            onPress={() => { setHistoryTargetPlan(plan); setHistoryModalVisible(true); }}
            style={{ padding: 6 }}
          >
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              const history = await fetchRevisionHistory(plan.plan_group_id ?? plan.id);
              const previous = history.find((p) => !p.is_current_revision);
              if (!previous) {
                Alert.alert('Sin revisiones anteriores', 'Este plano todavía no tiene versiones anteriores para comparar.');
                return;
              }
              if (previous.file_type === 'pdf' || plan.file_type === 'pdf') {
                Alert.alert('No disponible para PDF', 'La comparación visual solo está disponible para imágenes por ahora.');
                return;
              }
              router.push({
                pathname: '/plans/compare',
                params: {
                  planAId: previous.id,
                  planBId: plan.id,
                  planGroupId: plan.plan_group_id ?? plan.id,
                  projectId: projectId ?? '',
                },
              } as never);
            }}
            style={{ padding: 6 }}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMapModal(true)}
            style={{ padding: 6 }}
          >
            <Ionicons name="map-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRevisionModalVisible(true)}
            style={{ padding: 6 }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <PlanViewer
          plan={plan}
          onAddAnnotation={(dto) => addAnnotation(dto)}
          onDeleteAnnotation={(id) => deleteAnnotation(id, plan.id)}
          onUpdateScale={(planId, scale) => updateScale(planId, scale)}
        />

        {/* Leyenda de anotaciones */}
        {(plan.annotations?.length ?? 0) > 0 && (
          <View style={{ padding: Spacing.md, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.surface }}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
              {plan.annotations?.length} anotación{(plan.annotations?.length ?? 0) !== 1 ? 'es' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {['#EF4444', '#FFD700', '#22C55E', '#3B82F6'].map((color) => {
                const count = plan.annotations?.filter((a) => a.color === color).length ?? 0;
                if (!count) return null;
                return (
                  <View key={color} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <NewRevisionModal
          visible={revisionModalVisible}
          onClose={() => setRevisionModalVisible(false)}
          plan={plan}
          onUpload={async (fileUri, fileName, mimeType) => {
            const newPlan = await uploadRevision(plan, fileUri, fileName, mimeType);
            setSelectedPlan(newPlan);
          }}
          uploadProgress={uploadProgress}
        />

        <RevisionHistoryModal
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
          plan={historyTargetPlan}
          fetchHistory={fetchRevisionHistory}
          onSelectRevision={(revision) => setSelectedPlan(revision)}
          projectId={projectId ?? ''}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h3}>Planos</Text>
          {projectName && <Text style={[typography.caption, { color: colors.textMuted }]}>{projectName}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => setUploadModalVisible(true)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="map-outline" size={48} color={colors.textMuted} />}
            title="Sin planos"
            subtitle="Sube el primer plano tocando el botón +"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedPlan(item)}
            style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 3 }}>
                  <Ionicons
                    name={item.file_type === 'pdf' ? 'document-outline' : 'image-outline'}
                    size={16} color={colors.primary}
                  />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{item.code}</Text>
                </View>
                <Text style={[typography.body, { fontWeight: '600' }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {item.discipline} · {item.level} · {item.revision}
                </Text>
              </View>
              <View style={{ gap: Spacing.sm, alignItems: 'flex-end' }}>
                <Badge
                  label={item.status}
                  color={statusColor[item.status] ?? colors.textMuted}
                  bgColor={`${statusColor[item.status] ?? colors.textMuted}20`}
                />
                {item.scale && (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Esc. {item.scale}</Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                {(item.annotations?.length ?? 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="pin-outline" size={13} color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {item.annotations?.length} anotaciones
                    </Text>
                  </View>
                )}
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {format(new Date(item.created_at), 'd MMM yyyy', { locale: es })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); setHistoryTargetPlan(item); setHistoryModalVisible(true); }}
                  style={{ padding: Spacing.xs }}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: Spacing.xs }}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <UploadPlanModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onUpload={uploadPlan}
        uploadProgress={uploadProgress}
      />

      <RevisionHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        plan={historyTargetPlan}
        fetchHistory={fetchRevisionHistory}
        onSelectRevision={(revision) => setSelectedPlan(revision)}
        projectId={projectId ?? ''}
      />

      <MapPlanViewer
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        projectId={projectId ?? ''}
        onPlanSaved={() => fetchPlans()}
      />
    </SafeAreaView>
  );
}
