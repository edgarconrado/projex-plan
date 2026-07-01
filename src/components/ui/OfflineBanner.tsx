import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../../lib/theme';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount?: number;
}

export function OfflineBanner({ isOnline, pendingCount = 0 }: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  // Altura total del banner: padding top (insets) + contenido (36px)
  const BANNER_HEIGHT = insets.top + 36;
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: isOnline ? 0 : BANNER_HEIGHT,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOnline, BANNER_HEIGHT]);

  return (
    <Animated.View style={{ height: heightAnim, overflow: 'hidden', zIndex: 999 }}>
      <View style={{
        height: BANNER_HEIGHT,
        backgroundColor: '#1A1A2E',
        borderBottomWidth: 1,
        borderBottomColor: '#F59E0B',
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.lg,
        paddingBottom: 8,
        gap: Spacing.sm,
      }}>
        <Ionicons name="cloud-offline-outline" size={16} color="#F59E0B" />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#F59E0B' }}>
          Sin conexión — modo lectura
        </Text>
        {pendingCount > 0 && (
          <View style={{ backgroundColor: '#F59E0B', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0A0A0A' }}>
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
