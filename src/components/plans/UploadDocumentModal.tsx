import { useState } from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { Button, Input } from '../ui';

interface UploadDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    fileUri: string, fileName: string, mimeType: string, fileSize: number,
    meta: { description?: string; documentType?: string }
  ) => Promise<void>;
  uploadProgress: number;
}

const DOC_TYPES = ['Contrato', 'Factura', 'Reporte', 'Foto de obra', 'Permiso', 'Manual', 'Otro'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDocumentModal({ visible, onClose, onUpload, uploadProgress }: UploadDocumentModalProps) {
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState('Otro');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedFile(null);
    setDescription('');
    setDocType('Otro');
    setError('');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf', 'image/*', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? 'application/octet-stream',
          size: asset.size ?? 0,
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() ?? 'imagen.jpg';
      setSelectedFile({
        uri: asset.uri,
        name,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize ?? 0,
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = `foto_${Date.now()}.jpg`;
      setSelectedFile({
        uri: asset.uri,
        name,
        mimeType: 'image/jpeg',
        size: asset.fileSize ?? 0,
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Selecciona un archivo'); return; }
    setError(''); setLoading(true);
    try {
      await onUpload(selectedFile.uri, selectedFile.name, selectedFile.mimeType, selectedFile.size, {
        description: description.trim() || undefined,
        documentType: docType,
      });
      reset();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={Typography.h4}>Subir documento</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={{ backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.danger }}>
              <Text style={[Typography.bodySmall, { color: Colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <View style={{ gap: Spacing.sm }}>
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Archivo *</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity onPress={pickDocument} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-outline" size={22} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>Archivo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
                <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
                <Ionicons name="camera-outline" size={22} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>Cámara</Text>
              </TouchableOpacity>
            </View>

            {selectedFile && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 0.5, borderColor: Colors.success }}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodySmall, { color: Colors.success }]} numberOfLines={1}>{selectedFile.name}</Text>
                  {selectedFile.size > 0 && (
                    <Text style={[Typography.caption, { color: Colors.success }]}>{formatFileSize(selectedFile.size)}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Ionicons name="close" size={16} color={Colors.success} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {loading && uploadProgress > 0 && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>Subiendo...</Text>
                <Text style={[Typography.caption, { color: Colors.primary }]}>{uploadProgress}%</Text>
              </View>
              <View style={{ height: 4, backgroundColor: Colors.surfaceTertiary, borderRadius: 2 }}>
                <View style={{ height: 4, width: `${uploadProgress}%`, backgroundColor: Colors.primary, borderRadius: 2 }} />
              </View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Tipo de documento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DOC_TYPES.map((t) => (
                  <TouchableOpacity key={t} onPress={() => setDocType(t)}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                      borderColor: docType === t ? Colors.primary : Colors.border,
                      backgroundColor: docType === t ? Colors.primaryMuted : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: docType === t ? Colors.primary : Colors.textSecondary }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <Input
            label="Descripción (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Notas sobre este documento..."
            multiline
            numberOfLines={2}
            style={{ height: 60, textAlignVertical: 'top', paddingTop: 8 }}
          />

          <Button label="Subir documento" onPress={handleUpload} loading={loading} size="lg" style={{ marginTop: Spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
