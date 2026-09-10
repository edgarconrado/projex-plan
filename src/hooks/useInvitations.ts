import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export type InvitationRole = 'admin' | 'project_manager' | 'supervisor' | 'worker' | 'inspector' | 'viewer';

export interface Invitation {
  id: string;
  email: string;
  project_id: string | null;
  invited_by: string | null;
  role: InvitationRole;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
  project?: { name: string } | null;
  inviter?: { full_name: string } | null;
}

export function useInvitations(projectId?: string) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, project:projects(name), inviter:profiles!invitations_invited_by_fkey(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvitations((data ?? []) as Invitation[]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const sendInvitation = async (
    email: string,
    role: InvitationRole,
    projectName: string,
    inviterName: string,
  ) => {
    if (!user || !projectId) throw new Error('No autenticado');

    // Crear la invitación en la BD
    const { data: inv, error } = await supabase
      .from('invitations')
      .insert({ email: email.trim().toLowerCase(), project_id: projectId, invited_by: user.id, role })
      .select()
      .single();
    if (error) throw error;

    // URL de aceptación — apunta a la Edge Function de Supabase
    const inviteUrl = `https://sgodqxqlsruuvjyvdkjn.supabase.co/functions/v1/accept-invite?token=${inv.token}`;

    // Llamar a la Edge Function para enviar el correo
    const { data: fnData, error: fnError } = await supabase.functions.invoke('send-invite', {
      body: { to: email, inviterName, projectName, role, inviteUrl },
    });

    if (fnError) throw fnError;

    setInvitations(prev => [inv as Invitation, ...prev]);
    return inv as Invitation;
  };

  const revokeInvitation = async (id: string) => {
    setInvitations(prev => prev.filter(i => i.id !== id));
    await supabase.from('invitations').delete().eq('id', id);
  };

  return { invitations, isLoading, fetchInvitations, sendInvitation, revokeInvitation };
}
