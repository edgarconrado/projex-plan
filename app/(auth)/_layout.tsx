import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/lib/AuthContext';
import { Colors } from '../../src/lib/theme';
import { LoadingOverlay } from '../../src/components/ui';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
