import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types';
import { useAuth } from '../lib/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notifyUsers, saveNotification } from '../lib/notifications';
import { useUIStore } from '../stores';

export function useChat(projectId?: string) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const setChatUnread = useUIStore((s) => s.setChatUnread);

  // Calcular conversaciones con mensajes no leídos y actualizar el badge
  const isConvUnread = useCallback((conv: Conversation): boolean => {
    const myParticipant = conv.participants?.find((p: any) => p.user_id === user?.id);
    if (!myParticipant) return false;
    const lastRead = myParticipant.last_read_at;
    const msgs = (conv as any).messages ?? [];
    if (msgs.length === 0) return false;
    const latestMsg = msgs.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latestMsg.sender_id === user?.id) return false;
    if (!lastRead) return true;
    return new Date(latestMsg.created_at) > new Date(lastRead);
  }, [user?.id]);

  const updateUnreadCount = useCallback((convs: Conversation[]) => {
    const unread = convs.filter(conv => isConvUnread(conv)).length;
    setChatUnread(unread);
  }, [isConvUnread, setChatUnread]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Obtener IDs de conversaciones donde el usuario es participante
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = (participantData ?? []).map(p => p.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      let query = supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            id, user_id, last_read_at,
            profile:profiles(id, full_name, avatar_url, is_online)
          ),
          messages(id, message, created_at, sender_id)
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      // Filtrar por proyecto activo si se especifica
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      const convList = (data ?? []) as Conversation[];
      setConversations(convList);
      updateUnreadCount(convList);
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId]);

  const createConversation = async (
    name: string,
    participantIds: string[],
    projectId?: string,
  ): Promise<Conversation> => {
    if (!user) throw new Error('No hay sesión');
    const { data, error } = await supabase
      .from('conversations')
      .insert({ name, project_id: projectId ?? null, is_group: participantIds.length > 1, created_by: user.id })
      .select()
      .single();
    if (error) throw error;
    const conv = data as Conversation;
    const allIds = Array.from(new Set([user.id, ...participantIds]));
    await supabase.from('conversation_participants').insert(
      allIds.map((uid) => ({ conversation_id: conv.id, user_id: uid }))
    );
    await fetchConversations();
    return conv;
  };

  return { conversations, isLoading, fetchConversations, createConversation, isConvUnread };
}

export function useMessages(conversationId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:profiles(id, full_name, avatar_url)`)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data ?? []) as Message[]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();

    channelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:profiles(id, full_name, avatar_url)`)
            .eq('id', payload.new.id)
            .single();
          if (data) setMessages((prev) => [...prev, data as Message]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (text: string): Promise<void> => {
    if (!user || !text.trim()) return;
    const { data: inserted, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: text.trim(),
      status: 'sent',
    }).select().single();
    if (error) throw error;

    // Agregar el mensaje al estado local inmediatamente sin esperar Realtime
    if (inserted?.id) {
      const { data: fullMsg } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url)')
        .eq('id', inserted.id)
        .single();
      if (fullMsg) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === (fullMsg as any).id)) return prev;
          return [...prev, fullMsg as Message];
        });
      }
    }

    // Actualizar updated_at de la conversación para que aparezca primero en la lista
    await supabase.from('conversations').update({
      updated_at: new Date().toISOString(),
    }).eq('id', conversationId);

    // Notificar a los otros participantes
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id);

    if (participants && participants.length > 0) {
      const otherIds = participants.map((p: any) => p.user_id);
      const senderName = user.email?.split('@')[0] ?? 'Alguien';
      await notifyUsers(otherIds, `💬 ${senderName}`, text.trim(), {
        resource_type: 'conversation',
        resource_id: conversationId,
      });
      // Guardar notificación en BD para cada participante
      for (const uid of otherIds) {
        await saveNotification({
          userId: uid,
          type: 'message_received',
          title: `💬 ${senderName}`,
          description: text.trim(),
          resourceType: 'conversation',
          resourceId: conversationId,
          createdBy: user.id,
        });
      }
    }
  };

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
    // Decrementar el badge del tab de chat
    useUIStore.getState().setChatUnread(
      Math.max(0, useUIStore.getState().chatUnreadCount - 1)
    );
  }, [conversationId, user]);

  return { messages, isLoading, sendMessage, markAsRead };
}
