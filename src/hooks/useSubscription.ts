/**
 * useSubscription — gestiona el estado del plan del usuario
 *
 * MODO ACTUAL: simulado (isPro se puede cambiar manualmente para testing)
 * MODO PRODUCCIÓN: conectar RevenueCat aquí cuando esté listo
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const DEFAULT_IS_PRO = false;

export const PLAN_LIMITS = {
  free: {
    maxProjects: 2,
    maxPlans: 25,
    maxDocuments: 25,
  },
};

export const PLAN_PRICES = {
  monthly: { amount: 199, currency: 'MXN', label: '$199 MXN/mes' },
  annual:  { amount: 1490, currency: 'MXN', label: '$1,490 MXN/año', savingsLabel: 'Ahorra 2 meses' },
};

export interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
  canCreatePDF: boolean;
  canUseBudget: boolean;
  canUseEVM: boolean;
  canUseMap: boolean;
  maxProjects: number;
  maxPlans: number;
  maxDocuments: number;
  refresh: () => Promise<void>;
  setProForTesting: (value: boolean) => void;
  // Verificar si el creador de un proyecto es Pro
  isProjectCreatorPro: (createdBy: string | null | undefined) => Promise<boolean>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(DEFAULT_IS_PRO);
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      /**
       * TODO: Reemplazar con RevenueCat:
       * const customerInfo = await Purchases.getCustomerInfo();
       * const active = customerInfo.entitlements.active['pro'];
       * setIsPro(!!active);
       * setExpiresAt(active?.expirationDate ?? null);
       */

      // Leer primero de Supabase (fuente de verdad) si hay usuario autenticado
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', user.id)
          .single();
        if (data !== null) {
          const proFromDB = data?.is_pro ?? false;
          setIsPro(proFromDB);
          // Sincronizar AsyncStorage con el valor de la BD
          await AsyncStorage.setItem('@projex:isPro', proFromDB ? 'true' : 'false');
          return;
        }
      }
      // Fallback: leer del AsyncStorage si no hay conexión
      const stored = await AsyncStorage.getItem('@projex:isPro');
      if (stored !== null) setIsPro(stored === 'true');
    } catch {
      // Sin conexión — usar AsyncStorage como fallback
      try {
        const stored = await AsyncStorage.getItem('@projex:isPro');
        if (stored !== null) setIsPro(stored === 'true');
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);
  // Refrescar también cuando cambia el usuario (login/logout)
  useEffect(() => { if (user?.id) refresh(); }, [user?.id]);

  const setProForTesting = useCallback(async (value: boolean) => {
    // Actualizar Supabase primero
    if (user?.id) {
      await supabase.from('profiles').update({ is_pro: value }).eq('id', user.id);
    }
    // Actualizar AsyncStorage
    await AsyncStorage.setItem('@projex:isPro', value ? 'true' : 'false');
    // Actualizar estado local inmediatamente sin reiniciar
    setIsPro(value);
  }, [user?.id]);

  // Verifica si el creador de un proyecto tiene Pro — siempre consulta Supabase
  const isProjectCreatorPro = useCallback(async (createdBy: string | null | undefined): Promise<boolean> => {
    if (!createdBy) return false;
    // Si el creador soy yo, usar el estado local ya sincronizado con Supabase
    if (createdBy === user?.id) return isPro;
    // Si no, consultar Supabase
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', createdBy)
        .single();
      return data?.is_pro ?? false;
    } catch { return false; }
  }, [user?.id, isPro]);

  return {
    isPro,
    isLoading,
    plan: isPro ? 'pro' : 'free',
    expiresAt,
    canCreatePDF:    isPro,
    canUseBudget:    isPro,
    canUseEVM:       isPro,
    canUseMap:       isPro,
    maxProjects:     isPro ? Infinity : PLAN_LIMITS.free.maxProjects,
    maxPlans:        isPro ? Infinity : PLAN_LIMITS.free.maxPlans,
    maxDocuments:    isPro ? Infinity : PLAN_LIMITS.free.maxDocuments,
    refresh,
    setProForTesting,
    isProjectCreatorPro,
  };
}
