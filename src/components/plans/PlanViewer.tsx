import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  ScrollView, Dimensions, Alert, TextInput,
  ActivityIndicator, Linking, Animated, PanResponder, AppState,
} from 'react-native';
import { Image } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
// react-native-pdf requiere native modules — no disponible en Expo Go
// Se usa require() condicional para evitar crash en desarrollo
let Pdf: React.ComponentType<any> | null = null;
try {
  Pdf = require('react-native-pdf').default;
} catch {
  Pdf = null;
}
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Plan, PlanAnnotation, AnnotationType } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { useAuth } from '../../lib/AuthContext';
import { ReferenceModal } from './ReferenceModal';
import { ImageViewerModal } from './ImageViewerModal';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIEWER_H = SCREEN_H * 0.65;

interface Point { x: number; y: number; }

interface PlanViewerProps {
  plan: Plan;
  onAddAnnotation: (dto: Omit<PlanAnnotation, 'id' | 'created_at' | 'creator'>) => Promise<void>;
  onDeleteAnnotation: (annotationId: string) => Promise<void>;
  onUpdateScale: (planId: string, scale: string) => Promise<void>;
}

const PIN_COLORS = [
  { color: '#EF4444', label: 'Urgente' },
  { color: '#FFD700', label: 'Revisión' },
  { color: '#22C55E', label: 'OK' },
  { color: '#3B82F6', label: 'Info' },
];

type ToolType = AnnotationType | 'none' | 'measure';

const ANNOTATION_TOOLS: { type: ToolType; icon: string; label: string }[] = [
  { type: 'none', icon: 'hand-left-outline', label: 'Mover' },
  { type: 'pin', icon: 'pin-outline', label: 'Pin' },
  { type: 'text', icon: 'text-outline', label: 'Texto' },
  { type: 'measure', icon: 'analytics-outline', label: 'Medir' },
  { type: 'reference', icon: 'attach-outline', label: 'Referencia' },
];

const SCALE_PRESETS = ['1:25', '1:50', '1:75', '1:100', '1:150', '1:200', '1:500'];

function normalize(pt: Point, w: number, h: number): Point {
  return { x: pt.x / w, y: pt.y / h };
}
function denormalize(pt: Point, w: number, h: number): Point {
  return { x: pt.x * w, y: pt.y * h };
}
function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// Convierte una distancia en píxeles de pantalla a una distancia real,
// usando la escala del plano (ej. "1:100") y asumiendo ~96 DPI de referencia
// (0.264583 mm por píxel), igual que en sitepro.
function calcRealDist(pixels: number, scaleStr: string): string {
  const parts = scaleStr.replace(/\s/g, '').split(':');
  if (parts.length !== 2) return `${pixels.toFixed(0)}px`;
  const factor = Number(parts[1]) / Number(parts[0]);
  const realMm = pixels * 0.264583 * factor;
  if (realMm >= 1000) return `${(realMm / 1000).toFixed(2)} m`;
  return `${realMm.toFixed(0)} mm`;
}

