import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/lib/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../../src/lib/theme';
import { Button, Input } from '../../src/components/ui';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!fullName.trim()) return 'El nombre es requerido';
    if (!email.trim()) return 'El correo es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Correo inválido';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al registrarse';
      setError(msg.includes('already') ? 'Este correo ya está registrado' : msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: Spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 60, marginBottom: 32 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ gap: Spacing.lg }}>
          <View>
            <Text style={Typography.h2}>Crear cuenta</Text>
            <Text style={[Typography.bodySmall, { marginTop: 4 }]}>Únete a Projex Plan</Text>
          </View>
          {error ? (
            <View style={{ backgroundColor: Colors.dangerMuted, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 0.5, borderColor: Colors.danger }}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={[Typography.bodySmall, { color: Colors.danger, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}
          <Input label="Nombre completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Juan Pérez" leftIcon={<Ionicons name="person-outline" size={18} color={Colors.textMuted} />} />
          <Input label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tu@correo.com" leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.textMuted} />} />
          <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="Mínimo 6 caracteres"
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />}
            rightIcon={<TouchableOpacity onPress={() => setShowPassword(v => !v)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} /></TouchableOpacity>}
          />
          <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholder="Repite tu contraseña" leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />} />
          <Button label="Crear cuenta" onPress={handleRegister} loading={loading} size="lg" style={{ marginTop: Spacing.sm }} />
          <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/(auth)/login" asChild>
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>Inicia sesión</Text>
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
