import { useState } from 'react';
import {
  View, Text, Modal,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { Button } from '../ui';
import { Plan } from '../../types';

interface NewRevisionModalProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  onUpload: (fileUri: string, fileName: string, mimeType: string) => Promise<void>;
  uploadProgress: number;
  onOpenMap?: () => void;
}

export function NewRevisionModal({ visible, onClose, plan, onUpload, uploadProgress, onOpenMap }: NewRevisionModalProps) {
  const { colors, typography } = useTheme();
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
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: Spacing.xl }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md }}>
          <Text style={typography.h4}>🔄 Nueva revisión</Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
            {plan.title} · Revisión actual: {plan.revision}
          </Text>

          {error ? (
            <View style={{ backgroundColor: colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 0.5, borderColor: colors.danger }}>
              <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <TouchableOpacity onPress={pickDocument} style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
              <Ionicons name="document-outline" size={22} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>Archivo / PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>Galería</Text>
            </TouchableOpacity>
            {onOpenMap && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  setTimeout(() => onOpenMap(), 500);
                }}
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="map-outline" size={22} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Mapa</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedFile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.successMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 0.5, borderColor: colors.success }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[typography.bodySmall, { color: colors.success, flex: 1 }]} numberOfLines={1}>{selectedFile.name}</Text>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close" size={16} color={colors.success} />
              </TouchableOpacity>
            </View>
          )}

          {loading && uploadProgress > 0 && (
            <View style={{ gap: 6 }}>
              <View style={{ height: 4, backgroundColor: colors.surfaceTertiary, borderRadius: 2 }}>
                <View style={{ height: 4, width: `${uploadProgress}%`, backgroundColor: colors.primary, borderRadius: 2 }} />
              </View>
            </View>
          )}

          <Text style={[typography.caption, { color: colors.textMuted }]}>
            La revisión anterior se guarda en el historial con sus anotaciones. Esta nueva versión empezará sin marcas.
          </Text>

          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
            <TouchableOpacity
              onPress={() => { reset(); onClose(); }}
              style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Cancelar</Text>
            </TouchableOpacity>
            <Button label="Subir revisión" onPress={handleUpload} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
