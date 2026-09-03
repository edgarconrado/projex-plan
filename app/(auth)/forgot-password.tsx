import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { Spacing, Radius } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { Button, Input } from '../../src/components/ui';

export default function ForgotPasswordScreen() {
  const { colors, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { Alert.alert('Requerido', 'Ingresa tu correo electrónico'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'projexplan://reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.lg }}>

        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: 60, left: Spacing.lg }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={{ alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0A0A0A' }}>PP</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>Recuperar contraseña</Text>
        </View>

        {sent ? (
          // Estado: correo enviado
          <View style={{ alignItems: 'center', gap: Spacing.lg }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#22C55E20', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mail-outline" size={36} color="#22C55E" />
            </View>
            <View style={{ alignItems: 'center', gap: Spacing.sm }}>
              <Text style={[typography.h4, { textAlign: 'center' }]}>Revisa tu correo</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
                Si existe una cuenta con {'\n'}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{email}</Text>
                {'\n'}recibirás un enlace de recuperación en los próximos minutos.
              </Text>
              <View style={{ backgroundColor: '#F59E0B15', borderRadius: Radius.md, borderWidth: 1, borderColor: '#F59E0B40', padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 }}>
                  Si no ves el correo en tu bandeja de entrada, revisa tu carpeta de <Text style={{ fontWeight: '700' }}>spam o correo no deseado</Text>. El enlace expira en 1 hora.
                </Text>
              </View>
            </View>
            <Button
              label="Volver al inicio de sesión"
              onPress={() => router.replace('/(auth)/login')}
              size="lg"
              style={{ width: '100%' }}
            />
          </View>
        ) : (
          // Estado: formulario
          <View style={{ gap: Spacing.md }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </Text>
            <Input
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="tu@correo.com"
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
            />
            <Button
              label="Enviar enlace de recuperación"
              onPress={handleReset}
              loading={loading}
              size="lg"
            />
            <TouchableOpacity onPress={() => router.back()} style={{ alignItems: 'center', padding: Spacing.sm }}>
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
