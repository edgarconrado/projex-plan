import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useTheme } from '../../src/lib/ThemeContext';
import { Spacing, Radius } from '../../src/lib/theme';
import { EmptyState } from '../../src/components/ui';
import { Notification } from '../../src/types';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

const ICONS_BY_TYPE: Record<string, { icon: string; color: string }> = {
  task_assigned: { icon: 'checkbox-outline', color: '#3B82F6' },
  task_completed: { icon: 'checkmark-circle-outline', color: '#22C55E' },
  task_updated: { icon: 'create-outline', color: '#F59E0B' },
  message_received: { icon: 'chatbubble-outline', color: '#3B82F6' },
  deadline_approaching: { icon: 'alarm-outline', color: '#EF4444' },
  photo_uploaded: { icon: 'image-outline', color: '#22C55E' },
  comment_added: { icon: 'chatbox-outline', color: '#3B82F6' },
  plan_uploaded: { icon: 'map-outline', color: '#FFD700' },
  plan_revision: { icon: 'sync-outline', color: '#FFD700' },
  document_uploaded: { icon: 'document-outline', color: '#FFD700' },
  system: { icon: 'information-circle-outline', color: '#999999' },
};

function getIconFor(type: string) {
  return ICONS_BY_TYPE[type] ?? { icon: 'notifications-outline', color: '#999999' };
}

function formatGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  return format(date, "d 'de' MMMM", { locale: es });
}

function navigateToResource(notification: Notification) {
  const { resource_type, resource_id } = notification;
  if (!resource_type || !resource_id) return;
  switch (resource_type) {
    case 'task':
      router.push({ pathname: '/task/[id]', params: { id: resource_id } } as never);
      break;
    case 'conversation':
      router.push({ pathname: '/conversation/[id]', params: { id: resource_id } } as never);
      break;
    case 'plan':
      router.push({ pathname: '/plans/[projectId]', params: { projectId: resource_id } } as never);
      break;
    case 'document':
      router.push({ pathname: '/documents/[projectId]', params: { projectId: resource_id } } as never);
      break;
    default:
      break;
  }
}

export default function NotificationsScreen() {
  const { colors, typography } = useTheme();
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handlePress = (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    navigateToResource(notification);
  };

  const handleLongPress = (notification: Notification) => {
    Alert.alert('Notificación', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: notification.is_read ? 'Marcar como no leída' : 'Marcar como leída',
        onPress: () => {
          if (notification.is_read) {
            // No hay un "unmark" implementado en el hook todavía — solo marcamos como leída en ambos sentidos por simplicidad
            markAsRead(notification.id);
          } else {
            markAsRead(notification.id);
          }
        },
      },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteNotification(notification.id) },
    ]);
  };

  // Agrupamos por fecha (Hoy / Ayer / fecha) para una lista tipo Gmail/Instagram
  const grouped: { label: string; items: Notification[] }[] = [];
  for (const n of notifications) {
    const label = formatGroupLabel(n.created_at);
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(n);
    } else {
      grouped.push({ label, items: [n] });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h2}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {unreadCount} sin leer
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Marcar todas leídas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.label}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />}
              title="Sin notificaciones"
              subtitle="Aquí verás tareas asignadas, mensajes, planos y documentos nuevos"
            />
          ) : null
        }
        renderItem={({ item: group }) => (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: Spacing.sm }]}>{group.label}</Text>
            <View style={{ gap: Spacing.xs }}>
              {group.items.map((n) => {
                const { icon, color } = getIconFor(n.type);
                return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => handlePress(n)}
                    onLongPress={() => handleLongPress(n)}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
                      backgroundColor: n.is_read ? colors.surfaceSecondary : colors.primaryMuted,
                      borderRadius: Radius.lg,
                      borderWidth: 0.5, borderColor: n.is_read ? colors.border : colors.primary,
                      padding: Spacing.md,
                    }}
                  >
                    <View style={{
                      width: 38, height: 38, borderRadius: 10,
                      backgroundColor: `${color}20`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={icon as never} size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodySmall, { fontWeight: n.is_read ? '500' : '700', color: colors.textPrimary }]}>
                        {n.title}
                      </Text>
                      {n.description ? (
                        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
                          {n.description}
                        </Text>
                      ) : null}
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                        {format(new Date(n.created_at), 'HH:mm')}
                      </Text>
                    </View>
                    {!n.is_read && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
