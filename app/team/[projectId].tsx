import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, RefreshControl, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../../src/lib/ThemeContext';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useAuth } from '../../src/lib/AuthContext';
import { useInvitations, InvitationRole, Invitation } from '../../src/hooks/useInvitations';
import { supabase } from '../../src/lib/supabase';
import { Spacing, Radius } from '../../src/lib/theme';

const ROLES: { value: InvitationRole; label: string; desc: string }[] = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total al proyecto' },
  { value: 'project_manager', label: 'Project Manager', desc: 'Gestiona tareas y equipo' },
  { value: 'supervisor', label: 'Supervisor', desc: 'Supervisa y edita tareas' },
  { value: 'worker', label: 'Trabajador', desc: 'Ve y completa tareas asignadas' },
  { value: 'inspector', label: 'Inspector', desc: 'Revisa y comenta' },
  { value: 'viewer', label: 'Observador', desc: 'Solo lectura' },
];

const STATUS_COLORS = { pending: '#F59E0B', accepted: '#22C55E', expired: '#EF4444' };
const STATUS_LABELS = { pending: 'Pendiente', accepted: 'Aceptada', expired: 'Expirada' };

// Solo admin y project_manager pueden invitar
const CAN_INVITE = ['admin', 'project_manager'];

export default function TeamScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { user, profile } = useAuth();
  const { invitations, isLoading, fetchInvitations, sendInvitation, revokeInvitation } = useInvitations(projectId);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<InvitationRole>('worker');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [userProjectRole, setUserProjectRole] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    fetchInvitations();
    loadMembers();
  }, [projectId]));

  const loadMembers = async () => {
    if (!projectId) return;
    const { data: membersData } = await supabase
      .from('project_members')
      .select('role, profile:profiles(id, full_name, email, avatar_url)')
      .eq('project_id', projectId);
    setMembers((membersData ?? []) as any[]);

    if (user) {
      const { data: myRole } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();
      setUserProjectRole(myRole?.role ?? null);
    }
  };

  const canInvite = userProjectRole ? CAN_INVITE.includes(userProjectRole) : false;

  // Project Manager no puede asignar rol Admin
  const availableRoles = ROLES.filter(r =>
    userProjectRole === 'admin' ? true : r.value !== 'admin'
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchInvitations(), loadMembers()]);
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert('Requerido', 'Ingresa un correo electrónico'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { Alert.alert('Error', 'El correo no es válido'); return; }

    setSending(true);
    try {
      await sendInvitation(
        email.trim(),
        selectedRole,
        projectName ?? 'Proyecto',
        profile?.full_name ?? 'Un colaborador',
      );
      setEmail('');
      setSelectedRole('worker');
      setShowForm(false);
      Alert.alert('✅ Invitación enviada', `Se envió un correo a ${email.trim()} con las instrucciones para unirse.`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar la invitación');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = (inv: Invitation) => {
    Alert.alert('Revocar invitación', `¿Cancelar la invitación a ${inv.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Revocar', style: 'destructive', onPress: () => revokeInvitation(inv.id) },
    ]);
  };

  const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={typography.h4}>Equipo</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{projectName}</Text>
        </View>
        {canInvite && (
          <TouchableOpacity onPress={() => setShowForm(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Ionicons name="mail-outline" size={16} color={colors.textInverse} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textInverse }}>Invitar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {/* Miembros actuales */}
        <View>
          <Text style={[typography.h4, { marginBottom: Spacing.md }]}>
            Miembros ({members.length})
          </Text>
          {members.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>Sin miembros registrados</Text>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {members.map((m, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
                      {m.profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodySmall, { fontWeight: '600' }]}>{m.profile?.full_name ?? '—'}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{m.profile?.email ?? ''}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.surfaceTertiary, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{roleLabel(m.role)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Invitaciones */}
        <View>
          <Text style={[typography.h4, { marginBottom: Spacing.md }]}>
            Invitaciones enviadas ({invitations.length})
          </Text>
          {invitations.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm }}>
              <Ionicons name="mail-outline" size={36} color={colors.textMuted} />
              <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
                {canInvite ? 'Toca "Invitar" para agregar personas al proyecto' : 'Solo Administradores y Project Managers pueden invitar personas'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {invitations.map(inv => {
                const sColor = STATUS_COLORS[inv.status] ?? '#6B7280';
                return (
                  <View key={inv.id} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, gap: Spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.bodySmall, { fontWeight: '600' }]}>{inv.email}</Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>{roleLabel(inv.role)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <View style={{ backgroundColor: `${sColor}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: sColor }}>{STATUS_LABELS[inv.status]}</Text>
                        </View>
                        {inv.status === 'pending' && canInvite && (
                          <TouchableOpacity onPress={() => handleRevoke(inv)} style={{ padding: 4 }}>
                            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      Enviada {format(new Date(inv.created_at), "d 'de' MMM yyyy", { locale: es })} · Expira {format(new Date(inv.expires_at), "d 'de' MMM", { locale: es })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de invitación */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <View>
                    <Text style={typography.h4}>Invitar persona</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>Se enviará un correo con el enlace de acceso</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 6 }]}>Correo electrónico *</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, color: colors.textPrimary, fontSize: 14, marginBottom: Spacing.lg }}
                />

                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: 10 }]}>Rol en el proyecto *</Text>
                <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
                  {availableRoles.map(r => (
                    <TouchableOpacity key={r.value} onPress={() => setSelectedRole(r.value)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: selectedRole === r.value ? colors.primaryMuted : colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: selectedRole === r.value ? colors.primary : colors.border, padding: Spacing.md }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedRole === r.value ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                        {selectedRole === r.value && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: selectedRole === r.value ? colors.primary : colors.textPrimary }}>{r.label}</Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>{r.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity onPress={handleSend} disabled={sending || !email.trim()}
                  style={{ backgroundColor: sending || !email.trim() ? colors.surfaceTertiary : colors.primary, borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  {sending ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Ionicons name="send-outline" size={18} color={sending || !email.trim() ? colors.textMuted : colors.textInverse} />}
                  <Text style={{ fontSize: 15, fontWeight: '700', color: sending || !email.trim() ? colors.textMuted : colors.textInverse }}>
                    {sending ? 'Enviando...' : 'Enviar invitación'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
