import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Alert, RefreshControl, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocuments } from '../../src/hooks/useDocuments';
import { UploadDocumentModal } from '../../src/components/plans/UploadDocumentModal';
import { ImageViewerModal } from '../../src/components/plans/ImageViewerModal';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { EmptyState, LoadingOverlay, Avatar } from '../../src/components/ui';
import { Document } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useOfflineFiles } from '../../src/hooks/useOfflineFiles';

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType?: string | null): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (!mimeType) return { name: 'document-outline', color: '#6B7280' };
  if (mimeType.startsWith('image/')) return { name: 'image-outline', color: '#3B82F6' };
  if (mimeType === 'application/pdf') return { name: 'document-text-outline', color: '#EF4444' };
  if (mimeType.includes('word')) return { name: 'document-outline', color: '#3B82F6' };
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return { name: 'grid-outline', color: '#22C55E' };
  return { name: 'document-outline', color: '#6B7280' };
}

export default function DocumentsScreen() {
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { downloading, progress, isCached, loadCachedIds, downloadFile, getLocalPath, removeFile } = useOfflineFiles();
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { documents, isLoading, uploadProgress, fetchDocuments, uploadDocument, deleteDocument } = useDocuments(projectId ?? '');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => { fetchDocuments(); loadCachedIds(); }, [fetchDocuments, loadCachedIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };

  const handleOpen = async (doc: Document) => {
    if (!isOnline) {
      const localPath = await getLocalPath(doc.id);
      if (localPath) {
        const isImage = doc.mime_type?.startsWith('image/');
        if (isImage) {
          setViewerImage({ url: localPath, name: doc.file_name });
        } else {
          Linking.openURL(`file://${localPath}`).catch(() => {
            Alert.alert('Error', 'No se pudo abrir el archivo local');
          });
        }
      } else {
        Alert.alert('Sin conexión', 'Este documento no está disponible offline. Conéctate a internet o descárgalo primero tocando el ícono de nube.');
      }
      return;
    }
    const isImage = doc.mime_type?.startsWith('image/');
    if (isImage) {
      setViewerImage({ url: doc.file_url, name: doc.file_name });
    } else {
      Linking.openURL(doc.file_url).catch(() => {
        Alert.alert('Error', 'No se pudo abrir el archivo');
      });
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert('Eliminar documento', `¿Eliminar "${doc.file_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await deleteDocument(doc.id); }
          catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Error al eliminar'); }
        },
      },
    ]);
  };

  if (isLoading && documents.length === 0) return <LoadingOverlay message="Cargando documentos..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h3}>Documentos</Text>
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
        data={documents}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />}
            title="Sin documentos"
            subtitle="Sube contratos, fotos, reportes o cualquier archivo del proyecto"
          />
        }
        renderItem={({ item }) => {
          const icon = getFileIcon(item.mime_type);
          return (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              style={{
                backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg,
                borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md,
                flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: `${icon.color}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon.name} size={20} color={icon.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { fontWeight: '600' }]} numberOfLines={1}>{item.file_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2, flexWrap: 'wrap' }}>
                  {item.document_type && (
                    <View style={{ backgroundColor: colors.primaryMuted, paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>{item.document_type}</Text>
                    </View>
                  )}
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {formatFileSize(item.file_size)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {format(new Date(item.created_at), 'd MMM yyyy', { locale: es })}
                  </Text>
                </View>
                {item.description ? (
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 3 }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
                {item.uploader && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Avatar name={item.uploader.full_name} imageUrl={item.uploader.avatar_url} size={14} />
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{item.uploader.full_name}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: Spacing.xs }}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async (e) => {
                  e.stopPropagation?.();
                  if (!item.file_url) return;
                  if (isCached(item.id)) {
                    Alert.alert('Archivo disponible offline', '¿Quieres eliminar la copia local?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => removeFile(item.id) },
                    ]);
                    return;
                  }
                  if (!isOnline) { Alert.alert('Sin conexión', 'Necesitas internet para descargar'); return; }
                  const result = await downloadFile(item.id, item.file_url, item.file_name, item.mime_type ?? 'application/octet-stream');
                  if (result) Alert.alert('✅ Descargado', 'El documento ya está disponible sin conexión');
                  else Alert.alert('Error', 'No se pudo descargar el archivo');
                }}
                style={{ padding: Spacing.xs }}
              >
                {downloading[item.id] ? (
                  <View>
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
            </TouchableOpacity>
          );
        }}
      />

      <UploadDocumentModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onUpload={uploadDocument}
        uploadProgress={uploadProgress}
      />

      <ImageViewerModal
        visible={!!viewerImage}
        imageUrl={viewerImage?.url ?? null}
        fileName={viewerImage?.name}
        onClose={() => setViewerImage(null)}
      />
    </SafeAreaView>
  );
}
