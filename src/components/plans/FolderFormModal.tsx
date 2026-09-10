// ============================================================================
// src/components/plans/FolderFormModal.tsx
// Crear y renombrar carpetas. El nombre es libre; las sugerencias solo
// rellenan el campo para ahorrar tecleo.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

const SUGGESTIONS = [
  'Arquitectónico',
  'Estructural',
  'Inst. Hidrosanitarias',
  'Eléctricos',
  'Logística',
  'Acabados',
];

type Props = {
  visible: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  /** Nombre de la carpeta padre, para dar contexto al crear. */
  parentName?: string;
  onCancel: () => void;
  /** Debe lanzar Error con mensaje legible si falla; el modal lo muestra. */
  onSubmit: (name: string) => Promise<void>;
};

export function FolderFormModal({
  visible, mode, initialName = '', parentName, onCancel, onSubmit,
}: Props) {
  const { colors, typography } = useTheme();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Reset al abrir: si no, el modal recuerda el texto y el error del uso anterior.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
      setSaving(false);
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [visible, initialName]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= 80 && !saving;

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: Spacing.xl }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onCancel} />

        <View style={{
          backgroundColor: colors.surface, borderRadius: Radius.lg,
          padding: Spacing.lg, borderWidth: 0.5, borderColor: colors.border,
        }}>
          <Text style={typography.h4}>
            {mode === 'create' ? 'Nueva carpeta' : 'Renombrar carpeta'}
          </Text>
          {mode === 'create' && parentName ? (
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
              Dentro de {parentName}
            </Text>
          ) : null}

          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={(t) => { setName(t); if (error) setError(null); }}
            placeholder="Ej. 06 Alberca, Torre B, Detalles"
            placeholderTextColor={colors.textMuted}
            style={{
              marginTop: Spacing.md,
              backgroundColor: colors.background,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: error ? colors.danger : colors.border,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.md,
              color: colors.textPrimary,
              fontSize: 16,
            }}
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!saving}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, minHeight: 18, gap: Spacing.md }}>
            <Text style={[typography.caption, { color: colors.danger, flex: 1 }]} numberOfLines={2}>
              {error ?? ''}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{trimmed.length}/80</Text>
          </View>

          {mode === 'create' && (
            <>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                Sugerencias
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm, paddingVertical: Spacing.sm }}
              >
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => { setName(s); setError(null); }}
                    style={{
                      paddingHorizontal: Spacing.md, paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1, borderColor: colors.border,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md }}>
            <Pressable onPress={onCancel} disabled={saving} style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSave}
              style={{
                paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                borderRadius: Radius.md, minWidth: 100, alignItems: 'center',
                backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={[typography.body, { color: colors.textInverse, fontWeight: '700' }]}>
                  {mode === 'create' ? 'Crear' : 'Guardar'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
