import { View, Text } from 'react-native';
import { Message } from '../../types';
import { Spacing, Radius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { Avatar } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

export function ChatBubble({ message, isOwn, showAvatar }: ChatBubbleProps) {
  const { colors, typography } = useTheme();
  const time = format(new Date(message.created_at), 'HH:mm', { locale: es });

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
      marginBottom: Spacing.xs,
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
    }}>
      {/* Avatar del otro */}
      {!isOwn && (
        <View style={{ width: 28 }}>
          {showAvatar && message.sender ? (
            <Avatar name={message.sender.full_name} imageUrl={message.sender.avatar_url} size={28} />
          ) : null}
        </View>
      )}

      <View style={{ maxWidth: '75%' }}>
        {/* Nombre del sender (solo mensajes ajenos y cuando es el primero del grupo) */}
        {!isOwn && showAvatar && message.sender && (
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 3, marginLeft: 4 }]}>
            {message.sender.full_name.split(' ')[0]}
          </Text>
        )}

        {/* Burbuja */}
        <View style={{
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderRadius: Radius.lg,
          borderBottomLeftRadius: !isOwn ? Radius.sm : Radius.lg,
          borderBottomRightRadius: isOwn ? Radius.sm : Radius.lg,
          backgroundColor: isOwn ? colors.primary : colors.surfaceSecondary,
          borderWidth: isOwn ? 0 : 0.5,
          borderColor: colors.border,
        }}>
          <Text style={[
            typography.body,
            { color: isOwn ? colors.textInverse : colors.textPrimary, lineHeight: 20 },
          ]}>
            {message.message}
          </Text>
        </View>

        {/* Hora + estado */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 3,
          justifyContent: isOwn ? 'flex-end' : 'flex-start',
          marginTop: 3, paddingHorizontal: 4,
        }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{time}</Text>
          {isOwn && (
            <Ionicons
              name={message.status === 'read' ? 'checkmark-done' : 'checkmark'}
              size={12}
              color={message.status === 'read' ? colors.primary : colors.textMuted}
            />
          )}
        </View>
      </View>
    </View>
  );
}
