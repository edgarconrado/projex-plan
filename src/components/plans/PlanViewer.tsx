import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  ScrollView, Dimensions, Alert, TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan, PlanAnnotation, AnnotationType } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../lib/theme';
import { useAuth } from '../../lib/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIEWER_H = SCREEN_H * 0.65;

interface PlanViewerProps {
  plan: Plan;
  onAddAnnotation: (dto: Omit<PlanAnnotation, 'id' | 'created_at' | 'creator'>) => Promise<void>;
  onDeleteAnnotation: (annotationId: string) => Promise<void>;
}

const PIN_COLORS = [
  { color: '#EF4444', label: 'Urgente' },
  { color: '#FFD700', label: 'Revisión' },
  { color: '#22C55E', label: 'OK' },
  { color: '#3B82F6', label: 'Info' },
];

const ANNOTATION_TOOLS: { type: AnnotationType | 'none'; icon: string; label: string }[] = [
  { type: 'none', icon: 'hand-left-outline', label: 'Mover' },
  { type: 'pin', icon: 'pin-outline', label: 'Pin' },
  { type: 'text', icon: 'text-outline', label: 'Texto' },
];

export function PlanViewer({ plan, onAddAnnotation, onDeleteAnnotation }: PlanViewerProps) {
  const { user } = useAuth();
  const [activeTool, setActiveTool] = useState<AnnotationType | 'none'>('none');
  const [selectedColor, setSelectedColor] = useState(PIN_COLORS[0].color);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [labelText, setLabelText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<PlanAnnotation | null>(null);
  const [imageSize, setImageSize] = useState({ width: SCREEN_W, height: VIEWER_H });
  const [imgLoaded, setImgLoaded] = useState(false);
  const isPdf = plan.file_type === 'pdf';

  const handleImagePress = (evt: any) => {
    if (activeTool === 'none') return;
    const { locationX, locationY } = evt.nativeEvent;
    // Normalizar coordenadas a porcentaje (0-1)
    const px = locationX / imageSize.width;
    const py = locationY / imageSize.height;
    setPendingPoint({ x: px, y: py });
    setLabelText('');
    setLabelModalVisible(true);
  };

  const confirmAnnotation = async () => {
    if (!pendingPoint || !user) return;
    const base = {
      plan_id: plan.id,
      project_id: plan.project_id,
      created_by: user.id,
      color: selectedColor,
      plan_scale: plan.scale ?? '1:100',
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
    } catch (e) {
      Alert.alert('Error', 'No se pudo agregar la anotación');
    }
    setLabelModalVisible(false);
    setPendingPoint(null);
  };

  const handleAnnotationPress = (annotation: PlanAnnotation) => {
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

  const annotations = plan.annotations ?? [];

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
      }}>
        {ANNOTATION_TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.type}
            onPress={() => setActiveTool(tool.type)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md,
              backgroundColor: activeTool === tool.type ? Colors.primaryMuted : 'transparent',
              borderWidth: 1,
              borderColor: activeTool === tool.type ? Colors.primary : Colors.border,
            }}
          >
            <Ionicons name={tool.icon as never} size={16} color={activeTool === tool.type ? Colors.primary : Colors.textMuted} />
            <Text style={{ fontSize: 12, color: activeTool === tool.type ? Colors.primary : Colors.textMuted, fontWeight: '500' }}>
              {tool.label}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />

        {/* Selector de color */}
        {activeTool !== 'none' && PIN_COLORS.map((c) => (
          <TouchableOpacity
            key={c.color}
            onPress={() => setSelectedColor(c.color)}
            style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: c.color,
              borderWidth: selectedColor === c.color ? 2 : 0,
              borderColor: '#fff',
            }}
          />
        ))}
      </View>

      {/* Área del plano */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#141414' }}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        centerContent
      >
        <View style={{ position: 'relative' }}>
          {isPdf ? (
            <View style={{ width: SCREEN_W, height: VIEWER_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
              <Ionicons name="document-outline" size={64} color={Colors.textMuted} />
              <Text style={[Typography.bodySmall, { color: Colors.textMuted, marginTop: Spacing.sm }]}>
                Visor PDF — abre en navegador
              </Text>
              <Text style={[Typography.caption, { color: Colors.textMuted, marginTop: 4 }]} numberOfLines={2}>
                {plan.file_url}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleImagePress}
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
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}

              {/* Pines */}
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
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Info anotación seleccionada */}
      {selectedAnnotation && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: Colors.surface, borderTopWidth: 0.5, borderTopColor: Colors.border,
          padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedAnnotation.color }} />
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodySmall, { fontWeight: '600' }]}>
              {selectedAnnotation.type === 'pin' ? '📍 Pin' : '📝 Texto'}
              {selectedAnnotation.label ? ` · ${selectedAnnotation.label}` : ''}
              {selectedAnnotation.text ? ` · ${selectedAnnotation.text}` : ''}
            </Text>
            <Text style={[Typography.caption, { color: Colors.textMuted }]}>
              Toca para cerrar · Eliminar para borrar
            </Text>
          </View>
          <TouchableOpacity onPress={handleDeleteSelected} style={{ padding: Spacing.sm }}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedAnnotation(null)} style={{ padding: Spacing.sm }}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para label */}
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
    </View>
  );
}
