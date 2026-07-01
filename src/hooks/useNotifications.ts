import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Notification } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { cacheNotifications, getCachedNotifications } from './useOfflineCache';

// Contador global para generar un nombre de canal único por cada instancia
// del hook — useNotifications() se usa simultáneamente en el layout de tabs
// (para el badge) y en la pantalla de notificaciones, y Supabase Realtime no
// permite dos canales con el mismo nombre suscritos en paralelo.
let channelInstanceCounter = 0;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const instanceIdRef = useRef<number | null>(null);
  if (instanceIdRef.current === null) {
    instanceIdRef.current = channelInstanceCounter++;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        const cached = await getCachedNotifications();
        if (cached.length > 0) setNotifications(cached);
      } else {
        const list = (data ?? []) as Notification[];
        setNotifications(list);
        cacheNotifications(list);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Suscripción en tiempo real: cualquier notificación nueva insertada, o
  // marcada como leída/eliminada desde OTRA instancia de este hook (por
  // ejemplo, el Dashboard y la pantalla de Notificaciones al mismo tiempo),
  // se refleja aquí también — así el badge y la lista siempre coinciden.
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channelName = `notifications:${user.id}:${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const oldRow = payload.old as Partial<Notification>;
          if (oldRow.id) setNotifications((prev) => prev.filter((n) => n.id !== oldRow.id));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    await supabase.from('notifications').delete().eq('id', notificationId);
  };

  return {
    notifications, unreadCount, isLoading,
    fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
  };
}
