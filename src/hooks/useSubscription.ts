/**
 * useSubscription — gestiona el estado del plan del usuario
 * 
 * MODO ACTUAL: simulado (isPro se puede cambiar manualmente para testing)
 * MODO PRODUCCIÓN: conectar RevenueCat aquí cuando esté listo
 * 
 * Para activar Pro en testing, cambia DEFAULT_IS_PRO = true
 * Para conectar RevenueCat: npm install react-native-purchases
 * y seguir la guía en https://docs.revenuecat.com/docs/getting-started
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONFIGURACIÓN ───────────────────────────────
const DEFAULT_IS_PRO = false; // Cambiar a true para testing de funciones Pro

export const PLAN_LIMITS = {
  free: {
    maxProjects: 2,      // Proyectos que puede CREAR (no contar invitaciones)
    maxPlans: 25,        // Planos por proyecto
    maxDocuments: 25,    // Documentos por proyecto
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
  // Permisos por feature
  canCreatePDF: boolean;
  canUseBudget: boolean;
  canUseEVM: boolean;
  canUseMap: boolean;
  maxProjects: number;
  maxPlans: number;
  maxDocuments: number;
  // Acciones
  refresh: () => Promise<void>;
  // Solo para testing — remover en producción
  setProForTesting: (value: boolean) => void;
}
// ─────────────────────────────────────────────────

export function useSubscription(): SubscriptionState {
  const [isPro, setIsPro] = useState(DEFAULT_IS_PRO);
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      /**
       * TODO: Reemplazar este bloque con RevenueCat cuando esté listo:
       * 
       * import Purchases from 'react-native-purchases';
       * const customerInfo = await Purchases.getCustomerInfo();
       * const active = customerInfo.entitlements.active['pro'];
       * setIsPro(!!active);
       * setExpiresAt(active?.expirationDate ?? null);
       */

      // Por ahora: leer del AsyncStorage (para testing manual)
      const stored = await AsyncStorage.getItem('@projex:isPro');
      if (stored !== null) setIsPro(stored === 'true');
    } catch {
      // Silenciar errores — usar el valor por defecto
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setProForTesting = useCallback(async (value: boolean) => {
    setIsPro(value);
    await AsyncStorage.setItem('@projex:isPro', value ? 'true' : 'false');
  }, []);

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
  };
}
