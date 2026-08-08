import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator,
  PanResponder, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

interface PlanRevision {
  id: string;
  file_url: string;
  file_type: string;
  revision: string;
  title: string;
  created_at: string;
}

interface PlanCompareModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;         // ID del plano base
  planTitle: string;
  projectId: string;
}

export function PlanCompareModal({ visible, onClose, planId, planTitle, projectId }: PlanCompareModalProps) {
  const { colors, typography } = useTheme();
  const [revisions, setRevisions] = useState<PlanRevision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [revisionA, setRevisionA] = useState<PlanRevision | null>(null);
  const [revisionB, setRevisionB] = useState<PlanRevision | null>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [comparing, setComparing] = useState(false);
  const [diffImage, setDiffImage] = useState<string | null>(null);
  const [diffPercent, setDiffPercent] = useState<number | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'A' | 'B' | null>(null);

  const loadRevisions = useCallback(async () => {
    if (!planId) { setIsLoading(false); return; }
    setIsLoading(true);
    console.log('[Compare] Cargando planId:', planId, 'projectId:', projectId);
    try {
      const { data: currentPlan, error: planError } = await supabase
        .from('plans')
        .select('code')
        .eq('id', planId)
        .single();

      // Buscar revisiones por code o por title como fallback
      const code = currentPlan?.code;
      const { data, error } = code
        ? await supabase.from('plans').select('id, file_url, file_type, revision, title, created_at').eq('project_id', projectId).eq('code', code).order('created_at', { ascending: false })
        : await supabase.from('plans').select('id, file_url, file_type, revision, title, created_at').eq('project_id', projectId).eq('title', planTitle).order('created_at', { ascending: false });

      if (error) throw error;
      const revs = (data ?? []) as PlanRevision[];
      setRevisions(revs);
      if (revs.length >= 2) {
        setRevisionA(revs[0]);
        setRevisionB(revs[1]);
      } else if (revs.length === 1) {
        setRevisionA(revs[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar las revisiones');
    } finally {
      setIsLoading(false);
    }
  }, [planId, projectId, planTitle]);

  const generateDiff = async () => {
    if (!revisionA || !revisionB) return;
    setLoadingDiff(true);
    setDiffImage(null);
    try {
      const { data, error } = await supabase.functions.invoke('image-diff', {
        body: { urlA: revisionA.file_url, urlB: revisionB.file_url },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (!data.diffImageUrl) throw new Error('No se recibió imagen de diferencias');
      setDiffImage(data.diffImageUrl);
      setDiffPercent(data.diffPercent);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo generar el análisis de diferencias: ' + (e.message ?? ''));
    } finally {
      setLoadingDiff(false);
    }
  };

  // Cargar revisiones al abrir
  useEffect(() => { if (visible && planId) loadRevisions(); }, [visible, planId]);

  const isImage = (type?: string) => ['image', 'jpg', 'jpeg', 'png', 'webp'].includes(type ?? '');
  const bothImages = isImage(revisionA?.file_type) && isImage(revisionB?.file_type);
  const canCompare = !!(revisionA && revisionB && revisionA.id !== revisionB.id);

  const RevisionSelector = ({ label, selected, color }: { label: string; selected: PlanRevision | null; color: string }) => (
    <TouchableOpacity
      onPress={() => setSelectingFor(label === 'Plano A (base)' ? 'A' : 'B')}
      style={{
        flex: 1, backgroundColor: selected ? `${color}15` : colors.surfaceSecondary,
        borderRadius: Radius.lg, borderWidth: 1.5,
        borderColor: selected ? color : colors.border,
        padding: Spacing.md, gap: 4,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase' }}>{label}</Text>
      {selected ? (
        <>
          <Text style={[typography.bodySmall, { fontWeight: '600', color: colors.textPrimary }]} numberOfLines={1}>
            {selected.revision}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {new Date(selected.created_at).toLocaleDateString('es-MX')}
          </Text>
        </>
      ) : (
        <Text style={[typography.caption, { color: colors.textMuted }]}>Seleccionar revisión</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
          <TouchableOpacity onPress={() => { setComparing(false); setDiffImage(null); setDiffPercent(null); onClose(); }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={typography.h4}>Comparar revisiones</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{planTitle}</Text>
          </View>
          {comparing && (
            <TouchableOpacity onPress={() => setComparing(false)}>
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '700' }]}>Cambiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: Spacing.md }]}>Cargando revisiones...</Text>
          </View>
        ) : revisions.length < 2 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md }}>
            <Ionicons name="layers-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.h4, { color: colors.textMuted, textAlign: 'center' }]}>No hay revisiones suficientes</Text>
            <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
              Necesitas al menos 2 revisiones del mismo plano para poder comparar. Sube una nueva revisión desde la pantalla de planos.
            </Text>
          </View>
        ) : comparing && revisionA && revisionB ? (
          // Vista de comparación mejorada
          <View style={{ flex: 1, backgroundColor: '#111' }}>
            {/* Área de imagen */}
            <View style={{ flex: 1, position: 'relative' }}>
              {diffImage ? (
                /* Vista de diferencias */
                <Image
                  source={{ uri: diffImage }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  resizeMode="contain"
                />
              ) : (
                <>
                  {/* Plano BASE — siempre visible al 100% */}
                  <Image
                    source={{ uri: revisionB.file_url }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    resizeMode="contain"
                  />
                  {/* Plano NUEVO — encima con opacidad controlada */}
                  <Image
                    source={{ uri: revisionA.file_url }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}
                    resizeMode="contain"
                  />
                </>
              )}
              {/* Badge de diferencias */}
              {diffPercent !== null && (
                <View style={{ position: 'absolute', top: Spacing.md, left: Spacing.md, backgroundColor: diffPercent > 10 ? '#EF4444' : diffPercent > 3 ? '#F59E0B' : '#22C55E', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{diffPercent}% diferente</Text>
                </View>
              )}
            </View>

            {/* Panel de control */}
            <View style={{ backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border, padding: Spacing.lg, gap: Spacing.md }}>
              {/* Info de revisiones */}
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1, backgroundColor: '#EF444415', borderRadius: Radius.md, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' }}>Base (abajo)</Text>
                  <Text style={[typography.bodySmall, { fontWeight: '600' }]} numberOfLines={1}>{revisionB.revision}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{new Date(revisionB.created_at).toLocaleDateString('es-MX')}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#3B82F615', borderRadius: Radius.md, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: '#3B82F6' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase' }}>Nuevo (encima)</Text>
                  <Text style={[typography.bodySmall, { fontWeight: '600' }]} numberOfLines={1}>{revisionA.revision}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{new Date(revisionA.created_at).toLocaleDateString('es-MX')}</Text>
                </View>
              </View>

              {/* Control de opacidad */}
              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '600' }]}>Visibilidad del plano nuevo</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{Math.round(opacity * 100)}%</Text>
                </View>
                {/* Barra de progreso visual */}
                <View style={{ height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${opacity * 100}%`, height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 }} />
                </View>
                {/* Botón de análisis de diferencias */}
                <TouchableOpacity
                  onPress={() => { if (diffImage) { setDiffImage(null); setDiffPercent(null); } else { generateDiff(); } }}
                  disabled={loadingDiff}
                  style={{ backgroundColor: diffImage ? '#22C55E20' : '#EF444420', borderRadius: Radius.md, padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: diffImage ? '#22C55E' : '#EF4444' }}
                >
                  {loadingDiff
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <Ionicons name={diffImage ? 'eye-outline' : 'color-filter-outline'} size={16} color={diffImage ? '#22C55E' : '#EF4444'} />
                  }
                  <Text style={{ fontSize: 12, fontWeight: '700', color: diffImage ? '#22C55E' : '#EF4444' }}>
                    {loadingDiff ? 'Analizando...' : diffImage ? 'Ver superposición' : 'Ver diferencias en rojo'}
                  </Text>
                </TouchableOpacity>
                {/* Botones de control */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TouchableOpacity
                    onPress={() => setOpacity(0)}
                    style={{ flex: 1, padding: Spacing.sm, backgroundColor: opacity === 0 ? '#EF444420' : colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: opacity === 0 ? '#EF4444' : colors.border, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: opacity === 0 ? '#EF4444' : colors.textMuted }}>Solo base</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setOpacity(Math.max(0, parseFloat((opacity - 0.2).toFixed(1))))}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary }}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setOpacity(0.5)}
                    style={{ flex: 1, padding: Spacing.sm, backgroundColor: Math.round(opacity * 10) === 5 ? `${colors.primary}20` : colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Math.round(opacity * 10) === 5 ? colors.primary : colors.border, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: Math.round(opacity * 10) === 5 ? colors.primary : colors.textMuted }}>50/50</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setOpacity(Math.min(1, parseFloat((opacity + 0.2).toFixed(1))))}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary }}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setOpacity(1)}
                    style={{ flex: 1, padding: Spacing.sm, backgroundColor: opacity === 1 ? '#3B82F620' : colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: opacity === 1 ? '#3B82F6' : colors.border, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: opacity === 1 ? '#3B82F6' : colors.textMuted }}>Solo nuevo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          // Selector de revisiones
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
            {revisions[0]?.file_type !== 'image' && (
              <View style={{ backgroundColor: '#F59E0B20', borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm }}>
                <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                <Text style={[typography.bodySmall, { color: '#92400E', flex: 1 }]}>
                  La comparación solo funciona con planos en formato imagen (JPG/PNG). Los PDFs no se pueden superponer.
                </Text>
              </View>
            )}

            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Selecciona dos revisiones para superponer y ver las diferencias con control de transparencia.
            </Text>

            {/* Selectores */}
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <RevisionSelector label="Plano A (base)" selected={revisionA} color="#EF4444" />
              <RevisionSelector label="Plano B (nuevo)" selected={revisionB} color="#3B82F6" />
            </View>

            {/* Lista de revisiones para seleccionar */}
            {selectingFor && (
              <View style={{ gap: Spacing.sm }}>
                <Text style={[typography.bodySmall, { fontWeight: '700' }]}>
                  Seleccionando para Plano {selectingFor}:
                </Text>
                {revisions.map(rev => (
                  <TouchableOpacity
                    key={rev.id}
                    onPress={() => {
                      if (selectingFor === 'A') setRevisionA(rev);
                      else setRevisionB(rev);
                      setSelectingFor(null);
                    }}
                    style={{
                      backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md,
                      borderWidth: 1, borderColor: colors.border,
                      padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                    }}
                  >
                    <Ionicons name="document-outline" size={20} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodySmall, { fontWeight: '600' }]}>{rev.revision}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {new Date(rev.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {rev.file_type !== 'image' && ' · PDF (no compatible)'}
                      </Text>
                    </View>
                    {((selectingFor === 'A' && revisionA?.id === rev.id) || (selectingFor === 'B' && revisionB?.id === rev.id)) && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Botón comparar */}
            <TouchableOpacity
              onPress={() => {
                if (!canCompare) return;
                if (!bothImages) {
                  Alert.alert('Formato no compatible', 'Solo se pueden comparar planos en formato imagen (JPG/PNG). Los PDFs no se pueden superponer visualmente.');
                  return;
                }
                setComparing(true);
              }}
              disabled={!canCompare}
              style={{
                backgroundColor: canCompare ? colors.primary : colors.surfaceTertiary,
                borderRadius: Radius.lg, padding: Spacing.md,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              }}
            >
              <Ionicons name="layers-outline" size={20} color={canCompare ? colors.textInverse : colors.textMuted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: canCompare ? colors.textInverse : colors.textMuted }}>
                Comparar planos
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
