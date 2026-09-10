import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/AuthContext';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { Button, Input } from '../../src/components/ui';

export default function LoginScreen() {
  const { colors, typography } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Por favor completa todos los campos'); return; }
    setError(''); setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg.includes('Invalid') ? 'Correo o contraseña incorrectos' : msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: Spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginTop: 80, marginBottom: 48 }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 88, height: 88, borderRadius: Radius.xl, marginBottom: Spacing.lg }}
          />
          <Text style={[typography.h1, { color: colors.primary }]}>Projex Plan</Text>
          <Text style={[typography.bodySmall, { marginTop: 6 }]}>Gestión de proyectos de construcción</Text>
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Text style={typography.h3}>Iniciar sesión</Text>
          {error ? (
            <View style={{ backgroundColor: colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 0.5, borderColor: colors.danger }}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[typography.bodySmall, { color: colors.danger, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}
          <Input label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tu@correo.com" leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />} />
          <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="••••••••"
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
            rightIcon={<TouchableOpacity onPress={() => setShowPassword(v => !v)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} /></TouchableOpacity>}
          />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as never)} style={{ alignSelf: 'flex-end' }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          <Button label="Iniciar sesión" onPress={handleLogin} loading={loading} size="lg" style={{ marginTop: Spacing.sm }} />
          <View style={{ alignItems: 'center', marginTop: Spacing.lg }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              ¿No tienes cuenta?{' '}
              <Link href="/(auth)/register" asChild>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Regístrate</Text>
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
