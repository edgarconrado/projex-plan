import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '../../src/hooks/useChat';
import { ChatBubble } from '../../src/components/chat/ChatBubble';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { useAuth } from '../../src/lib/AuthContext';

export default function ConversationScreen() {
  const { colors, typography } = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, markAsRead } = useMessages(id ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const messageText = text.trim();
    setText(''); // Limpiar inmediatamente para feedback visual
    setSending(true);
    try {
      await sendMessage(messageText);
    } catch {
      setText(messageText); // Restaurar si falla
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h4]} numberOfLines={1}>{name ?? 'Conversación'}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Mensajes */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isOwn = item.sender_id === user?.id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showAvatar = !isOwn && prevMsg?.sender_id !== item.sender_id;
            return <ChatBubble message={item} isOwn={isOwn} showAvatar={showAvatar} />;
          }}
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ alignItems: 'center', paddingTop: 60, gap: Spacing.md }}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
                  Sé el primero en escribir
                </Text>
              </View>
            ) : null
          }
        />

        {/* Input */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
          padding: Spacing.md, borderTopWidth: 0.5, borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              flex: 1, backgroundColor: colors.surfaceSecondary,
              borderRadius: Radius.xl, borderWidth: 0.5, borderColor: colors.border,
              paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
              color: colors.textPrimary, fontSize: 15, maxHeight: 120,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: text.trim() ? colors.primary : colors.surfaceSecondary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? colors.textInverse : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
