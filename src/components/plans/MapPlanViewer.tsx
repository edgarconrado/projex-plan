import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Alert,
  ActivityIndicator, Modal,
} from 'react-native';
import MapView, { MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { uploadFile, generateFileName, STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface MapPlanViewerProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onPlanSaved: () => void;
}

export function MapPlanViewer({ visible, onClose, projectId, onPlanSaved }: MapPlanViewerProps) {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<MapType>('satellite');
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [region, setRegion] = useState({
    latitude: 20.6597, longitude: -103.3496, // Guadalajara por defecto
    latitudeDelta: 0.005, longitudeDelta: 0.005,
  });

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu ubicación');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      });
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setIsLocating(false);
    }
  };

  const handleCapture = async () => {
    if (!mapRef.current || !user) return;
    setIsSaving(true);
    try {
      // Capturar la vista del mapa como imagen
      const uri = await captureRef(mapRef, {
        format: 'jpg',
        quality: 0.9,
      });

      // Subir la imagen a Supabase Storage
      const fileName = generateFileName('mapa_sitio.jpg');
      const path = `${projectId}/maps/${fileName}`;
      const url = await uploadFile(STORAGE_BUCKETS.PLANS, path, uri, 'image/jpeg');

      // Guardar como plano en la BD
      const { error } = await supabase.from('plans').insert({
        project_id: projectId,
        uploaded_by: user.id,
        title: 'Mapa de sitio',
        code: `MAP-${Date.now().toString().slice(-4)}`,
        discipline: 'Topografía',
        revision: 'Rev. 1',
        status: 'Vigente',
        file_url: url,
        file_name: fileName,
        file_type: 'jpg',
        mime_type: 'image/jpeg',
        is_current_revision: true,
      });

      if (error) throw error;

      Alert.alert('✅ Guardado', 'El mapa de sitio se guardó como plano del proyecto');
      onPlanSaved();
      onClose();
    } catch (e) {
      console.log('[MapPlanViewer] Error:', e);
      Alert.alert('Error', 'No se pudo guardar el mapa');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMapType = () => {
    setMapType((prev) => prev === 'satellite' ? 'standard' : 'satellite');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: Spacing.md,
          backgroundColor: Colors.surface, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.h4]}>Mapa de sitio</Text>
          <TouchableOpacity onPress={toggleMapType}>
            <Ionicons
              name={mapType === 'satellite' ? 'map-outline' : 'earth-outline'}
              size={24} color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Mapa */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType={mapType}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsScale
        />

        {/* Botones flotantes */}
        <View style={{
          position: 'absolute', right: Spacing.lg, bottom: 140,
          gap: Spacing.sm,
        }}>
          {/* Localizar */}
          <TouchableOpacity
            onPress={handleLocateMe}
            disabled={isLocating}
            style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: Colors.surface,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
            }}
          >
            {isLocating
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Ionicons name="locate-outline" size={22} color={Colors.primary} />
            }
          </TouchableOpacity>
        </View>

        {/* Panel inferior */}
        <View style={{
          backgroundColor: Colors.surface,
          borderTopWidth: 0.5, borderTopColor: Colors.border,
          padding: Spacing.lg, gap: Spacing.sm,
        }}>
          <Text style={[Typography.caption, { color: Colors.textMuted, textAlign: 'center' }]}>
            Navega y centra el mapa en el área de tu proyecto
          </Text>
          <TouchableOpacity
            onPress={handleCapture}
            disabled={isSaving}
            style={{
              backgroundColor: Colors.primary, borderRadius: Radius.lg,
              padding: Spacing.md, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving
              ? <ActivityIndicator size="small" color={Colors.textInverse} />
              : <Ionicons name="camera-outline" size={20} color={Colors.textInverse} />
            }
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textInverse }}>
              {isSaving ? 'Guardando...' : 'Usar este mapa como plano'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
