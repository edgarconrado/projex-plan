import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { QueueItem } from '../../hooks/useUploadQueue';
import { Spacing, Radius } from '../../lib/theme';

interface Props {
  queue: QueueItem[];
  isProcessing: boolean;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En espera de conexión',
  uploading: 'Subiendo...',
  error: 'Error al subir',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  uploading: '#3B82F6',
  error: '#EF4444',
};

export function UploadQueueBanner({ queue, isProcessing, onRetry, onRemove }: Props) {
  const { colors, typography } = useTheme();

  if (queue.length === 0) return null;

  return (
    <View style={{ gap: 4, marginBottom: Spacing.sm }}>
      {queue.map(item => {
        const color = STATUS_COLOR[item.status] ?? '#6B7280';
        return (
          <View key={item.id} style={{
            backgroundColor: `${color}15`,
            borderRadius: Radius.md,
            borderWidth: 0.5,
            borderColor: `${color}40`,
            padding: Spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
          }}>
            {item.status === 'uploading'
              ? <ActivityIndicator size="small" color={color} />
              : <Ionicons
                  name={item.status === 'error' ? 'warning-outline' : 'cloud-upload-outline'}
                  size={16} color={color}
                />
            }
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color }} numberOfLines={1}>
                {item.fileName}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>
                {STATUS_LABEL[item.status]}
                {item.errorMsg ? ` — ${item.errorMsg}` : ''}
              </Text>
            </View>
            {item.status === 'error' && (
              <TouchableOpacity onPress={() => onRetry(item.id)} style={{ padding: 4 }}>
                <Ionicons name="refresh-outline" size={16} color={color} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onRemove(item.id)} style={{ padding: 4 }}>
              <Ionicons name="close-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}
