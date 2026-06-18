import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  Image, Dimensions, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../lib/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export function ImageViewerModal({ visible, imageUrl, fileName, onClose }: ImageViewerModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleClose = () => {
    setLoaded(false);
    setError(false);
    onClose();
  };

  if (!imageUrl) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}>
          <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {fileName && (
            <Text style={[Typography.bodySmall, { color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm }]} numberOfLines={1}>
              {fileName}
            </Text>
          )}
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {!loaded && !error && (
            <ActivityIndicator size="large" color={Colors.primary} style={{ position: 'absolute' }} />
          )}
          {error ? (
            <View style={{ alignItems: 'center', gap: Spacing.md, padding: Spacing.xl }}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.danger} />
              <Text style={{ color: '#fff', textAlign: 'center' }}>No se pudo cargar la imagen</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center' }} numberOfLines={2}>
                {imageUrl}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: SCREEN_W, height: SCREEN_H * 0.8 }}
              resizeMode="contain"
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                console.log('[ImageViewer] Error cargando imagen:', JSON.stringify(e.nativeEvent));
                setError(true);
              }}
            />
          )}
        </ScrollView>

        {!error && (
          <Text style={{
            position: 'absolute', bottom: 40, left: 0, right: 0,
            textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11,
          }}>
            Pellizca para hacer zoom
          </Text>
        )}
      </View>
    </Modal>
  );
}
