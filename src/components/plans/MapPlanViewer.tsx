import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Alert,
  ActivityIndicator, Modal,
} from 'react-native';
import MapView, { MapType } from 'react-native-maps';
import { useSubscription } from '../../hooks/useSubscription';
import { PaywallModal } from '../ui/PaywallModal';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { uploadFile, generateFileName, STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface MapPlanViewerProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onPlanSaved: () => void;
}

export function MapPlanViewer({ visible, onClose, projectId, onPlanSaved }: MapPlanViewerProps) {
  const sub = useSubscription();
  const { colors, typography } = useTheme();
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
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
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
      // Esperar a que el mapa termine de renderizar completamente
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar la vista del mapa como imagen
      const uri = await captureRef(mapRef, {
        format: 'jpg',
        quality: 0.8,
        result: 'tmpfile',
      });
      console.log('[MapPlanViewer] URI capturada:', uri);

      // Subir la imagen a Supabase Storage
      const fileName = generateFileName('mapa_sitio.jpg');
      const path = `${projectId}/maps/${fileName}`;
      const url = await uploadFile(STORAGE_BUCKETS.PLANS, path, uri, 'image/jpeg');

      // Guardar como plano en la BD
      const mapFileName = `mapa_sitio_${Date.now()}.jpg`;
      const { error } = await supabase.from('plans').insert({
        project_id: projectId,
        uploaded_by: user.id,
        title: 'Mapa de sitio',
        code: `MAP-${Date.now().toString().slice(-4)}`,
        discipline: 'Topografía',
        revision: 'Rev. 1',
        status: 'Vigente',
        file_url: url,
        file_type: 'jpg',
        file_name: mapFileName,
        mime_type: 'image/jpeg',
        is_current_revision: true,
        level: 'Sitio',
        scale: '1:1000',
      });

      if (error) throw error;

      Alert.alert('✅ Guardado', 'El mapa de sitio se guardó como plano del proyecto');
      onPlanSaved();
      onClose();
    } catch (e: any) {
      console.log('[MapPlanViewer] Error completo:', JSON.stringify(e), e?.message, e?.stack);
      Alert.alert('Error', `No se pudo guardar el mapa: ${e?.message ?? JSON.stringify(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMapType = () => {
    setMapType((prev) => prev === 'satellite' ? 'standard' : 'satellite');
  };

  // Solo bloquear si confirmado que es Free (no durante la carga)
  if (!sub.isLoading && !sub.canUseMap && visible) {
    return (
      <PaywallModal
        visible={visible}
        onClose={onClose}
        feature="Mapa de sitio"
        description="Captura la ubicación exacta de tu obra y úsala como plano base para todo el equipo."
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: Spacing.md,
          backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[typography.h4]}>Mapa de sitio</Text>
          <TouchableOpacity onPress={toggleMapType}>
            <Ionicons
              name={mapType === 'satellite' ? 'map-outline' : 'earth-outline'}
              size={24} color={colors.primary}
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
              backgroundColor: colors.surface,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
            }}
          >
            {isLocating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="locate-outline" size={22} color={colors.primary} />
            }
          </TouchableOpacity>
        </View>

        {/* Panel inferior */}
        <View style={{
          backgroundColor: colors.surface,
          borderTopWidth: 0.5, borderTopColor: colors.border,
          padding: Spacing.lg, gap: Spacing.sm,
        }}>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            Navega y centra el mapa en el área de tu proyecto
          </Text>
          <TouchableOpacity
            onPress={handleCapture}
            disabled={isSaving}
            style={{
              backgroundColor: colors.primary, borderRadius: Radius.lg,
              padding: Spacing.md, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Ionicons name="camera-outline" size={20} color={colors.textInverse} />
            }
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textInverse }}>
              {isSaving ? 'Guardando...' : 'Usar este mapa como plano'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
