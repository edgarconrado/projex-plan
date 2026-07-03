import { useState } from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MapPlanViewer } from './MapPlanViewer';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { Button, Input } from '../ui';

interface UploadPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    fileUri: string,
    fileName: string,
    mimeType: string,
    meta: { code: string; title: string; discipline: string; level: string; revision: string; scale?: string }
  ) => Promise<void>;
  uploadProgress: number;
}

const DISCIPLINES = ['Arquitectura', 'Estructura', 'Instalaciones', 'Mecánica', 'Eléctrico', 'Civil', 'Otro'];

export function UploadPlanModal({ visible, onClose, onUpload, uploadProgress, projectId, onPlanSaved }: UploadPlanModalProps) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState('Arquitectura');
  const [level, setLevel] = useState('General');
  const [revision, setRevision] = useState('Rev. 1');
  const [scale, setScale] = useState('1:100');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
        if (!title) setTitle(asset.name.replace(/\.[^.]+$/, ''));
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
      setSelectedFile({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
      if (!title) setTitle(name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Selecciona un archivo'); return; }
    if (!code.trim()) { setError('El código es requerido'); return; }
    if (!title.trim()) { setError('El título es requerido'); return; }
    setError(''); setLoading(true);
    try {
      await onUpload(selectedFile.uri, selectedFile.name, selectedFile.mimeType, {
        code: code.trim(), title: title.trim(), discipline, level, revision, scale,
      });
      onClose();
      setSelectedFile(null); setCode(''); setTitle('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity>
          <Text style={Typography.h4}>Subir plano</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={{ backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.danger }}>
              <Text style={[Typography.bodySmall, { color: Colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Selector de archivo */}
          <View style={{ gap: Spacing.sm }}>
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Archivo *</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity onPress={pickDocument} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-outline" size={24} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
                <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>Imagen</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMapViewer(true)} style={{ flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', padding: Spacing.md, alignItems: 'center', gap: 6 }}>
                <Ionicons name="map-outline" size={24} color={Colors.primary} />
                <Text style={[Typography.caption, { color: Colors.primary }]}>Mapa</Text>
              </TouchableOpacity>
            </View>
            {selectedFile && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 0.5, borderColor: Colors.success }}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={[Typography.bodySmall, { color: Colors.success, flex: 1 }]} numberOfLines={1}>{selectedFile.name}</Text>
              </View>
            )}
          </View>

          {/* Progress */}
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

          <Input label="Código *" value={code} onChangeText={setCode} placeholder="A-01" leftIcon={<Ionicons name="barcode-outline" size={18} color={Colors.textMuted} />} />
          <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Planta baja arquitectónica" leftIcon={<Ionicons name="document-text-outline" size={18} color={Colors.textMuted} />} />

          {/* Disciplina */}
          <View style={{ gap: 8 }}>
            <Text style={[Typography.label, { color: Colors.textSecondary }]}>Disciplina</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DISCIPLINES.map((d) => (
                  <TouchableOpacity key={d} onPress={() => setDiscipline(d)}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1,
                      borderColor: discipline === d ? Colors.primary : Colors.border,
                      backgroundColor: discipline === d ? Colors.primaryMuted : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: discipline === d ? Colors.primary : Colors.textSecondary }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}><Input label="Nivel" value={level} onChangeText={setLevel} placeholder="Planta baja" /></View>
            <View style={{ flex: 1 }}><Input label="Revisión" value={revision} onChangeText={setRevision} placeholder="Rev. 1" /></View>
          </View>
          <Input label="Escala" value={scale} onChangeText={setScale} placeholder="1:100" leftIcon={<Ionicons name="resize-outline" size={18} color={Colors.textMuted} />} />

          <Button label="Subir plano" onPress={handleUpload} loading={loading} size="lg" style={{ marginTop: Spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
      <MapPlanViewer
        visible={showMapViewer}
        onClose={() => setShowMapViewer(false)}
        projectId={projectId}
        onPlanSaved={() => {
          setShowMapViewer(false);
          onClose();
          onPlanSaved?.();
        }}
      />
    </>
  );
}
