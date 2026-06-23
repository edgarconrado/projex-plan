import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions,
  PanResponder, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/lib/theme';
import { usePlans } from '../../src/hooks/usePlans';
import { Plan, PlanAnnotation } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIEWER_H = SCREEN_H * 0.7;

function AnnotationsLayer({ annotations, color }: { annotations: PlanAnnotation[]; color?: string }) {
  return (
    <>
      {annotations.map((ann) => {
        if (ann.type === 'pin' && ann.point_x != null && ann.point_y != null) {
          return (
            <View
              key={ann.id}
              style={{
                position: 'absolute',
                left: ann.point_x * SCREEN_W - 12,
                top: ann.point_y * VIEWER_H - 12,
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: ann.color,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: '#fff',
              }}
            >
              <Ionicons name="pin" size={12} color="#fff" />
            </View>
          );
        }
        if (ann.type === 'text' && ann.position_x != null && ann.position_y != null) {
          return (
            <View
              key={ann.id}
              style={{
                position: 'absolute',
                left: ann.position_x * SCREEN_W,
                top: ann.position_y * VIEWER_H,
                backgroundColor: `${ann.color}CC`,
                borderRadius: Radius.sm,
                paddingHorizontal: 6, paddingVertical: 2,
                maxWidth: 120,
              }}
            >
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>{ann.text}</Text>
            </View>
          );
        }
        if (ann.type === 'measure' && ann.start_x != null && ann.end_x != null) {
          const x1 = ann.start_x * SCREEN_W, y1 = ann.start_y! * VIEWER_H;
          const x2 = ann.end_x * SCREEN_W, y2 = ann.end_y! * VIEWER_H;
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View key={ann.id} pointerEvents="none">
              <View
                style={{
                  position: 'absolute', left: x1, top: y1 - 1,
                  width: length, height: 2, backgroundColor: ann.color,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left',
                }}
              />
            </View>
          );
        }
        return null;
      })}
    </>
  );
}

export default function CompareRevisionsScreen() {
  const { planAId, planBId, planGroupId, projectId } = useLocalSearchParams<{ planAId: string; planBId: string; planGroupId: string; projectId: string }>();
  const { fetchRevisionHistory } = usePlans(projectId ?? '');
  const [planA, setPlanA] = useState<Plan | null>(null);
  const [planB, setPlanB] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  // Posición del deslizador, en píxeles desde la izquierda. Empieza al centro.
  const sliderX = useRef(new Animated.Value(SCREEN_W / 2)).current;
  const currentSliderX = useRef(SCREEN_W / 2);
  const [showAnnotations, setShowAnnotations] = useState(true);

  useEffect(() => {
    (async () => {
      if (!planAId || !planBId || !planGroupId) return;
      const history = await fetchRevisionHistory(planGroupId);
      const a = history.find((p) => p.id === planAId) ?? null;
      const b = history.find((p) => p.id === planBId) ?? null;
      setPlanA(a);
      setPlanB(b);
      setLoading(false);
    })();
  }, [planAId, planBId, planGroupId, fetchRevisionHistory]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gestureState) => {
        const next = Math.max(0, Math.min(SCREEN_W, currentSliderX.current + gestureState.dx));
        sliderX.setValue(next);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        currentSliderX.current = Math.max(0, Math.min(SCREEN_W, currentSliderX.current + gestureState.dx));
      },
    })
  ).current;

  if (loading || !planA || !planB) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>Cargando comparación...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={Typography.h4}>Comparar revisiones</Text>
          <Text style={[Typography.caption, { color: Colors.textMuted }]}>{planA.title}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAnnotations((v) => !v)} style={{ padding: 4 }}>
          <Ionicons name={showAnnotations ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Etiquetas de revisión */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <View style={{ backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 0.5, borderColor: Colors.border }}>
          <Text style={[Typography.caption, { fontWeight: '700' }]}>Rev. {planA.revision}</Text>
          <Text style={[Typography.caption, { color: Colors.textMuted }]}>{format(new Date(planA.created_at), 'd MMM yyyy', { locale: es })}</Text>
        </View>
        <View style={{ backgroundColor: Colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 0.5, borderColor: Colors.primary }}>
          <Text style={[Typography.caption, { fontWeight: '700', color: Colors.primary }]}>Rev. {planB.revision}</Text>
          <Text style={[Typography.caption, { color: Colors.primary }]}>{format(new Date(planB.created_at), 'd MMM yyyy', { locale: es })}</Text>
        </View>
      </View>

      <View style={{ flex: 1, marginTop: Spacing.md, position: 'relative', overflow: 'hidden' }}>
        {/* Revisión A — capa base completa, ocupa todo el ancho */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_W, height: VIEWER_H }}>
          {planA.file_type !== 'pdf' && (
            <Image source={{ uri: planA.file_url }} style={{ width: SCREEN_W, height: VIEWER_H, resizeMode: 'contain' }} />
          )}
          {showAnnotations && <AnnotationsLayer annotations={planA.annotations ?? []} />}
        </View>

        {/* Revisión B — recortada con overflow:hidden, ancho controlado por el deslizador.
            Solo se revela la porción a la DERECHA del slider (de sliderX hasta SCREEN_W). */}
        <Animated.View
          style={{
            position: 'absolute', top: 0, right: 0, height: VIEWER_H,
            overflow: 'hidden',
            width: Animated.subtract(SCREEN_W, sliderX),
          }}
        >
          <View style={{ position: 'absolute', top: 0, right: 0, width: SCREEN_W, height: VIEWER_H }}>
            {planB.file_type !== 'pdf' && (
              <Image source={{ uri: planB.file_url }} style={{ width: SCREEN_W, height: VIEWER_H, resizeMode: 'contain' }} />
            )}
            {showAnnotations && <AnnotationsLayer annotations={planB.annotations ?? []} />}
          </View>
        </Animated.View>

        {/* Línea y manija del deslizador */}
        <Animated.View
          style={{
            position: 'absolute', top: 0, bottom: 0, left: sliderX,
            width: 2, backgroundColor: '#fff',
          }}
          {...panResponder.panHandlers}
        >
          <View style={{
            position: 'absolute', top: '50%', left: -20, marginTop: -20,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
          }}>
            <Ionicons name="swap-horizontal" size={20} color={Colors.textPrimary} />
          </View>
        </Animated.View>
      </View>

      {(planA.file_type === 'pdf' || planB.file_type === 'pdf') && (
        <View style={{ padding: Spacing.md, backgroundColor: Colors.surfaceSecondary, borderTopWidth: 0.5, borderTopColor: Colors.border }}>
          <Text style={[Typography.caption, { color: Colors.textMuted, textAlign: 'center' }]}>
            La comparación visual de PDFs no está disponible — usa el historial para abrir cada revisión por separado.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
