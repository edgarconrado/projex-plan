import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView, BackHandler,
  Alert, RefreshControl, ActivityIndicator,
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
import { PlanCompareModal } from '../../src/components/plans/PlanCompareModal';
import { FolderFormModal } from '../../src/components/plans/FolderFormModal';
import { MoveToFolderModal } from '../../src/components/plans/MoveToFolderModal';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { EmptyState, LoadingOverlay, Badge } from '../../src/components/ui';
import { Plan } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useOfflineFiles } from '../../src/hooks/useOfflineFiles';
import { useUploadQueue } from '../../src/hooks/useUploadQueue';
import { UploadQueueBanner } from '../../src/components/ui/UploadQueueBanner';
import {
  breadcrumbOf, childrenOf, createFolder, deleteFolder, fetchFolderTree,
  movePlansToFolder, renameFolder, type PlanFolder,
} from '../../src/lib/planFolders';

export default function PlansScreen() {
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { downloading, progress, isCached, loadCachedIds, downloadFile, getLocalPath, removeFile } = useOfflineFiles();
  const { queue: uploadQueue, pendingCount, isProcessing, enqueue, processQueue, retryItem, removeItem } = useUploadQueue(
    async (localPath, fileName, mimeType, meta) => {
      await uploadPlan(localPath, fileName, mimeType, meta);
      await fetchPlans();
    },
  );
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { plans, isLoading, uploadProgress, fetchPlans, uploadPlan, deletePlan, addAnnotation, deleteAnnotation, updateScale, uploadRevision, fetchRevisionHistory } = usePlans(projectId ?? '');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyTargetPlan, setHistoryTargetPlan] = useState<Plan | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparePlan, setComparePlan] = useState<Plan | null>(null);
  const [comparePlanId, setComparePlanId] = useState('');
  const [comparePlanTitle, setComparePlanTitle] = useState('');

  // ---- Carpetas -------------------------------------------------------------
  // La navegación entre carpetas es estado local, no rutas: así se conserva
  // todo lo de esta pantalla (subida, offline, revisiones) sin duplicarlo.
  const [tree, setTree] = useState<PlanFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ mode: 'create' | 'rename'; target?: PlanFolder } | null>(null);
  const [movingPlan, setMovingPlan] = useState<Plan | null>(null);

  const loadTree = async () => {
    if (!projectId) return;
    try { setTree(await fetchFolderTree(projectId)); }
    catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'No se pudieron cargar las carpetas'); }
  };

  useEffect(() => { fetchPlans(); loadCachedIds(); loadTree(); }, [fetchPlans, loadCachedIds, projectId]);

  // Botón físico de Android: si estamos dentro de una carpeta, sube un nivel
  // en vez de salir de la pantalla.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedPlan) { setSelectedPlan(null); return true; }
      if (currentFolderId) { setCurrentFolderId(parentOf(currentFolderId)); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentFolderId, selectedPlan, tree]);

  const parentOf = (id: string) => tree.find((f) => f.id === id)?.parent_id ?? null;

  const crumbs = useMemo(() => breadcrumbOf(tree, currentFolderId), [tree, currentFolderId]);
  const subfolders = useMemo(() => childrenOf(tree, currentFolderId), [tree, currentFolderId]);
  const visiblePlans = useMemo(
    () => plans.filter((p) => (p.folder_id ?? null) === currentFolderId),
    [plans, currentFolderId],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPlans(), loadTree()]);
    setRefreshing(false);
  };

  const handleSubmitFolder = async (name: string) => {
    if (!projectId) return;
    if (folderModal?.mode === 'create') {
      await createFolder({ projectId, parentId: currentFolderId, name, tree });
    } else if (folderModal?.target) {
      await renameFolder(folderModal.target.id, name);
    }
    setFolderModal(null);
    await loadTree();
  };

  const confirmDeleteFolder = (folder: PlanFolder) => {
    const parts: string[] = [];
    if (folder.subfolder_count > 0) parts.push(`Se eliminarán ${folder.subfolder_count} subcarpeta${folder.subfolder_count === 1 ? '' : 's'}.`);
    if (folder.plan_count > 0) parts.push(`${folder.plan_count} plano${folder.plan_count === 1 ? '' : 's'} saldrán de la carpeta.`);
    parts.push('Ningún plano se elimina.');

    Alert.alert(`Eliminar "${folder.name}"`, parts.join('\n'), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await deleteFolder(folder.id); await Promise.all([loadTree(), fetchPlans()]); }
          catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar'); }
        },
      },
    ]);
  };

  const openFolderMenu = (folder: PlanFolder) => {
    Alert.alert(folder.name, undefined, [
      { text: 'Renombrar', onPress: () => setFolderModal({ mode: 'rename', target: folder }) },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirmDeleteFolder(folder) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleMovePlan = async (folderId: string | null) => {
    if (!movingPlan) return;
    try {
      await movePlansToFolder([movingPlan], folderId);
      setMovingPlan(null);
      await Promise.all([fetchPlans(), loadTree()]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo mover');
    }
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
            onPress={() => { setComparePlan(plan); setComparePlanId(plan.id); setComparePlanTitle(plan.title); setShowCompareModal(true); }}
            style={{ padding: 6 }}
          >
            <Ionicons name="layers-outline" size={20} color={colors.primary} />
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
          onOpenMap={() => setShowMapModal(true)}
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

        <PlanCompareModal
          visible={showCompareModal}
          onClose={() => { setShowCompareModal(false); setComparePlan(null); setComparePlanId(''); setComparePlanTitle(''); }}
          planId={comparePlanId}
          planTitle={comparePlanTitle}
          projectId={projectId ?? ''}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <TouchableOpacity
          onPress={() => (currentFolderId ? setCurrentFolderId(parentOf(currentFolderId)) : router.back())}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h3} numberOfLines={1}>
            {currentFolderId ? crumbs[crumbs.length - 1]?.name : 'Planos'}
          </Text>
          {projectName && <Text style={[typography.caption, { color: colors.textMuted }]}>{projectName}</Text>}
        </View>

        <TouchableOpacity
          onPress={() => setFolderModal({ mode: 'create' })}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 0.5, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="folder-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setUploadModalVisible(true)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Breadcrumb: cada nivel regresa de golpe, sin ir de uno en uno */}
      {crumbs.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 40, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, alignItems: 'center' }}
        >
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <View key={c.id ?? 'root'} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity disabled={last} onPress={() => setCurrentFolderId(c.id)}>
                  <Text style={[typography.caption, { color: last ? colors.primary : colors.textSecondary, paddingVertical: Spacing.sm }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
                {!last && <Text style={[typography.caption, { color: colors.textMuted, marginHorizontal: 6 }]}>›</Text>}
              </View>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={visiblePlans}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: Spacing.md }}>
            {uploadQueue.length > 0 && (
              <UploadQueueBanner
                queue={uploadQueue}
                isProcessing={isProcessing}
                onRetry={retryItem}
                onRemove={removeItem}
              />
            )}

            {subfolders.map((f) => {
              const detail = [
                f.subfolder_count > 0 ? `${f.subfolder_count} carpeta${f.subfolder_count === 1 ? '' : 's'}` : null,
                `${f.plan_count} plano${f.plan_count === 1 ? '' : 's'}`,
              ].filter(Boolean).join(' · ');

              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setCurrentFolderId(f.id)}
                  onLongPress={() => openFolderMenu(f)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                    backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg,
                    borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md,
                  }}
                >
                  <Ionicons name="folder" size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { fontWeight: '600' }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{detail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}

            {subfolders.length > 0 && visiblePlans.length > 0 && (
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                Planos en esta carpeta
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          subfolders.length > 0 ? null : (
            <EmptyState
              icon={<Ionicons name="map-outline" size={48} color={colors.textMuted} />}
              title={currentFolderId ? 'Carpeta vacía' : 'Sin planos'}
              subtitle={
                currentFolderId
                  ? 'Sube un plano aquí con + o mueve uno existente desde otra carpeta'
                  : 'Crea una carpeta con el ícono de carpeta o sube el primer plano con +'
              }
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={async () => {
              if (!isOnline) {
                const localPath = await getLocalPath(item.id);
                if (localPath) {
                  setSelectedPlan({ ...item, file_url: localPath });
                } else {
                  Alert.alert('Sin conexión', 'Este plano no está disponible offline. Conéctate a internet o descárgalo primero tocando el ícono de nube.');
                }
                return;
              }
              setSelectedPlan(item);
            }}
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
                  onPress={(e) => { e.stopPropagation?.(); setMovingPlan(item); }}
                  style={{ padding: Spacing.xs }}
                >
                  <Ionicons name="folder-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); setHistoryTargetPlan(item); setHistoryModalVisible(true); }}
                  style={{ padding: Spacing.xs }}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: Spacing.xs }}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async (e) => {
                    e.stopPropagation?.();
                    if (!item.file_url) return;
                    if (isCached(item.id)) {
                      Alert.alert(
                        'Archivo disponible offline',
                        '¿Quieres eliminar la copia local?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => removeFile(item.id) },
                        ]
                      );
                      return;
                    }
                    if (!isOnline) { Alert.alert('Sin conexión', 'Necesitas internet para descargar'); return; }
                    const ext = item.file_type === 'pdf' ? 'pdf' : 'jpg';
                    const result = await downloadFile(item.id, item.file_url, `${item.code}.${ext}`, item.file_type ?? 'image/jpeg');
                    if (result) Alert.alert('✅ Descargado', 'El plano ya está disponible sin conexión');
                    else Alert.alert('Error', 'No se pudo descargar el archivo');
                  }}
                  style={{ padding: Spacing.xs }}
                >
                  {downloading[item.id] ? (
                    <View style={{ position: 'relative' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      {progress[item.id] > 0 && (
                        <Text style={{ fontSize: 8, color: colors.primary, textAlign: 'center' }}>{progress[item.id]}%</Text>
                      )}
                    </View>
                  ) : (
                    <Ionicons
                      name={isCached(item.id) ? 'checkmark-circle' : 'cloud-download-outline'}
                      size={16}
                      color={isCached(item.id) ? colors.success : colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <UploadPlanModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onUpload={async (fileUri, fileName, mimeType, meta) => {
          if (!isOnline) {
            await enqueue('plan', projectId ?? '', fileUri, fileName, mimeType, meta);
            setUploadModalVisible(false);
          } else {
            const newPlan = await uploadPlan(fileUri, fileName, mimeType, meta);
            // El plano cae en la carpeta donde está parado el usuario.
            if (newPlan && currentFolderId) {
              await movePlansToFolder([newPlan], currentFolderId);
            }
            await Promise.all([fetchPlans(), loadTree()]);
          }
        }}
        uploadProgress={uploadProgress}
        onOpenMap={() => setShowMapModal(true)}
      />

      <FolderFormModal
        visible={folderModal !== null}
        mode={folderModal?.mode ?? 'create'}
        initialName={folderModal?.target?.name}
        parentName={folderModal?.mode === 'create' && currentFolderId ? crumbs[crumbs.length - 1]?.name : undefined}
        onCancel={() => setFolderModal(null)}
        onSubmit={handleSubmitFolder}
      />

      <MoveToFolderModal
        visible={movingPlan !== null}
        tree={tree}
        currentFolderId={movingPlan?.folder_id ?? null}
        planTitle={movingPlan?.title}
        onCancel={() => setMovingPlan(null)}
        onSelect={handleMovePlan}
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