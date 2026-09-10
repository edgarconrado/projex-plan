// ============================================================================
// src/components/plans/PlanReaderModal.tsx
//
// Visor de lectura: zoom profundo y nítido, sin anotaciones.
//
// Por qué existe aparte del PlanViewer:
// el visor normal escala un View completo con Animated para que los pines
// sigan al plano. Eso mantiene las anotaciones sincronizadas y permite
// colocarlas con zoom puesto, pero amplía una imagen ya rasterizada, así que
// pasando de 2x todo se ve borroso.
//
// Aquí es al revés: no hay overlay que sincronizar, entonces el PDF puede
// usar su zoom nativo, que re-rasteriza el vector en cada nivel y se ve
// nítido a cualquier escala. Las imágenes usan expo-image sin downscaling,
// que decodifica a resolución original en vez de al tamaño de la vista.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, Animated,
  PanResponder, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import type { Plan } from '../../types';

let Pdf: React.ComponentType<any> | null = null;
try {
  Pdf = require('react-native-pdf').default;
} catch {
  Pdf = null;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const MAX_PDF_SCALE = 10;
const MAX_IMG_SCALE = 8;

type Props = {
  visible: boolean;
  onClose: () => void;
  plan: Plan;
  /** Ruta local del PDF ya descargado por PlanViewer. */
  pdfPath: string | null;
};

export function PlanReaderModal({ visible, onClose, plan, pdfPath }: Props) {
  const { colors, typography } = useTheme();
  const isPdf = plan.file_type === 'pdf';
  const [loaded, setLoaded] = useState(false);
  const [zoomLabel, setZoomLabel] = useState('100%');

  useEffect(() => {
    if (visible) { setLoaded(false); setZoomLabel('100%'); }
  }, [visible, plan.id]);

  // ---- Zoom para imágenes ---------------------------------------------------
  // Mismo enfoque de pinch manual que el visor normal (ScrollView.maximumZoomScale
  // no funciona en Android), pero sobre una imagen decodificada a resolución
  // completa, que es lo que hace que ampliar sirva de algo.
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentScale = useRef(1);
  const currentTranslate = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number | null>(null);
  const initialScaleOnPinch = useRef(1);
  const lastTap = useRef(0);

  const applyZoomLabel = (s: number) => setZoomLabel(`${Math.round(s * 100)}%`);

  const resetZoom = () => {
    currentScale.current = 1;
    currentTranslate.current = { x: 0, y: 0 };
    applyZoomLabel(1);
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { if (visible) resetZoom(); }, [visible]);

  const getTouchDistance = (touches: any[]) => {
    const [a, b] = touches;
    return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) return true;
        return currentScale.current > 1 && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          initialPinchDistance.current = getTouchDistance(evt.nativeEvent.touches);
          initialScaleOnPinch.current = currentScale.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          if (initialPinchDistance.current === null) {
            initialPinchDistance.current = getTouchDistance(touches);
            initialScaleOnPinch.current = currentScale.current;
          }
          const ratio = getTouchDistance(touches) / initialPinchDistance.current;
          const next = Math.max(1, Math.min(initialScaleOnPinch.current * ratio, MAX_IMG_SCALE));
          currentScale.current = next;
          scale.setValue(next);
          applyZoomLabel(next);
        } else if (touches.length === 1 && currentScale.current > 1) {
          translateX.setValue(currentTranslate.current.x + gestureState.dx);
          translateY.setValue(currentTranslate.current.y + gestureState.dy);
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
          resetZoom();
        }

        const isTap = Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;
        if (isTap) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            if (currentScale.current > 1) {
              resetZoom();
            } else {
              currentScale.current = 3;
              applyZoomLabel(3);
              Animated.timing(scale, { toValue: 3, duration: 200, useNativeDriver: true }).start();
            }
          }
          lastTap.current = now;
        }
      },
    })
  ).current;

  const pdfUnavailable = isPdf && (!Pdf || !pdfPath);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header flotante para no robarle alto al plano */}
        <View style={{
          position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 0, right: 0, zIndex: 10,
          flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
          paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: '#fff', fontWeight: '600' }]} numberOfLines={1}>
              {plan.title}
            </Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>
              {plan.code} · {plan.revision} · Modo lectura
            </Text>
          </View>
          {!isPdf && (
            <View style={{
              paddingHorizontal: Spacing.sm, paddingVertical: 4,
              borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)',
            }}>
              <Text style={[typography.caption, { color: '#fff' }]}>{zoomLabel}</Text>
            </View>
          )}
        </View>

        {isPdf ? (
          pdfUnavailable ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl }}>
              <Ionicons name="document-outline" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={[typography.body, { color: 'rgba(255,255,255,0.6)', textAlign: 'center' }]}>
                {Pdf ? 'El PDF aún se está descargando.' : 'El visor de PDF no está disponible en Expo Go.'}
              </Text>
            </View>
          ) : (
            <Pdf
              source={{ uri: pdfPath!, cache: false }}
              style={{ flex: 1, width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' }}
              onLoadComplete={() => setLoaded(true)}
              onError={(e: unknown) => console.warn('[PlanReader] PDF:', e)}
              // Aquí está el cambio de fondo: el zoom lo maneja la librería,
              // que vuelve a rasterizar el vector en cada nivel. Por eso se ve
              // nítido a 10x, en vez de estirar un bitmap de 1080 px.
              minScale={1}
              maxScale={MAX_PDF_SCALE}
              enableDoubleTapZoom
              enablePaging={false}
              horizontal={false}
              fitPolicy={0}
              spacing={8}
            />
          )
        ) : (
          <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateX }, { translateY }, { scale }],
              }}
            >
              <Image
                source={{ uri: plan.file_url }}
                style={{ flex: 1 }}
                contentFit="contain"
                // Sin esto, Android decodifica la imagen al tamaño de la vista
                // (~1080 px) y ampliar no revela ningún detalle nuevo.
                allowDownscaling={false}
                cachePolicy="memory-disk"
                onLoadEnd={() => setLoaded(true)}
              />
            </Animated.View>
          </View>
        )}

        {!loaded && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {/* Pista de uso: se va sola en cuanto carga el plano */}
        {loaded && (
          <View style={{
            position: 'absolute', bottom: 40, alignSelf: 'center',
            paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
            borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.6)',
          }}>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)' }]}>
              Pellizca para acercar · Doble toque para ajustar
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
