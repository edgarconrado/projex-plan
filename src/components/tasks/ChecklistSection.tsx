import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { useChecklist } from '../../hooks/useChecklist';

interface ChecklistSectionProps {
  taskId: string;
}

export function ChecklistSection({ taskId }: ChecklistSectionProps) {
  const { colors, typography } = useTheme();
  const { items, completedCount, totalCount, addItem, toggleItem, deleteItem, updateItemText } = useChecklist(taskId);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = async () => {
    if (!newItemText.trim()) return;
    await addItem(newItemText);
    setNewItemText('');
  };

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={{ gap: Spacing.sm }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
        <Text style={[typography.bodySmall, { fontWeight: '700' }]}>
          Checklist {totalCount > 0 ? `(${completedCount}/${totalCount})` : ''}
        </Text>
      </View>

      {/* Barra de progreso */}
      {totalCount > 0 && (
        <View style={{ gap: 4 }}>
          <View style={{ backgroundColor: colors.surfaceTertiary, borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <View style={{ backgroundColor: colors.success, height: 6, width: `${progressPct}%`, borderRadius: 4 }} />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{progressPct}% completado</Text>
        </View>
      )}

      {/* Lista de items */}
      {items.map((item) => (
        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <TouchableOpacity onPress={() => toggleItem(item.id)}>
            <Ionicons
              name={item.is_completed ? 'checkbox' : 'square-outline'}
              size={22}
              color={item.is_completed ? colors.success : colors.textMuted}
            />
          </TouchableOpacity>

          {editingId === item.id ? (
            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              onBlur={() => { updateItemText(item.id, editingText); setEditingId(null); }}
              onSubmitEditing={() => { updateItemText(item.id, editingText); setEditingId(null); }}
              autoFocus
              style={{ flex: 1, fontSize: 14, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 2 }}
            />
          ) : (
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => { setEditingId(item.id); setEditingText(item.item); }}
            >
              <Text style={{
                fontSize: 14,
                color: item.is_completed ? colors.textMuted : colors.textPrimary,
                textDecorationLine: item.is_completed ? 'line-through' : 'none',
              }}>
                {item.item}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => deleteItem(item.id)} style={{ padding: 4 }}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Input para nuevo item */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 }}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <TextInput
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Agregar elemento..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          style={{ flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
        />
        {newItemText.trim().length > 0 && (
          <TouchableOpacity onPress={handleAdd}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
