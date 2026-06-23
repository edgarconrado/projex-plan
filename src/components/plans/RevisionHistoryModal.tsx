import { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { Plan } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RevisionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  fetchHistory: (planGroupId: string) => Promise<Plan[]>;
  onSelectRevision: (revision: Plan) => void;
  projectId: string;
}

export function RevisionHistoryModal({
  visible, onClose, plan, fetchHistory, onSelectRevision, projectId,
}: RevisionHistoryModalProps) {
  const [history, setHistory] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible || !plan) return;
    const groupId = plan.plan_group_id ?? plan.id;
    setIsLoading(true);
    fetchHistory(groupId)
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, [visible, plan, fetchHistory]);

  if (!plan) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={Typography.h4}>Historial de revisiones</Text>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>{plan.title}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
            renderItem={({ item, index }) => {
              const isCurrent = item.is_current_revision;
              const annotationCount = item.annotations?.length ?? 0;
              const currentRevision = history.find((p) => p.is_current_revision);
              return (
                <View
                  style={{
                    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg,
                    borderWidth: isCurrent ? 1 : 0.5,
                    borderColor: isCurrent ? Colors.primary : Colors.border,
                    padding: Spacing.md,
                    gap: Spacing.sm,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => { onSelectRevision(item); onClose(); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: Radius.md,
                      backgroundColor: isCurrent ? Colors.primaryMuted : Colors.surfaceTertiary,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons
                        name={item.file_type === 'pdf' ? 'document-text-outline' : 'image-outline'}
                        size={20}
                        color={isCurrent ? Colors.primary : Colors.textMuted}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[Typography.body, { fontWeight: '600' }]}>Rev. {item.revision}</Text>
                        {isCurrent && (
                          <View style={{ backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.textInverse }}>VIGENTE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                        {format(new Date(item.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                        {item.uploader ? ` · ${item.uploader.full_name}` : ''}
                      </Text>
                      {annotationCount > 0 && (
                        <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 2 }]}>
                          {annotationCount} {annotationCount === 1 ? 'anotación' : 'anotaciones'}
                        </Text>
                      )}
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>

                  {!isCurrent && currentRevision && item.file_type !== 'pdf' && currentRevision.file_type !== 'pdf' && (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        router.push({
                          pathname: '/plans/compare',
                          params: {
                            planAId: item.id,
                            planBId: currentRevision.id,
                            planGroupId: plan?.plan_group_id ?? plan?.id ?? '',
                            projectId,
                          },
                        } as never);
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 8, borderRadius: Radius.md,
                        borderWidth: 0.5, borderColor: Colors.primary, backgroundColor: Colors.primaryMuted,
                      }}
                    >
                      <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.primary }}>Comparar con vigente</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm }}>
                <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
                <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>Sin revisiones anteriores</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
