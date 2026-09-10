import {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import {
  ThemeMode, ThemeColors, getThemeColors, getTypography,
} from './theme';

const STORAGE_KEY = 'projex-theme-preference';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: ReturnType<typeof getTypography>;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile, isAuthenticated } = useAuth();
  // Arranca con la preferencia guardada localmente (instantáneo), o 'dark' si
  // es la primera vez — la app siempre fue oscura, así que ese es el default.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [hydrated, setHydrated] = useState(false);

  // 1) Carga inmediata desde AsyncStorage al montar, sin esperar red.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setModeState(stored);
      }
      setHydrated(true);
    });
  }, []);

  // 2) Una vez autenticado, sincroniza con la preferencia guardada en
  // Supabase (por si el usuario cambió de tema en otro dispositivo).
  useEffect(() => {
    if (!isAuthenticated || !profile) return;
    const remote = (profile as any).theme_preference as ThemeMode | undefined;
    if (remote === 'light' || remote === 'dark') {
      setModeState(remote);
      AsyncStorage.setItem(STORAGE_KEY, remote).catch(() => {});
    }
  }, [isAuthenticated, profile]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    if (profile?.id) {
      supabase.from('profiles').update({ theme_preference: next }).eq('id', profile.id).then(
        () => {},
        () => {}
      );
    }
  }, [profile?.id]);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const colors = getThemeColors(mode);
  const typography = getTypography(colors);

  return (
    <ThemeContext.Provider
      value={{ mode, colors, typography, isDark: mode === 'dark', setMode, toggleMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
