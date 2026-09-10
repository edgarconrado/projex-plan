import { ComponentProps } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/AuthContext';
import { useUIStore } from '../../src/stores';
import { Colors, Radius, Spacing, Typography } from '../../src/lib/theme';
import { LoadingOverlay, OfflineBanner } from '../../src/components/ui';
import { useOfflineSync } from '../../src/hooks/useOfflineSync';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused, badge }: { name: IoniconName; focused: boolean; badge?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={24} color={focused ? Colors.primary : Colors.textMuted} />
      {badge && badge > 0 ? (
        <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: Colors.danger, borderRadius: Radius.full, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function WarmUpBanner() {
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
      backgroundColor: Colors.surfaceSecondary,
      borderBottomWidth: 0.5, borderBottomColor: Colors.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: Spacing.sm, paddingVertical: Spacing.sm,
    }}>
      <ActivityIndicator size="small" color={Colors.primary} />
      <Text style={[Typography.caption, { color: Colors.textMuted }]}>
        Conectando...
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading, isWarmingUp } = useAuth();
  const unreadChatCount = useUIStore((s) => s.chatUnreadCount);
  const { isOnline, pendingCount } = useOfflineSync({
    onSyncComplete: (synced) => {
      Alert.alert('Sincronizado', `${synced} cambio${synced !== 1 ? 's' : ''} sincronizado${synced !== 1 ? 's' : ''} correctamente.`);
    },
  });

  if (isLoading) return <LoadingOverlay message="Cargando..." />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1 }}>
      {isWarmingUp && <WarmUpBanner />}
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopWidth: 0.5, borderTopColor: Colors.border,
            height: 64, paddingBottom: 10, paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 9, fontWeight: '500' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} /> }} />
        <Tabs.Screen name="projects" options={{ title: 'Proyectos', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} /> }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tareas', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'checkbox' : 'checkbox-outline'} focused={focused} /> }} />
        <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} badge={unreadChatCount} /> }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} /> }} />
      </Tabs>
    </View>
  );
}
