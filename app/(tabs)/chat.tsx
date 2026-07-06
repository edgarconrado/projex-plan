import { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../../src/hooks/useChat';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { Avatar, EmptyState, Button, Input } from '../../src/components/ui';
import { ChatItemSkeleton } from '../../src/components/ui/SkeletonLoader';
import { Conversation } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../src/lib/AuthContext';
import { useProjectStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { saveNotification } from '../../src/lib/notifications';

function ConversationItem({ conv, currentUserId, onPress, colors, typography, isUnread }: {
  conv: Conversation; currentUserId: string; onPress: () => void; isUnread: boolean;
  colors: ReturnType<typeof useTheme>['colors']; typography: ReturnType<typeof useTheme>['typography'];
}) {
  const otherParticipants = conv.participants?.filter((p) => p.user_id !== currentUserId) ?? [];
  const name = conv.name ?? otherParticipants.map((p) => p.profile?.full_name?.split(' ')[0]).join(', ') ?? 'Conversación';
  const lastMsg = Array.isArray((conv as any).messages) && (conv as any).messages.length > 0
    ? [...(conv as any).messages].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : Array.isArray(conv.last_message)
      ? conv.last_message.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : conv.last_message;
  const time = lastMsg ? format(new Date(lastMsg.created_at), 'HH:mm', { locale: es }) : '';
  const isOnline = otherParticipants.some((p) => p.profile?.is_online);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: isUnread ? `${colors.primary}10` : 'transparent' }}>
      <View>
        <Avatar name={name} imageUrl={otherParticipants.length === 1 ? otherParticipants[0].profile?.avatar_url : null} size={46} />
        {isOnline && <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.background }} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={[typography.body, { fontWeight: isUnread ? '700' : '600' }]} numberOfLines={1}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {time ? <Text style={[typography.caption, { color: colors.textMuted }]}>{time}</Text> : null}
            {isUnread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
          </View>
        </View>
        {lastMsg
          ? <Text style={[typography.bodySmall, { color: isUnread ? colors.textPrimary : colors.textMuted, fontWeight: isUnread ? '500' : '400' }]} numberOfLines={1}>{lastMsg.message}</Text>
          : <Text style={[typography.bodySmall, { color: colors.textMuted, fontStyle: 'italic' }]}>Sin mensajes aún</Text>
        }
      </View>
      {conv.is_group && <Ionicons name="people-outline" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();
  const { activeProjectId } = useProjectStore();
  const { conversations, isLoading, fetchConversations, createConversation, isConvUnread } = useChat(activeProjectId ?? undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      // Obtener todos los miembros del proyecto activo
      let memberIds: string[] = [];
      if (activeProjectId) {
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', activeProjectId);
        memberIds = (members ?? []).map((m: any) => m.user_id).filter((id: string) => id !== user?.id);
      }

      const conv = await createConversation(newName.trim(), memberIds, activeProjectId ?? undefined);

      // Notificar a los demás miembros
      if (memberIds.length > 0 && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        const creatorName = profile?.full_name ?? 'Alguien';
        for (const memberId of memberIds) {
          await saveNotification({
            userId: memberId,
            type: 'message_received',
            title: 'Nuevo chat creado',
            description: `${creatorName} creó el chat "${newName.trim()}"`,
            resourceType: 'conversation',
            resourceId: conv.id,
          });
        }
      }

      setNewModalVisible(false);
      setNewName('');
      router.push({ pathname: '/conversation/[id]', params: { id: conv.id, name: conv.name ?? newName, projectId: activeProjectId ?? '' } } as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al crear');
    } finally { setCreating(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md }}>
        <Text style={typography.h2}>Mensajes</Text>
        <TouchableOpacity onPress={() => setNewModalVisible(true)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {isLoading && conversations.length === 0 ? (
        <View>{[1, 2, 3, 4].map((i) => <ChatItemSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={conversations} keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />}
              title={activeProjectId ? 'Sin conversaciones' : 'Selecciona un proyecto'}
              subtitle={activeProjectId
                ? 'Crea una nueva conversación tocando el botón +'
                : 'Elige un proyecto activo desde el Dashboard para ver sus chats'
              }
            />
          }
          renderItem={({ item }) => (
            <ConversationItem conv={item} currentUserId={user?.id ?? ''} colors={colors} typography={typography}
              isUnread={isConvUnread(item)}
              onPress={() => {
                const others = item.participants?.filter((p) => p.user_id !== user?.id) ?? [];
                const name = item.name ?? others.map((p) => p.profile?.full_name?.split(' ')[0]).join(', ') ?? 'Conversación';
                router.push({ pathname: '/conversation/[id]', params: { id: item.id, name, projectId: activeProjectId ?? '' } } as never);
              }}
            />
          )}
        />
      )}

      <Modal visible={newModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNewModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => setNewModalVisible(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            <Text style={typography.h4}>Nueva conversación</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={{ padding: Spacing.lg, gap: Spacing.lg }}>
            <Input label="Nombre del chat" value={newName} onChangeText={setNewName} placeholder="Ej. Equipo Torre Norte"
              leftIcon={<Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />} />
            <Button label="Crear conversación" onPress={handleCreate} loading={creating} size="lg" />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