function ScaleModal({ visible, scale, onSave, onClose }: {
  visible: boolean; scale: string; onSave: (s: string) => void; onClose: () => void;
}) {
  const [val, setVal] = useState(scale);
  useEffect(() => { setVal(scale); }, [scale, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: Spacing.xl }}>
        <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md }}>
          <Text style={Typography.h4}>📐 Escala del plano</Text>
          <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>
            Define la escala para que las mediciones sean precisas
          </Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder="Ej: 1:100"
            placeholderTextColor={Colors.textMuted}
            style={{
              backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
              borderWidth: 0.5, borderColor: Colors.border,
              padding: Spacing.md, color: Colors.textPrimary, fontSize: 16, fontWeight: '600',
            }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SCALE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setVal(p)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1,
                  borderColor: val === p ? Colors.primary : Colors.border,
                  backgroundColor: val === p ? Colors.primaryMuted : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: val === p ? Colors.primary : Colors.textSecondary }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.textSecondary, fontWeight: '500' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { onSave(val); onClose(); }}
              style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.textInverse, fontWeight: '600' }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PlanViewer({ plan, onAddAnnotation, onDeleteAnnotation, onUpdateScale }: PlanViewerProps) {
  const { user } = useAuth();
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [selectedColor, setSelectedColor] = useState(PIN_COLORS[0].color);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<Point | null>(null);
  const [pendingReferencePoint, setPendingReferencePoint] = useState<Point | null>(null);
  // Al abrir un archivo externo (Linking.openURL), Android a veces dispara un
  // toque "fantasma" al regresar a la app, que reactiva la herramienta activa
  // sin que el usuario haya tocado nada realmente. Esta bandera lo ignora.
  const suppressNextTouch = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && suppressNextTouch.current) {
        // Pequeño delay para dejar pasar el toque fantasma que Android dispara
        // justo al volver a foreground, y luego limpiar la bandera.
        setTimeout(() => { suppressNextTouch.current = false; }, 600);
      }
    });
    return () => subscription.remove();
  }, []);
  const [referenceModalVisible, setReferenceModalVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; name: string } | null>(null);
  const [labelText, setLabelText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<PlanAnnotation | null>(null);
  const [imageSize, setImageSize] = useState({ width: SCREEN_W, height: VIEWER_H });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const isPdf = plan.file_type === 'pdf';
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const [localPdfPath, setLocalPdfPath] = useState<string | null>(null);
  const [pdfDownloadError, setPdfDownloadError] = useState(false);

  // Escala del plano (texto "1:100"), configurable por separado vía pill + modal
  const [planScale, setPlanScale] = useState(plan.scale ?? '1:100');
  const [scaleModalVisible, setScaleModalVisible] = useState(false);
  useEffect(() => { setPlanScale(plan.scale ?? '1:100'); }, [plan.scale]);

  // Medición de DOS TOQUES (tap-tap), no arrastre continuo:
  // 1er toque = inicio, mueves el dedo y ves la línea en vivo (onTouchMove),
  // 2do toque = fin, se calcula y guarda automáticamente. Sin modal.
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [drawEnd, setDrawEnd] = useState<Point | null>(null);

  // Refs espejo para evitar stale closures en los handlers de touch
  const activeToolRef = useRef(activeTool);
  const drawingRef = useRef(drawing);
  const drawStartRef = useRef(drawStart);
  const imageSizeRef = useRef(imageSize);
  const planScaleRef = useRef(planScale);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { drawingRef.current = drawing; }, [drawing]);
  useEffect(() => { drawStartRef.current = drawStart; }, [drawStart]);
  useEffect(() => { imageSizeRef.current = imageSize; }, [imageSize]);
  useEffect(() => { planScaleRef.current = planScale; }, [planScale]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Zoom/pan manual con PanResponder — ScrollView.maximumZoomScale no funciona
  // en Android (solo iOS lo soporta nativamente), así que controlamos el pinch
  // y arrastre nosotros mismos con Animated.Value, aplicando el mismo transform
  // a la imagen y a las anotaciones para que se muevan siempre sincronizadas.
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentScale = useRef(1);
  const currentTranslate = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number | null>(null);
  const initialScaleOnPinch = useRef(1);
  const lastTap = useRef(0);

  const resetZoom = () => {
    currentScale.current = 1;
    currentTranslate.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const getTouchDistance = (touches: any[]) => {
    const [a, b] = touches;
    return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
  };

  const zoomPanResponder = useRef(
    PanResponder.create({
      // No capturamos el toque inicial de inmediato — solo cuando se confirma
      // que es un gesto de pinch (2 dedos) o un arrastre real con zoom activo.
      // Esto deja pasar los taps simples hacia los TouchableOpacity hijos
      // (pines, anotaciones), que de otro modo quedarían bloqueados.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (activeToolRef.current !== 'none') return false;
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) return true;
        if (currentScale.current > 1 && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5)) return true;
        return false;
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
          const newDistance = getTouchDistance(touches);
          const ratio = newDistance / initialPinchDistance.current;
          const newScale = Math.max(1, Math.min(initialScaleOnPinch.current * ratio, 5));
          currentScale.current = newScale;
          scale.setValue(newScale);
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
              currentScale.current = 2.5;
              Animated.timing(scale, { toValue: 2.5, duration: 200, useNativeDriver: false }).start();
            }
          }
          lastTap.current = now;
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!isPdf || isExpoGo) return;
    let cancelled = false;
    setLocalPdfPath(null);
    setPdfDownloadError(false);

    const fileName = plan.file_url.split('/').pop()?.split('?')[0] ?? `${plan.id}.pdf`;
    const destination = `${FileSystem.cacheDirectory}${fileName}`;

    FileSystem.downloadAsync(plan.file_url, destination)
      .then((result) => {
        if (!cancelled) setLocalPdfPath(result.uri);
      })
      .catch((err) => {
        console.warn('[PlanViewer] Error descargando PDF:', err);
        if (!cancelled) setPdfDownloadError(true);
      });

    return () => { cancelled = true; };
  }, [isPdf, isExpoGo, plan.file_url, plan.id]);

  const handleSaveScale = async (newScale: string) => {
    setPlanScale(newScale);
    try {
      await onUpdateScale(plan.id, newScale);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la escala');
    }
  };

  const handleTouch = useCallback((evt: any) => {
    if (suppressNextTouch.current) {
      suppressNextTouch.current = false;
      return;
    }
    const tool = activeToolRef.current;
    if (tool === 'none') return;
    const { locationX, locationY } = evt.nativeEvent;
    const size = imageSizeRef.current;
    const pt: Point = { x: locationX, y: locationY };

    if (tool === 'pin' || tool === 'text') {
      const normPt = normalize(pt, size.width, size.height);
      setPendingPoint(normPt);
      setLabelText('');
      setLabelModalVisible(true);
      return;
    }

    if (tool === 'reference') {
      const normPt = normalize(pt, size.width, size.height);
      setPendingReferencePoint(normPt);
      setReferenceModalVisible(true);
      return;
    }

    if (tool === 'measure') {
      if (!drawingRef.current) {
        setDrawStart(normalize(pt, size.width, size.height));
        setDrawEnd(null);
        setDrawing(true);
      } else if (drawStartRef.current) {
        const startPx = denormalize(drawStartRef.current, size.width, size.height);
        const pixelDist = dist(startPx, pt);
        const normEnd = normalize(pt, size.width, size.height);
        const realDist = calcRealDist(pixelDist, planScaleRef.current);

        onAddAnnotation({
          plan_id: plan.id,
          project_id: plan.project_id,
          type: 'measure',
          color: '#EF4444',
          start_x: drawStartRef.current.x,
          start_y: drawStartRef.current.y,
          end_x: normEnd.x,
          end_y: normEnd.y,
          pixel_dist: pixelDist,
          real_dist: realDist,
          plan_scale: planScaleRef.current,
          page_number: currentPageRef.current,
        } as any).catch((e: unknown) => {
          Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la medición');
        });

        setDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
      }
    }
  }, [onAddAnnotation, plan.id, plan.project_id]);

  const handleTouchMove = useCallback((evt: any) => {
    if (activeToolRef.current !== 'measure' || !drawingRef.current) return;
    const { locationX, locationY } = evt.nativeEvent;
    const size = imageSizeRef.current;
    setDrawEnd(normalize({ x: locationX, y: locationY }, size.width, size.height));
  }, []);

  const confirmAnnotation = async () => {
    if (!pendingPoint || !user) return;
    const base = {
      plan_id: plan.id,
      project_id: plan.project_id,
      created_by: user.id,
      color: selectedColor,
      plan_scale: planScale,
      page_number: currentPage,
    };
    try {
      if (activeTool === 'pin') {
        await onAddAnnotation({
          ...base, type: 'pin',
          point_x: pendingPoint.x, point_y: pendingPoint.y,
          label: labelText || null,
          start_x: null, start_y: null, end_x: null, end_y: null,
          pixel_dist: null, real_dist: null,
          position_x: null, position_y: null, text: null,
        });
      } else if (activeTool === 'text') {
        await onAddAnnotation({
          ...base, type: 'text',
          position_x: pendingPoint.x, position_y: pendingPoint.y,
          text: labelText || 'Nota',
          point_x: null, point_y: null, label: null,
          start_x: null, start_y: null, end_x: null, end_y: null,
          pixel_dist: null, real_dist: null,
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo agregar la anotación');
    }
    setLabelModalVisible(false);
    setPendingPoint(null);
  };

  const handleAttachReference = async (params: {
    attachmentUrl: string | null;
    attachmentType: string | null;
    attachmentThumbnail: string | null;
    documentId: string | null;
  }) => {
    if (!pendingReferencePoint || !user) return;
    await onAddAnnotation({
      plan_id: plan.id,
      project_id: plan.project_id,
      created_by: user.id,
      color: '#3B82F6',
      type: 'reference',
      point_x: pendingReferencePoint.x,
      point_y: pendingReferencePoint.y,
      label: null,
      start_x: null, start_y: null, end_x: null, end_y: null,
      pixel_dist: null, real_dist: null,
      position_x: null, position_y: null, text: null,
      attachment_url: params.attachmentUrl,
      attachment_type: params.attachmentType,
      attachment_thumbnail: params.attachmentThumbnail,
      document_id: params.documentId,
    } as any);
    setPendingReferencePoint(null);
  };

  const handleAnnotationPress = (annotation: PlanAnnotation) => {
    if (annotation.type === 'reference' && annotation.attachment_url) {
      const isImage = annotation.attachment_type?.startsWith('image/');
      if (isImage) {
        setViewerImage({ url: annotation.attachment_url, name: 'Referencia' });
      } else {
        suppressNextTouch.current = true;
        Linking.openURL(annotation.attachment_url).catch(() => {
          Alert.alert('Error', 'No se pudo abrir el archivo adjunto.');
        });
      }
      // Igual seleccionamos la anotación para que el panel inferior permita eliminarla
      setSelectedAnnotation(annotation);
      return;
    }
    setSelectedAnnotation(annotation);
  };

  const handleDeleteSelected = () => {
    if (!selectedAnnotation) return;
    Alert.alert('Eliminar anotación', '¿Eliminar esta anotación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await onDeleteAnnotation(selectedAnnotation.id);
          setSelectedAnnotation(null);
        },
      },
    ]);
  };

  // En PDFs multi-página, solo mostramos las anotaciones de la página visible.
  // En imágenes (sin concepto de "página") se muestran todas.
  const annotations = (plan.annotations ?? []).filter((a) =>
    isPdf ? (a.page_number ?? 1) === currentPage : true
  );

  const cancelMeasuring = () => {
    setDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
  };

  // Overlay SVG: anotaciones guardadas (pines, texto y mediciones) +
  // la medición en progreso (línea punteada en vivo siguiendo el dedo).
  const renderSVGOverlay = () => {
    const iw = imageSize.width, ih = imageSize.height;
    const dn = (pt: Point) => denormalize(pt, iw, ih);
    const dsD = drawStart ? dn(drawStart) : null;
    const deD = drawEnd ? dn(drawEnd) : null;

    return (
      <Svg width={iw} height={ih} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        {drawing && dsD && deD && (
          <>
            <Line x1={dsD.x} y1={dsD.y} x2={deD.x} y2={deD.y} stroke="#EF4444" strokeWidth={2} strokeDasharray="6,3" />
            <Circle cx={dsD.x} cy={dsD.y} r={5} fill="#EF4444" />
            <Circle cx={deD.x} cy={deD.y} r={5} fill="#EF4444" />
            <SvgText x={(dsD.x + deD.x) / 2} y={(dsD.y + deD.y) / 2 - 10} fill="#EF4444" fontSize={12} fontWeight="bold" textAnchor="middle">
              {calcRealDist(dist(dsD, deD), planScale)}
            </SvgText>
          </>
        )}

        {annotations
          .filter((a) => a.type === 'measure' && a.start_x != null && a.end_x != null)
          .map((a) => {
            const s = dn({ x: a.start_x!, y: a.start_y! });
            const e = dn({ x: a.end_x!, y: a.end_y! });
            const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2 - 10;
            return (
              <Line key={`${a.id}-line`} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={a.color} strokeWidth={2} strokeDasharray="6,3" />
            );
          })}
        {annotations
          .filter((a) => a.type === 'measure' && a.start_x != null && a.end_x != null)
          .map((a) => {
            const s = dn({ x: a.start_x!, y: a.start_y! });
            const e = dn({ x: a.end_x!, y: a.end_y! });
            const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2 - 10;
            return (
              <View key={`${a.id}-pts`}>
                <Circle cx={s.x} cy={s.y} r={5} fill={a.color} />
                <Circle cx={e.x} cy={e.y} r={5} fill={a.color} />
                <SvgText x={mx} y={my} fill={a.color} fontSize={11} fontWeight="bold" textAnchor="middle">
                  {a.real_dist}
                </SvgText>
              </View>
            );
          })}
      </Svg>
    );
  };

  // Capa táctil para tocar/eliminar mediciones guardadas (el SVG no recibe touches)
  const renderMeasureHitboxes = () => (
    <>
      {annotations
        .filter((a) => a.type === 'measure' && a.start_x != null && a.end_x != null)
        .map((a) => {
          const mx = ((a.start_x! + a.end_x!) / 2) * imageSize.width;
          const my = ((a.start_y! + a.end_y!) / 2) * imageSize.height - 10;
          return (
            <TouchableOpacity
              key={a.id}
              onPress={() => handleAnnotationPress(a)}
              style={{ position: 'absolute', left: mx - 24, top: my - 14, width: 48, height: 28 }}
            />
          );
        })}
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      {activeTool === 'measure' && (
        <View style={{
          backgroundColor: '#EF444420',
          borderBottomWidth: 0.5, borderBottomColor: Colors.border,
          paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
          flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        }}>
          <Ionicons name="analytics-outline" size={16} color="#EF4444" />
          <Text style={[Typography.caption, { color: Colors.textSecondary, flex: 1 }]}>
            {drawing ? 'Toca el punto final' : 'Toca el punto inicial'}
          </Text>
          <TouchableOpacity
            onPress={() => setScaleModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary, borderWidth: 0.5, borderColor: Colors.border }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textSecondary }}>📐 {planScale}</Text>
          </TouchableOpacity>
          {drawing && (
            <TouchableOpacity onPress={cancelMeasuring} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          flexGrow: 0, flexShrink: 0,
          backgroundColor: Colors.surface, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
        }}
        contentContainerStyle={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
          paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        }}
      >
        {ANNOTATION_TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.type}
            onPress={() => {
              setActiveTool(tool.type);
              cancelMeasuring();
              resetZoom();
            }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0,
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md,
              backgroundColor: activeTool === tool.type ? Colors.primaryMuted : 'transparent',
              borderWidth: 1,
              borderColor: activeTool === tool.type ? Colors.primary : Colors.border,
            }}
          >
            <Ionicons name={tool.icon as never} size={15} color={activeTool === tool.type ? Colors.primary : Colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: activeTool === tool.type ? Colors.primary : Colors.textMuted }}>
              {tool.label}
            </Text>
          </TouchableOpacity>
        ))}

        {activeTool !== 'none' && activeTool !== 'measure' && PIN_COLORS.map((c) => (
          <TouchableOpacity
            key={c.color}
            onPress={() => setSelectedColor(c.color)}
            style={{
              width: 26, height: 26, borderRadius: 13, backgroundColor: c.color,
              borderWidth: selectedColor === c.color ? 2 : 0, borderColor: '#fff',
            }}
          />
        ))}
      </ScrollView>

      <View style={{ flex: 1, backgroundColor: '#141414', overflow: 'hidden' }}>
        <View style={{ position: 'relative' }}>
          {isPdf && isExpoGo ? (
            <TouchableOpacity
              onPress={() => {
                Linking.openURL(plan.file_url).catch(() => {
                  Alert.alert('Error', 'No se pudo abrir el PDF. Verifica tu conexión.');
                });
              }}
              style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', gap: Spacing.md }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${Colors.danger}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="document-text-outline" size={32} color={Colors.danger} />
              </View>
              <Text style={[Typography.body, { color: Colors.textPrimary, fontWeight: '600' }]}>
                Toca para abrir el PDF
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: Colors.primaryMuted, paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: Radius.full, borderWidth: 0.5, borderColor: Colors.primary,
              }}>
                <Ionicons name="open-outline" size={14} color={Colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>Abrir documento</Text>
              </View>
              <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: Spacing.sm }]}>
                Anotaciones no disponibles en Expo Go
              </Text>
            </TouchableOpacity>
          ) : isPdf && activeTool === 'none' ? (
            <View
              style={{ width: SCREEN_W, height: VIEWER_H, overflow: 'hidden' }}
              {...zoomPanResponder.panHandlers}
              onLayout={(e) => {
                setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
              }}
            >
              <Animated.View
                style={{
                  width: SCREEN_W, height: VIEWER_H,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                }}
              >
              {pdfDownloadError ? (
                <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', gap: Spacing.md }}>
                  <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
                  <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>No se pudo descargar el PDF</Text>
                </View>
              ) : localPdfPath ? (
                Pdf ? (
                Pdf ? (
                <Pdf
                  source={{ uri: localPdfPath, cache: false }}
                  style={{ width: SCREEN_W, height: VIEWER_H, backgroundColor: '#1a1a1a' }}
                  onLoadComplete={() => setImgLoaded(true)}
                  onPageChanged={(page) => setCurrentPage(page)}
                  onError={(error) => {
                    console.warn('[PlanViewer] Error renderizando PDF:', error);
                    Alert.alert('Error', 'No se pudo mostrar el PDF descargado.');
                  }}
                  enablePaging={false}
                  horizontal={false}
                  fitPolicy={0}
                  minScale={1}
                  maxScale={1}
                  scale={1}
                  enableDoubleTapZoom
                />
              ) : (
                <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', gap: 12 }}>
                  <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
                  <Text style={[Typography.bodySmall, { color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 }]}>
                    El visor de PDF no está disponible en Expo Go.{' '}Usa el build de producción para ver planos PDF.
                  </Text>
                </View>
              )
              ) : (
                <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', gap: 12 }}>
                  <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
                  <Text style={[Typography.bodySmall, { color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 }]}>
                    El visor de PDF no está disponible en Expo Go.{' '}Usa el build de producción para ver planos PDF.
                  </Text>
                </View>
              )
              ) : (
                <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}
              {!imgLoaded && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}

              {annotations.map((ann) => {
                if (ann.type === 'pin' && ann.point_x != null && ann.point_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 14,
                        top: ann.point_y * imageSize.height - 14,
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      <Ionicons name="pin" size={14} color="#fff" />
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'reference' && ann.point_x != null && ann.point_y != null) {
                  const hasThumbnail = !!ann.attachment_thumbnail;
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 16,
                        top: ann.point_y * imageSize.height - 16,
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: hasThumbnail ? undefined : ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        overflow: 'hidden',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      {hasThumbnail ? (
                        <Image source={{ uri: ann.attachment_thumbnail! }} style={{ width: 32, height: 32 }} />
                      ) : (
                        <Ionicons name="document-attach" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'text' && ann.position_x != null && ann.position_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.position_x * imageSize.width,
                        top: ann.position_y * imageSize.height,
                        backgroundColor: `${ann.color}CC`,
                        borderRadius: Radius.sm,
                        paddingHorizontal: 8, paddingVertical: 3,
                        maxWidth: 140,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
                        {ann.text}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}

              {renderSVGOverlay()}
              {renderMeasureHitboxes()}
              </Animated.View>
            </View>
          ) : isPdf ? (
            <View
              style={{ width: SCREEN_W, height: VIEWER_H }}
              onTouchEnd={activeTool !== 'none' ? handleTouch : undefined}
              onTouchMove={activeTool === 'measure' ? handleTouchMove : undefined}
              onLayout={(e) => {
                setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
              }}
            >
              {pdfDownloadError ? (
                <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', gap: Spacing.md }}>
                  <Ionicons name="alert-circle-outline" size={32} color={Colors.danger} />
                  <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>No se pudo descargar el PDF</Text>
                </View>
              ) : localPdfPath ? (
                <Pdf
                  source={{ uri: localPdfPath, cache: false }}
                  style={{ width: SCREEN_W, height: VIEWER_H, backgroundColor: '#1a1a1a' }}
                  onLoadComplete={() => setImgLoaded(true)}
                  onPageChanged={(page) => setCurrentPage(page)}
                  onError={(error) => {
                    console.warn('[PlanViewer] Error renderizando PDF:', error);
                    Alert.alert('Error', 'No se pudo mostrar el PDF descargado.');
                  }}
                  enablePaging={false}
                  horizontal={false}
                  fitPolicy={0}
                  minScale={1}
                  maxScale={1}
                />
              ) : (
                <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}
              {!imgLoaded && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}

              {annotations.map((ann) => {
                if (ann.type === 'pin' && ann.point_x != null && ann.point_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 14,
                        top: ann.point_y * imageSize.height - 14,
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      <Ionicons name="pin" size={14} color="#fff" />
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'reference' && ann.point_x != null && ann.point_y != null) {
                  const hasThumbnail = !!ann.attachment_thumbnail;
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 16,
                        top: ann.point_y * imageSize.height - 16,
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: hasThumbnail ? undefined : ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        overflow: 'hidden',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      {hasThumbnail ? (
                        <Image source={{ uri: ann.attachment_thumbnail! }} style={{ width: 32, height: 32 }} />
                      ) : (
                        <Ionicons name="document-attach" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'text' && ann.position_x != null && ann.position_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.position_x * imageSize.width,
                        top: ann.position_y * imageSize.height,
                        backgroundColor: `${ann.color}CC`,
                        borderRadius: Radius.sm,
                        paddingHorizontal: 8, paddingVertical: 3,
                        maxWidth: 140,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
                        {ann.text}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}

              {renderSVGOverlay()}
              {renderMeasureHitboxes()}
            </View>
          ) : activeTool === 'none' ? (
            <View
              style={{ width: SCREEN_W, height: VIEWER_H, overflow: 'hidden' }}
              {...zoomPanResponder.panHandlers}
              onLayout={(e) => {
                setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
              }}
            >
              <Animated.View
                style={{
                  width: SCREEN_W, height: VIEWER_H,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                }}
              >
              <Image
                source={{ uri: plan.file_url }}
                style={{ width: SCREEN_W, height: VIEWER_H, resizeMode: 'contain' }}
                onLoad={() => setImgLoaded(true)}
              />
              {!imgLoaded && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}

              {annotations.map((ann) => {
                if (ann.type === 'pin' && ann.point_x != null && ann.point_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 14,
                        top: ann.point_y * imageSize.height - 14,
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      <Ionicons name="pin" size={14} color="#fff" />
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'reference' && ann.point_x != null && ann.point_y != null) {
                  const hasThumbnail = !!ann.attachment_thumbnail;
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 16,
                        top: ann.point_y * imageSize.height - 16,
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: hasThumbnail ? undefined : ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        overflow: 'hidden',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      {hasThumbnail ? (
                        <Image source={{ uri: ann.attachment_thumbnail! }} style={{ width: 32, height: 32 }} />
                      ) : (
                        <Ionicons name="document-attach" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'text' && ann.position_x != null && ann.position_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.position_x * imageSize.width,
                        top: ann.position_y * imageSize.height,
                        backgroundColor: `${ann.color}CC`,
                        borderRadius: Radius.sm,
                        paddingHorizontal: 8, paddingVertical: 3,
                        maxWidth: 140,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
                        {ann.text}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}

              {renderSVGOverlay()}
              {renderMeasureHitboxes()}
              </Animated.View>
            </View>
          ) : (
            <View
              onTouchEnd={handleTouch}
              onTouchMove={activeTool === 'measure' ? handleTouchMove : undefined}
              onLayout={(e) => {
                setImageSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
              }}
            >
              <Image
                source={{ uri: plan.file_url }}
                style={{ width: SCREEN_W, height: VIEWER_H, resizeMode: 'contain' }}
                onLoad={() => setImgLoaded(true)}
              />
              {!imgLoaded && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}

              {annotations.map((ann) => {
                if (ann.type === 'pin' && ann.point_x != null && ann.point_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 14,
                        top: ann.point_y * imageSize.height - 14,
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      <Ionicons name="pin" size={14} color="#fff" />
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'reference' && ann.point_x != null && ann.point_y != null) {
                  const hasThumbnail = !!ann.attachment_thumbnail;
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.point_x * imageSize.width - 16,
                        top: ann.point_y * imageSize.height - 16,
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: hasThumbnail ? undefined : ann.color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#fff',
                        overflow: 'hidden',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
                      }}
                    >
                      {hasThumbnail ? (
                        <Image source={{ uri: ann.attachment_thumbnail! }} style={{ width: 32, height: 32 }} />
                      ) : (
                        <Ionicons name="document-attach" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                }
                if (ann.type === 'text' && ann.position_x != null && ann.position_y != null) {
                  return (
                    <TouchableOpacity
                      key={ann.id}
                      onPress={() => handleAnnotationPress(ann)}
                      style={{
                        position: 'absolute',
                        left: ann.position_x * imageSize.width,
                        top: ann.position_y * imageSize.height,
                        backgroundColor: `${ann.color}CC`,
                        borderRadius: Radius.sm,
                        paddingHorizontal: 8, paddingVertical: 3,
                        maxWidth: 140,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
                        {ann.text}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}

              {renderSVGOverlay()}
              {renderMeasureHitboxes()}
            </View>
          )}
        </View>
      </View>

      {selectedAnnotation && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: Colors.surface, borderTopWidth: 0.5, borderTopColor: Colors.border,
          padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedAnnotation.color }} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodySmall, { fontWeight: '600' }]}>
              {selectedAnnotation.type === 'pin' ? '📍 Pin'
                : selectedAnnotation.type === 'measure' ? '📏 Medición'
                : selectedAnnotation.type === 'reference' ? '📎 Referencia'
                : '📝 Texto'}
              {selectedAnnotation.label ? ` · ${selectedAnnotation.label}` : ''}
              {selectedAnnotation.text ? ` · ${selectedAnnotation.text}` : ''}
              {selectedAnnotation.real_dist ? ` · ${selectedAnnotation.real_dist}` : ''}
            </Text>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
              {selectedAnnotation.type === 'reference' ? 'Toca el clip para abrir el adjunto' : 'Toca para cerrar · Eliminar para borrar'}
            </Text>
          </View>
          {selectedAnnotation.type === 'reference' && selectedAnnotation.attachment_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(selectedAnnotation.attachment_url!)}
              style={{ padding: Spacing.sm }}
            >
              <Ionicons name="open-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDeleteSelected} style={{ padding: Spacing.sm }}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedAnnotation(null)} style={{ padding: Spacing.sm }}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={labelModalVisible} transparent animationType="fade" onRequestClose={() => setLabelModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: Spacing.xl }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md }}>
            <Text style={Typography.h4}>
              {activeTool === 'pin' ? '📍 Nuevo pin' : '📝 Nuevo texto'}
            </Text>
            <TextInput
              value={labelText}
              onChangeText={setLabelText}
              placeholder={activeTool === 'pin' ? 'Etiqueta del pin (opcional)' : 'Texto de la nota'}
              placeholderTextColor={Colors.textMuted}
              style={{
                backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
                borderWidth: 0.5, borderColor: Colors.border,
                padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
              }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <TouchableOpacity
                onPress={() => { setLabelModalVisible(false); setPendingPoint(null); }}
                style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.textSecondary, fontWeight: '500' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmAnnotation}
                style={{ flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.textInverse, fontWeight: '600' }}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScaleModal
        visible={scaleModalVisible}
        scale={planScale}
        onSave={handleSaveScale}
        onClose={() => setScaleModalVisible(false)}
      />

      <ReferenceModal
        visible={referenceModalVisible}
        onClose={() => { setReferenceModalVisible(false); setPendingReferencePoint(null); }}
        projectId={plan.project_id}
        onAttach={handleAttachReference}
      />

      <ImageViewerModal
        visible={!!viewerImage}
        imageUrl={viewerImage?.url ?? null}
        fileName={viewerImage?.name}
        onClose={() => setViewerImage(null)}
      />
    </View>
  );
}
