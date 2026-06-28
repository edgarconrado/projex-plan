import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Detecta si estamos en Expo Go (donde push remoto no funciona desde SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Solicita permisos y registra el token push en Supabase.
 * En Expo Go esta función no hace nada y retorna null silenciosamente,
 * ya que Expo Go no soporta push remoto desde SDK 53.
 * Para probar push real, usa un development build (eas build --profile development).
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (isExpoGo) {
    console.log('[Push] Saltando registro: estamos en Expo Go');
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    console.log('[Push] Permiso existente:', existing);

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Push] Permiso solicitado, resultado:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Abortando: permiso no concedido, status final:', finalStatus);
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Projex Plan',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
        sound: 'default',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    console.log('[Push] projectId resuelto:', projectId);

    if (!projectId) {
      console.log('[Push] Abortando: no se encontró projectId en Constants.expoConfig.extra.eas ni easConfig');
      return null;
    }

    console.log('[Push] Solicitando token a Expo...');
    const tokenPromise = Notifications.getExpoPushTokenAsync({ projectId });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
    const result = await Promise.race([tokenPromise, timeoutPromise]);

    if (!result) {
      console.log('[Push] Abortando: timeout de 10s esperando getExpoPushTokenAsync (puede tardar la primera vez en Android por FCM)');
      return null;
    }

    const token = result.data;
    console.log('[Push] Token obtenido:', token);

    const { error } = await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
    if (error) {
      console.log('[Push] ERROR guardando token en Supabase:', JSON.stringify(error));
    } else {
      console.log('[Push] Token guardado correctamente en el perfil');
    }
    return token;
  } catch (e) {
    console.warn('[Push] No disponible en este entorno:', e instanceof Error ? e.message : e);
    console.warn('[Push] Detalle completo del error:', JSON.stringify(e, Object.getOwnPropertyNames(e instanceof Error ? e : {})));
    if (e instanceof Error && e.stack) {
      console.warn('[Push] Stack:', e.stack);
    }
    return null;
  }
}

export async function sendLocalNotification(
  title: string, body: string, data?: Record<string, unknown>
): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null,
    });
  } catch {
    // silencioso
  }
}

export async function clearBadge(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // silencioso
  }
}

export async function sendPushNotification(
  tokens: string[], title: string, body: string, data?: Record<string, unknown>
): Promise<void> {
  const messages = tokens
    .filter((t) => t.startsWith('ExponentPushToken'))
    .map((to) => ({ to, title, body, data, sound: 'default', priority: 'high' }));
  if (messages.length === 0) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[Push] Error:', e);
  }
}

export async function notifyUsers(
  userIds: string[], title: string, body: string, data?: Record<string, unknown>
): Promise<void> {
  if (userIds.length === 0) return;
  const { data: profiles } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);
  const tokens = (profiles ?? []).map((p: any) => p.expo_push_token).filter(Boolean) as string[];
  await sendPushNotification(tokens, title, body, data);
}

export async function saveNotification(params: {
  userId: string; type: string; title: string; description?: string;
  resourceType?: string; resourceId?: string; createdBy?: string;
}): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    description: params.description ?? null,
    resource_type: params.resourceType ?? null,
    resource_id: params.resourceId ?? null,
    created_by: params.createdBy ?? null,
    is_read: false,
  });
}
