import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/lib/AuthContext';
import { Colors } from '../src/lib/theme';

SplashScreen.preventAutoHideAsync();

const isExpoGo = Constants.appOwnership === 'expo';

export default function RootLayout() {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    SplashScreen.hideAsync();

    // Solo configuramos listeners de notificaciones fuera de Expo Go,
    // ya que Expo Go (SDK 53+) no soporta push remoto y solo genera warnings.
    if (isExpoGo) return;

    let isMounted = true;

    import('expo-notifications').then((Notifications) => {
      if (!isMounted) return;

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[Push] Recibida en foreground:', notification.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        Notifications.setBadgeCountAsync(0);

        if (data?.resource_type === 'conversation' && data?.resource_id) {
          router.push({
            pathname: '/conversation/[id]',
            params: { id: data.resource_id, name: data.name ?? 'Chat' },
          } as never);
        } else if (data?.resource_type === 'task' && data?.resource_id) {
          router.push({ pathname: '/task/[id]', params: { id: data.resource_id } } as never);
        }
      });
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        import('expo-notifications').then((Notifications) => {
          Notifications.removeNotificationSubscription(notificationListener.current);
        });
      }
      if (responseListener.current) {
        import('expo-notifications').then((Notifications) => {
          Notifications.removeNotificationSubscription(responseListener.current);
        });
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <AuthProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
