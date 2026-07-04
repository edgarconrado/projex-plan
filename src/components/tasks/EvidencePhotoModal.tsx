import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { uploadFile, generateFileName, STORAGE_BUCKETS } from '../../lib/supabase';

interface EvidencePhotoModalProps {
  visible: boolean;
  taskTitle: string;
  projectId: string;
  onConfirm: (photoUrl: string) => Promise<void>;
  onSkip: () => Promise<void>;
  onClose: () => void;
}

export function EvidencePhotoModal({
  visible, taskTitle, projectId, onConfirm, onSkip, onClose,
}: EvidencePhotoModalProps) {
  const { colors, typography } = useTheme();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const reset = () => setPhotoUri(null);

  const handleClose = () => { reset(); onClose(); };

  const pickPhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('Permiso requerido', fromCamera
        ? 'Necesitamos acceso a tu cámara'
        : 'Necesitamos acceso a tu galería');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    if (!photoUri) return;
    setIsUploading(true);
    try {
      const path = `${projectId}/evidence/${generateFileName('evidencia.jpg')}`;
      const url = await uploadFile(STORAGE_BUCKETS.PHOTOS, path, photoUri, 'image/jpeg');
      reset();
      await onConfirm(url);
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = async () => {
    reset();
    await onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: Spacing.lg, gap: Spacing.md,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.success}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <View>
                <Text style={[typography.bodySmall, { fontWeight: '700' }]}>Completar tarea</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{taskTitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            Agrega una foto como evidencia del trabajo completado
          </Text>

          {/* Preview de foto */}
          {photoUri ? (
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', height: 200, borderRadius: Radius.lg }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setPhotoUri(null)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16,
                  width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <TouchableOpacity
                onPress={() => pickPhoto(true)}
                style={{
                  flex: 1, backgroundColor: colors.surfaceSecondary,
                  borderRadius: Radius.lg, borderWidth: 1,
                  borderColor: colors.border, borderStyle: 'dashed',
                  padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
                }}
              >
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickPhoto(false)}
                style={{
                  flex: 1, backgroundColor: colors.surfaceSecondary,
                  borderRadius: Radius.lg, borderWidth: 1,
                  borderColor: colors.border, borderStyle: 'dashed',
                  padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
                }}
              >
                <Ionicons name="image-outline" size={28} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>Galería</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Botones */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!photoUri || isUploading}
            style={{
              backgroundColor: colors.success, borderRadius: Radius.lg,
              padding: Spacing.md, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              opacity: (!photoUri || isUploading) ? 0.5 : 1,
            }}
          >
            {isUploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            }
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {isUploading ? 'Subiendo...' : 'Completar con evidencia'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={isUploading}
            style={{ padding: Spacing.sm, alignItems: 'center' }}
          >
            <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
              Completar sin foto de evidencia
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
