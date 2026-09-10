import {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile } from '../types';
import { registerForPushNotifications } from './notifications';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isWarmingUp: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Calienta la conexión con Supabase con una query liviana
async function warmUpConnection() {
  try {
    await supabase.from('profiles').select('id').limit(1);
  } catch {
    // Silencioso — solo es warm up
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as Profile);
    } catch (e) {
      console.warn('[AuthContext] fetchProfile error:', e);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      if (session?.user) {
        // Warm up primero, luego fetch profile en paralelo
        setIsWarmingUp(true);
        Promise.all([
          warmUpConnection(),
          fetchProfile(session.user.id),
          registerForPushNotifications(session.user.id).catch(console.warn),
        ]).finally(() => setIsWarmingUp(false));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
        if (session?.user) {
          setIsWarmingUp(true);
          Promise.all([
            warmUpConnection(),
            fetchProfile(session.user.id),
            registerForPushNotifications(session.user.id).catch(console.warn),
          ]).finally(() => setIsWarmingUp(false));
        } else {
          setProfile(null);
          setIsWarmingUp(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: fullName, role: 'worker',
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!session?.user) throw new Error('No hay sesión activa');
    const { data, error } = await supabase.from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id).select().single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const deleteAccount = async () => {
    if (!session?.user) throw new Error('No hay sesión activa');
    const userId = session.user.id;

    // 1. Borrar datos del usuario en Supabase (en orden para respetar FK)
    await supabase.from('message_reads').delete().eq('user_id', userId);
    await supabase.from('messages').delete().eq('sender_id', userId);
    await supabase.from('conversation_participants').delete().eq('user_id', userId);
    await supabase.from('task_comments').delete().eq('user_id', userId);
    await supabase.from('task_checklist').delete().eq('completed_by', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('activity_log').delete().eq('user_id', userId);
    await supabase.from('photos').delete().eq('uploaded_by', userId);
    await supabase.from('documents').delete().eq('uploaded_by', userId);
    await supabase.from('plan_annotations').delete().eq('created_by', userId);
    await supabase.from('plans').delete().eq('uploaded_by', userId);
    await supabase.from('tasks').delete().eq('created_by', userId);
    await supabase.from('project_members').delete().eq('user_id', userId);
    await supabase.from('user_settings').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    // 2. Cerrar sesión (el trigger de Supabase Auth elimina el usuario de auth.users)
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, profile,
      isLoading, isAuthenticated: !!session, isWarmingUp,
      signIn, signUp, signOut, updateProfile, refreshProfile, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
