import { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  Alert, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { supabase, uploadFile, generateFileName, STORAGE_BUCKETS } from '../../lib/supabase';
import { Document } from '../../types';

interface ReferenceModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onAttach: (params: {
    attachmentUrl: string | null;
    attachmentType: string | null;
    attachmentThumbnail: string | null;
    documentId: string | null;
  }) => Promise<void>;
}

type Step = 'choose' | 'documents' | 'uploading';

export function ReferenceModal({ visible, onClose, projectId, onAttach }: ReferenceModalProps) {
  const { colors, typography } = useTheme();
  const [step, setStep] = useState<Step>('choose');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const reset = () => {
    setStep('choose');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const finishAttach = async (params: Parameters<ReferenceModalProps['onAttach']>[0]) => {
    setStep('uploading');
    try {
      await onAttach(params);
      reset();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo adjuntar la referencia');
      setStep('choose');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0].uri);
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri: string) => {
    setStep('uploading');
    try {
      const path = `${projectId}/refs/${generateFileName('ref.jpg')}`;
      const url = await uploadFile(STORAGE_BUCKETS.PHOTOS, path, uri, 'image/jpeg');
      await finishAttach({
        attachmentUrl: url,
        attachmentType: 'image/jpeg',
        attachmentThumbnail: url,
        documentId: null,
      });
    } catch (e: unknown) {
      Alert.alert('Error', 'No se pudo subir la foto');
      setStep('choose');
    }
  };

  const handlePickDocumentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setStep('uploading');
      const path = `${projectId}/refs/${generateFileName(asset.name)}`;
      const url = await uploadFile(STORAGE_BUCKETS.DOCUMENTS, path, asset.uri, asset.mimeType ?? 'application/octet-stream');
      await finishAttach({
        attachmentUrl: url,
        attachmentType: asset.mimeType ?? 'application/octet-stream',
        attachmentThumbnail: asset.mimeType?.startsWith('image/') ? url : null,
        documentId: null,
      });
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
      setStep('choose');
    }
  };

  const openExistingDocuments = async () => {
    setStep('documents');
    setLoadingDocs(true);
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      setDocuments((data ?? []) as Document[]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectExistingDocument = async (doc: Document) => {
    await finishAttach({
      attachmentUrl: doc.file_url,
      attachmentType: doc.mime_type,
      attachmentThumbnail: doc.mime_type?.startsWith('image/') ? doc.file_url : null,
      documentId: doc.id,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: Spacing.xl }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, maxHeight: '75%' }}>
          {step === 'choose' && (
            <>
              <Text style={typography.h4}>📎 Adjuntar referencia</Text>
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
                Selecciona una foto o documento para este punto del plano
              </Text>

              <TouchableOpacity
                onPress={handleTakePhoto}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: colors.border }}
              >
                <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>Tomar foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickFromGallery}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: colors.border }}
              >
                <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>Elegir de galería</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openExistingDocuments}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: colors.border }}
              >
                <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="folder-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>Documento existente del proyecto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickDocumentFile}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: colors.border }}
              >
                <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>Subir archivo nuevo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                style={{ marginTop: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'documents' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <TouchableOpacity onPress={() => setStep('choose')}>
                  <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={typography.h4}>Documentos del proyecto</Text>
              </View>

              {loadingDocs ? (
                <ActivityIndicator color={colors.primary} style={{ paddingVertical: Spacing.xl }} />
              ) : (
                <FlatList
                  data={documents}
                  keyExtractor={(d) => d.id}
                  style={{ maxHeight: 320 }}
                  ListEmptyComponent={
                    <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg }]}>
                      Este proyecto no tiene documentos subidos todavía
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelectExistingDocument(item)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
                    >
                      <Ionicons
                        name={item.mime_type?.startsWith('image/') ? 'image-outline' : 'document-outline'}
                        size={18} color={colors.textMuted}
                      />
                      <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>{item.file_name}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}

          {step === 'uploading' && (
            <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Subiendo referencia...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
