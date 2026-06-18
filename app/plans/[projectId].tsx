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
import { Colors, Typography, Spacing, Radius } from '../../src/lib/theme';
import { EmptyState, LoadingOverlay, Badge } from '../../src/components/ui';
import { Plan } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PlansScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { plans, isLoading, uploadProgress, fetchPlans, uploadPlan, deletePlan, addAnnotation, deleteAnnotation } = usePlans(projectId ?? '');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    'Vigente': Colors.success,
    'Revisión': Colors.warning,
    'Obsoleto': Colors.danger,
  };

  if (isLoading && plans.length === 0) return <LoadingOverlay message="Cargando planos..." />;

  // Vista de detalle de un plano
  if (selectedPlan) {
    const plan = plans.find((p) => p.id === selectedPlan.id) ?? selectedPlan;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border, backgroundColor: Colors.surface }}>
          <TouchableOpacity onPress={() => setSelectedPlan(null)}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.h4]} numberOfLines={1}>{plan.title}</Text>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
              {plan.code} · {plan.discipline} · {plan.revision}
            </Text>
          </View>
          <Badge
            label={plan.status}
            color={statusColor[plan.status] ?? Colors.textMuted}
            bgColor={`${statusColor[plan.status] ?? Colors.textMuted}20`}
          />
        </View>

        <PlanViewer
          plan={plan}
          onAddAnnotation={(dto) => addAnnotation(dto)}
          onDeleteAnnotation={(id) => deleteAnnotation(id, plan.id)}
        />

        {/* Leyenda de anotaciones */}
        {(plan.annotations?.length ?? 0) > 0 && (
          <View style={{ padding: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.border, backgroundColor: Colors.surface }}>
            <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: 6 }]}>
              {plan.annotations?.length} anotación{(plan.annotations?.length ?? 0) !== 1 ? 'es' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {['#EF4444', '#FFD700', '#22C55E', '#3B82F6'].map((color) => {
                const count = plan.annotations?.filter((a) => a.color === color).length ?? 0;
                if (!count) return null;
                return (
                  <View key={color} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                    <Text style={[Typography.caption, { color: Colors.textMuted }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={Typography.h3}>Planos</Text>
          {projectName && <Text style={[Typography.caption, { color: Colors.textMuted }]}>{projectName}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => setUploadModalVisible(true)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={24} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="map-outline" size={48} color={Colors.textMuted} />}
            title="Sin planos"
            subtitle="Sube el primer plano tocando el botón +"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedPlan(item)}
            style={{ backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 3 }}>
                  <Ionicons
                    name={item.file_type === 'pdf' ? 'document-outline' : 'image-outline'}
                    size={16} color={Colors.primary}
                  />
                  <Text style={[Typography.caption, { color: Colors.primary, fontWeight: '600' }]}>{item.code}</Text>
                </View>
                <Text style={[Typography.body, { fontWeight: '600' }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                  {item.discipline} · {item.level} · {item.revision}
                </Text>
              </View>
              <View style={{ gap: Spacing.sm, alignItems: 'flex-end' }}>
                <Badge
                  label={item.status}
                  color={statusColor[item.status] ?? Colors.textMuted}
                  bgColor={`${statusColor[item.status] ?? Colors.textMuted}20`}
                />
                {item.scale && (
                  <Text style={[Typography.caption, { color: Colors.textMuted }]}>Esc. {item.scale}</Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                {(item.annotations?.length ?? 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="pin-outline" size={13} color={Colors.textMuted} />
                    <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                      {item.annotations?.length} anotaciones
                    </Text>
                  </View>
                )}
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                  {format(new Date(item.created_at), 'd MMM yyyy', { locale: es })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: Spacing.xs }}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
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
    </SafeAreaView>
  );
}
