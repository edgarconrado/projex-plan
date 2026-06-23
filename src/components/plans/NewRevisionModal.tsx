import { useState } from 'react';
import {
  View, Text, Modal,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { Button } from '../ui';
import { Plan } from '../../types';

interface NewRevisionModalProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  onUpload: (fileUri: string, fileName: string, mimeType: string) => Promise<void>;
  uploadProgress: number;
}

export function NewRevisionModal({ visible, onClose, plan, onUpload, uploadProgress }: NewRevisionModalProps) {
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedFile(null);
    setError('');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() ?? 'plano.jpg';
      setSelectedFile({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Selecciona un archivo'); return; }
    setError(''); setLoading(true);
    try {
      await onUpload(selectedFile.uri, selectedFile.name, selectedFile.mimeType);
      reset();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir la revisión');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={{ flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: Spacing.xl }}>
        <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md }}>
          <Text style={Typography.h4}>🔄 Nueva revisión</Text>
          <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>
            {plan.title} · Revisión actual: {plan.revision}
          </Text>

          {error ? (
            <View style={{ backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 0.5, borderColor: Colors.danger }}>
              <Text style={[Typography.caption, { color: Colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <TouchableOpacity onPress={pickDocument} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
              <Ionicons name="document-outline" size={22} color={Colors.textMuted} />
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>Archivo / PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
              <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
              <Text style={[Typography.caption, { color: Colors.textMuted }]}>Galería</Text>
            </TouchableOpacity>
          </View>

          {selectedFile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 0.5, borderColor: Colors.success }}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={[Typography.bodySmall, { color: Colors.success, flex: 1 }]} numberOfLines={1}>{selectedFile.name}</Text>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close" size={16} color={Colors.success} />
              </TouchableOpacity>
            </View>
          )}

          {loading && uploadProgress > 0 && (
            <View style={{ gap: 6 }}>
              <View style={{ height: 4, backgroundColor: Colors.surfaceTertiary, borderRadius: 2 }}>
                <View style={{ height: 4, width: `${uploadProgress}%`, backgroundColor: Colors.primary, borderRadius: 2 }} />
              </View>
            </View>
          )}

          <Text style={[Typography.caption, { color: Colors.textMuted }]}>
            La revisión anterior se guarda en el historial con sus anotaciones. Esta nueva versión empezará sin marcas.
          </Text>

          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
            <TouchableOpacity
              onPress={() => { reset(); onClose(); }}
              style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.textSecondary, fontWeight: '500' }}>Cancelar</Text>
            </TouchableOpacity>
            <Button label="Subir revisión" onPress={handleUpload} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
