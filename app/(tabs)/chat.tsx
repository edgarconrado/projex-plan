import { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../../src/hooks/useChat';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { Avatar, EmptyState, Button, Input } from '../../src/components/ui';
import { ChatItemSkeleton } from '../../src/components/ui/SkeletonLoader';
import { Conversation } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../src/lib/AuthContext';

function ConversationItem({ conv, currentUserId, onPress, colors, typography }: {
  conv: Conversation; currentUserId: string; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; typography: ReturnType<typeof useTheme>['typography'];
}) {
  const otherParticipants = conv.participants?.filter((p) => p.user_id !== currentUserId) ?? [];
  const name = conv.name ?? otherParticipants.map((p) => p.profile?.full_name?.split(' ')[0]).join(', ') ?? 'Conversación';
  const lastMsg = conv.last_message;
  const time = lastMsg ? format(new Date(lastMsg.created_at), 'HH:mm', { locale: es }) : '';
  const isOnline = otherParticipants.some((p) => p.profile?.is_online);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <View>
        <Avatar name={name} size={46} />
        {isOnline && <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.background }} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={[typography.body, { fontWeight: '600' }]} numberOfLines={1}>{name}</Text>
          {time ? <Text style={[typography.caption, { color: colors.textMuted }]}>{time}</Text> : null}
        </View>
        {lastMsg
          ? <Text style={[typography.bodySmall, { color: colors.textMuted }]} numberOfLines={1}>{lastMsg.message}</Text>
          : <Text style={[typography.bodySmall, { color: colors.textMuted, fontStyle: 'italic' }]}>Sin mensajes aún</Text>
        }
      </View>
      {conv.is_group && <Ionicons name="people-outline" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { colors, typography } = useTheme();
  const { user } = useAuth();
  const { conversations, isLoading, fetchConversations, createConversation } = useChat();
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
      const conv = await createConversation(newName.trim(), []);
      setNewModalVisible(false);
      setNewName('');
      router.push({ pathname: '/conversation/[id]', params: { id: conv.id, name: conv.name ?? newName } } as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al crear');
    } finally { setCreating(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
              title="Sin conversaciones"
              subtitle="Crea una nueva conversación tocando el botón +"
            />
          }
          renderItem={({ item }) => (
            <ConversationItem conv={item} currentUserId={user?.id ?? ''} colors={colors} typography={typography}
              onPress={() => {
                const others = item.participants?.filter((p) => p.user_id !== user?.id) ?? [];
                const name = item.name ?? others.map((p) => p.profile?.full_name?.split(' ')[0]).join(', ') ?? 'Conversación';
                router.push({ pathname: '/conversation/[id]', params: { id: item.id, name } } as never);
              }}
            />
          )}
        />
      )}

      <Modal visible={newModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNewModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}
