// ============================================================================
// src/components/plans/MoveToFolderModal.tsx
// Selector de carpeta destino para un plano.
// ============================================================================

import { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import type { PlanFolder } from '../../lib/planFolders';

type Props = {
  visible: boolean;
  tree: PlanFolder[];
  /** Carpeta donde está el plano ahora, para marcarla. */
  currentFolderId: string | null;
  planTitle?: string;
  onCancel: () => void;
  onSelect: (folderId: string | null) => void;
};

/** Aplana el árbol en orden de lectura, guardando la profundidad para indentar. */
function flatten(tree: PlanFolder[], parentId: string | null, depth = 0): Array<PlanFolder & { depth: number }> {
  return tree
    .filter((f) => f.parent_id === parentId)
    .flatMap((f) => [{ ...f, depth }, ...flatten(tree, f.id, depth + 1)]);
}

export function MoveToFolderModal({
  visible, tree, currentFolderId, planTitle, onCancel, onSelect,
}: Props) {
  const { colors, typography } = useTheme();
  const rows = useMemo(() => flatten(tree, null), [tree]);

  const Row = ({
    label, icon, folderId, depth = 0, muted = false,
  }: { label: string; icon: keyof typeof Ionicons.glyphMap; folderId: string | null; depth?: number; muted?: boolean }) => {
    const selected = currentFolderId === folderId;
    return (
      <TouchableOpacity
        onPress={() => onSelect(folderId)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
          paddingVertical: Spacing.md,
          paddingLeft: Spacing.lg + depth * Spacing.lg,
          paddingRight: Spacing.lg,
          backgroundColor: selected ? `${colors.primary}15` : 'transparent',
        }}
      >
        <Ionicons name={icon} size={20} color={muted ? colors.textMuted : colors.primary} />
        <Text style={[typography.body, { flex: 1, color: muted ? colors.textSecondary : colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
          maxHeight: '75%', paddingBottom: Spacing.xl,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={typography.h4}>Mover a carpeta</Text>
              {planTitle ? (
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{planTitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onCancel} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Row label="Sin carpeta" icon="folder-open-outline" folderId={null} muted />
            {rows.map((f) => (
              <Row key={f.id} label={f.name} icon="folder" folderId={f.id} depth={f.depth} />
            ))}
            {rows.length === 0 && (
              <Text style={[typography.caption, { color: colors.textMuted, padding: Spacing.lg }]}>
                Aún no hay carpetas. Crea una desde el botón de carpeta en Planos.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
