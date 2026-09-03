import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { Spacing } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { Button, Input } from '../../src/components/ui';

export default function ResetPasswordScreen() {
  const { colors, typography } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleUpdate = async () => {
    if (!password.trim() || !confirm.trim()) { Alert.alert('Requerido', 'Completa ambos campos'); return; }
    if (password !== confirm) { Alert.alert('Error', 'Las contraseñas no coinciden'); return; }
    if (password.length < 6) { Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.lg }}>

        <View style={{ alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0A0A0A' }}>PP</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>Nueva contraseña</Text>
        </View>

        {done ? (
          <View style={{ alignItems: 'center', gap: Spacing.lg }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#22C55E20', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={36} color="#22C55E" />
            </View>
            <View style={{ alignItems: 'center', gap: Spacing.sm }}>
              <Text style={[typography.h4, { textAlign: 'center' }]}>¡Contraseña actualizada!</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión.
              </Text>
            </View>
            <Button label="Iniciar sesión" onPress={() => router.replace('/(auth)/login')} size="lg" style={{ width: '100%' }} />
          </View>
        ) : (
          <View style={{ gap: Spacing.md }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
              Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
            </Text>
            <Input
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              }
            />
            <Input
              label="Confirmar contraseña"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
            />
            <Button label="Actualizar contraseña" onPress={handleUpdate} loading={loading} size="lg" />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
