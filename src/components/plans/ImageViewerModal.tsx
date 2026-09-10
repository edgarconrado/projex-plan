import { useState, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  Image, Dimensions, ActivityIndicator,
  Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export function ImageViewerModal({ visible, imageUrl, fileName, onClose }: ImageViewerModalProps) {
  const { colors, typography } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Animated.ValueXY/Value de la API legacy de RN — no requiere gesture-handler ni reanimated
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const currentScale = useRef(1);
  const currentTranslate = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const initialPinchDistance = useRef<number | null>(null);
  const initialScaleOnPinch = useRef(1);

  const resetTransform = () => {
    currentScale.current = 1;
    currentTranslate.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(translate, { toValue: { x: 0, y: 0 }, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const handleClose = () => {
    setLoaded(false);
    setError(false);
    resetTransform();
    onClose();
  };

  const getDistance = (touches: any[]) => {
    const [a, b] = touches;
    return Math.sqrt(Math.pow(a.pageX - b.pageX, 2) + Math.pow(a.pageY - b.pageY, 2));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          initialPinchDistance.current = getDistance(evt.nativeEvent.touches);
          initialScaleOnPinch.current = currentScale.current;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Pellizco con dos dedos
          if (initialPinchDistance.current === null) {
            initialPinchDistance.current = getDistance(touches);
            initialScaleOnPinch.current = currentScale.current;
          }
          const newDistance = getDistance(touches);
          const ratio = newDistance / initialPinchDistance.current;
          const newScale = Math.max(1, Math.min(initialScaleOnPinch.current * ratio, 5));
          currentScale.current = newScale;
          scale.setValue(newScale);
        } else if (touches.length === 1 && currentScale.current > 1) {
          // Arrastrar cuando hay zoom activo
          translate.setValue({
            x: currentTranslate.current.x + gestureState.dx,
            y: currentTranslate.current.y + gestureState.dy,
          });
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        initialPinchDistance.current = null;
        if (currentScale.current > 1) {
          currentTranslate.current = {
            x: currentTranslate.current.x + gestureState.dx,
            y: currentTranslate.current.y + gestureState.dy,
          };
        } else {
          resetTransform();
        }

        // Detección de doble toque (solo si fue un tap simple, sin arrastre)
        const isTap = Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;
        if (isTap) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            if (currentScale.current > 1) {
              resetTransform();
            } else {
              currentScale.current = 2.5;
              Animated.timing(scale, { toValue: 2.5, duration: 200, useNativeDriver: false }).start();
            }
          }
          lastTap.current = now;
        }
      },
    })
  ).current;

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
            <Text style={[typography.bodySmall, { color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm }]} numberOfLines={1}>
              {fileName}
            </Text>
          )}
          <View style={{ width: 26 }} />
        </View>

        {!loaded && !error && (
          <ActivityIndicator size="large" color={colors.primary} style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 }} />
        )}

        {error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl }}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
            <Text style={{ color: '#fff', textAlign: 'center' }}>No se pudo cargar la imagen</Text>
          </View>
        ) : (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            {...panResponder.panHandlers}
          >
            <Animated.View
              style={{
                width: SCREEN_W, height: SCREEN_H * 0.8,
                alignItems: 'center', justifyContent: 'center',
                transform: [
                  { translateX: translate.x },
                  { translateY: translate.y },
                  { scale },
                ],
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
              />
            </Animated.View>
          </View>
        )}

        {!error && (
          <Text style={{
            position: 'absolute', bottom: 40, left: 0, right: 0,
            textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11,
          }}>
            Doble toque o pellizca para acercar
          </Text>
        )}
      </View>
    </Modal>
  );
}
