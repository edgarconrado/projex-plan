import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/lib/AuthContext';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { Spacing, Radius, getRoleLabel } from '../../src/lib/theme';
import { Avatar, Button, Input, Divider } from '../../src/components/ui';
import { ProfileSkeleton } from '../../src/components/ui/SkeletonLoader';
import { uploadFile, generateFileName, STORAGE_BUCKETS, supabase } from '../../src/lib/supabase';

function SettingRow({ icon, label, value, onPress, rightElement, colors }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  rightElement?: React.ReactNode; colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as never} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textPrimary }}>{label}</Text>
        {value && <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{value}</Text>}
      </View>
      {rightElement ?? (onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />)}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { profile, updateProfile, signOut, refreshProfile, isLoading, user, deleteAccount } = useAuth();
  const { colors, typography, mode, setMode } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [profileTimeout, setProfileTimeout] = useState(false);

  // Si hay sesión pero no perfil, intentar crearlo (cuenta nueva en iPad/dispositivo nuevo)
  useEffect(() => {
    if (!isLoading && !profile && user) {
      // Intentar upsert del perfil en caso de que no se haya creado al registrarse
      supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? user.email ?? 'Usuario',
          role: 'worker',
        })
        .then(() => refreshProfile());

      // Timeout de seguridad: si después de 8s sigue sin perfil, mostrar error recuperable
      const timer = setTimeout(() => setProfileTimeout(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, profile, user]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // Perfil aún cargando pero no timeout
  if (!profile && !profileTimeout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // Timeout: perfil no disponible, mostrar pantalla de reintento
  if (!profile && profileTimeout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
          <Text style={[typography.h4, { textAlign: 'center' }]}>No se pudo cargar el perfil</Text>
          <Text style={[typography.bodySmall, { textAlign: 'center', color: colors.textMuted }]}>
            Verifica tu conexión a internet e intenta de nuevo.
          </Text>
          <TouchableOpacity
            onPress={() => { setProfileTimeout(false); refreshProfile(); }}
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10 }}
          >
            <Text style={{ color: colors.textInverse, fontWeight: '600' }}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.danger, fontSize: 14 }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const p = profile!; // guaranteed non-null by guards above
  const notificationsEnabled = p.notifications_enabled ?? true;

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'El nombre es requerido'); return; }
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), job_title: jobTitle.trim() || null, company: company.trim() || null, phone: phone.trim() || null });
      setEditModalVisible(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const path = `avatars/${p?.id}/${generateFileName('avatar.jpg')}`;
      const url = await uploadFile(STORAGE_BUCKETS.AVATARS, path, asset.uri, 'image/jpeg');
      await updateProfile({ avatar_url: url });
      await refreshProfile();
    } catch { Alert.alert('Error', 'No se pudo subir la foto'); }
    finally { setUploadingAvatar(false); }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setSavingNotifications(true);
    try {
      await updateProfile({ notifications_enabled: value } as any);
      // Si se desactivan, limpiamos el push token registrado para que el
      // backend (triggers/funciones que envían notificaciones) no le mande nada.
      if (!value) {
        await supabase.from('profiles').update({ expo_push_token: null }).eq('id', p.id);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro? Esta acción eliminará permanentemente tu cuenta y todos tus datos. Esta operación no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar eliminación',
              'Escribe ELIMINAR para confirmar que deseas borrar tu cuenta permanentemente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar y eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (e) {
                      Alert.alert('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo o contacta soporte.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
          <TouchableOpacity onPress={handlePickAvatar} style={{ marginBottom: Spacing.lg }}>
            <Avatar name={p.full_name} imageUrl={p.avatar_url} size={88} />
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background }}>
              <Ionicons name={uploadingAvatar ? 'hourglass-outline' : 'camera-outline'} size={14} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
          <Text style={typography.h3}>{p.full_name}</Text>
          {p.job_title && <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 4 }]}>{p.job_title}</Text>}
          {p.company && <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{p.company}</Text>}
          <View style={{ marginTop: Spacing.md, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: colors.primaryMuted, borderWidth: 0.5, borderColor: colors.primary }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{getRoleLabel(p.role)}</Text>
          </View>
        </View>

        <Divider />

        <Text style={[typography.label, { color: colors.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>Información personal</Text>
        <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.lg }}>
          <SettingRow colors={colors} icon="mail-outline" label="Correo" value={p.email} />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="call-outline" label="Teléfono" value={p.phone ?? 'No especificado'} onPress={() => { setFullName(p.full_name); setJobTitle(p.job_title ?? ''); setCompany(p.company ?? ''); setPhone(p.phone ?? ''); setEditModalVisible(true); }} />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="briefcase-outline" label="Puesto" value={p.job_title ?? 'No especificado'} onPress={() => { setFullName(p.full_name); setJobTitle(p.job_title ?? ''); setCompany(p.company ?? ''); setPhone(p.phone ?? ''); setEditModalVisible(true); }} />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="business-outline" label="Empresa" value={p.company ?? 'No especificado'} onPress={() => { setFullName(p.full_name); setJobTitle(p.job_title ?? ''); setCompany(p.company ?? ''); setPhone(p.phone ?? ''); setEditModalVisible(true); }} />
        </View>

        <TouchableOpacity onPress={() => { setFullName(p.full_name); setJobTitle(p.job_title ?? ''); setCompany(p.company ?? ''); setPhone(p.phone ?? ''); setEditModalVisible(true); }}
          style={{ marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.primary }}>
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Editar perfil</Text>
        </TouchableOpacity>

        <Text style={[typography.label, { color: colors.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>Preferencias</Text>
        <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.lg }}>
          <SettingRow
            colors={colors}
            icon="notifications-outline"
            label="Notificaciones"
            value={notificationsEnabled ? 'Activadas' : 'Desactivadas'}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={savingNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textInverse}
              />
            }
          />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow
            colors={colors}
            icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
            label="Tema"
            value={mode === 'dark' ? 'Oscuro' : 'Claro'}
            rightElement={
              <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceTertiary, borderRadius: Radius.full, padding: 3 }}>
                <TouchableOpacity
                  onPress={() => setMode('dark')}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
                    backgroundColor: mode === 'dark' ? colors.primary : 'transparent',
                  }}
                >
                  <Ionicons name="moon" size={14} color={mode === 'dark' ? colors.textInverse : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode('light')}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
                    backgroundColor: mode === 'light' ? colors.primary : 'transparent',
                  }}
                >
                  <Ionicons name="sunny" size={14} color={mode === 'light' ? colors.textInverse : colors.textMuted} />
                </TouchableOpacity>
              </View>
            }
          />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="language-outline" label="Idioma" value="Español" />
        </View>

        <Text style={[typography.label, { color: colors.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>Aplicación</Text>
        <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: Spacing.lg }}>
          <SettingRow colors={colors} icon="information-circle-outline" label="Versión" value="1.2.0" />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="help-circle-outline" label="Soporte" onPress={() => Alert.alert('Soporte', 'Contacta a edgarconrado23@gmail.com')} />
          <Divider style={{ marginVertical: 0 }} />
          {/* Suscripción oculta hasta integrar IAP — no mostrar a Apple */}
          {/* <SettingRow colors={colors} icon="star-outline" label="Plan y suscripción" onPress={() => router.push('/subscription' as never)} /> */}
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="shield-checkmark-outline" label="Aviso de Privacidad" onPress={() => router.push({ pathname: '/legal', params: { type: 'privacy' } } as never)} />
          <Divider style={{ marginVertical: 0 }} />
          <SettingRow colors={colors} icon="document-text-outline" label="Términos y Condiciones" onPress={() => router.push({ pathname: '/legal', params: { type: 'terms' } } as never)} />
        </View>

        <TouchableOpacity onPress={handleSignOut}
          style={{ marginTop: Spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: colors.dangerMuted, borderWidth: 0.5, borderColor: colors.danger }}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 15 }}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteAccount}
          style={{ marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md }}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Eliminar cuenta</Text>
        </TouchableOpacity>

        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: Spacing.xl }]}>
          Miembro desde {new Date(p.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })}
        </Text>
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            <Text style={typography.h4}>Editar perfil</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }} keyboardShouldPersistTaps="handled">
            <Input label="Nombre completo" value={fullName} onChangeText={setFullName} placeholder="Juan Pérez" leftIcon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />} />
            <Input label="Puesto" value={jobTitle} onChangeText={setJobTitle} placeholder="Ingeniero Civil" leftIcon={<Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />} />
            <Input label="Empresa" value={company} onChangeText={setCompany} placeholder="Constructora XYZ" leftIcon={<Ionicons name="business-outline" size={18} color={colors.textMuted} />} />
            <Input label="Teléfono" value={phone} onChangeText={setPhone} placeholder="+52 33 1234 5678" keyboardType="phone-pad" leftIcon={<Ionicons name="call-outline" size={18} color={colors.textMuted} />} />
            <Button label="Guardar cambios" onPress={handleSaveProfile} loading={saving} size="lg" style={{ marginTop: Spacing.sm }} />
          </ScrollView>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
