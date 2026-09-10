import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/lib/ThemeContext';
import { useSubscription } from '../src/hooks/useSubscription';
import { Spacing, Radius } from '../src/lib/theme';

const FREE_FEATURES = [
  { label: 'Hasta 2 proyectos propios', included: true },
  { label: 'Recibir invitaciones ilimitadas', included: true },
  { label: 'Tareas, Chat y Bitácora', included: true },
  { label: 'Hasta 25 planos por proyecto', included: true },
  { label: 'Hasta 25 documentos por proyecto', included: true },
  { label: 'Registro de riesgos', included: true },
  { label: 'Diagrama de Gantt', included: true },
  { label: 'Reportes PDF', included: false },
  { label: 'Control de presupuesto', included: false },
  { label: 'EVM — Valor Ganado', included: false },
  { label: 'Mapa de sitio', included: false },
];

const PRO_FEATURES = [
  { label: 'Proyectos ilimitados', included: true },
  { label: 'Planos y documentos ilimitados', included: true },
  { label: 'Reportes PDF completos', included: true },
  { label: 'Control de presupuesto', included: true },
  { label: 'EVM — Valor Ganado', included: true },
  { label: 'Mapa de sitio', included: true },
  { label: 'Todo lo del plan Free', included: true },
  { label: 'Soporte prioritario', included: true },
];

export default function SubscriptionScreen() {
  const { colors, typography } = useTheme();
  const { isPro, plan, setProForTesting } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      /**
       * TODO: Conectar RevenueCat aquí:
       * 
       * import Purchases from 'react-native-purchases';
       * const offerings = await Purchases.getOfferings();
       * const pkg = billingCycle === 'annual'
       *   ? offerings.current?.annual
       *   : offerings.current?.monthly;
       * if (pkg) await Purchases.purchasePackage(pkg);
       */

      // Por ahora: simulación para testing
      Alert.alert(
        'RevenueCat no conectado',
        'En producción aquí se abriría el flujo de compra nativo de Google Play / App Store.\n\n¿Activar modo Pro para testing?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Activar Pro (testing)',
            onPress: async () => {
              await setProForTesting(true);
              Alert.alert('✅ Pro activado', 'Plan Pro activado para testing. Reinicia la app para ver todos los cambios.');
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restaurar compras',
      /**
       * TODO: Conectar RevenueCat:
       * await Purchases.restorePurchases();
       */
      'Esta función estará disponible cuando RevenueCat esté conectado.',
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h4}>Planes y suscripción</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 }}>

        {/* Estado actual */}
        <View style={{ backgroundColor: isPro ? '#FFD70015' : colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 1, borderColor: isPro ? '#FFD700' : colors.border, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isPro ? '#FFD700' : colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={isPro ? 'star' : 'person-outline'} size={22} color={isPro ? '#0A0A0A' : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodySmall, { fontWeight: '700' }]}>Plan actual: {isPro ? 'Pro ✨' : 'Free'}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {isPro ? 'Tienes acceso a todas las funciones' : 'Actualiza para desbloquear todas las funciones'}
            </Text>
          </View>
        </View>

        {/* Toggle mensual/anual */}
        {!isPro && (
          <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, padding: 4 }}>
            <TouchableOpacity
              onPress={() => setBillingCycle('monthly')}
              style={{ flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: billingCycle === 'monthly' ? colors.surface : 'transparent', alignItems: 'center' }}
            >
              <Text style={[typography.bodySmall, { fontWeight: '600', color: billingCycle === 'monthly' ? colors.textPrimary : colors.textMuted }]}>Mensual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBillingCycle('annual')}
              style={{ flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: billingCycle === 'annual' ? colors.surface : 'transparent', alignItems: 'center', gap: 2 }}
            >
              <Text style={[typography.bodySmall, { fontWeight: '600', color: billingCycle === 'annual' ? colors.textPrimary : colors.textMuted }]}>Anual</Text>
              {billingCycle === 'annual' && (
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFD700' }}>AHORRA 2 MESES</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tarjetas de planes */}
        <View style={{ gap: Spacing.md }}>

          {/* Plan Free */}
          <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: plan === 'free' ? 2 : 0.5, borderColor: plan === 'free' ? colors.primary : colors.border, overflow: 'hidden' }}>
            {plan === 'free' && (
              <View style={{ backgroundColor: colors.primary, padding: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textInverse }}>TU PLAN ACTUAL</Text>
              </View>
            )}
            <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.h4]}>Free</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>$0</Text>
              </View>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Para empezar a gestionar tus proyectos</Text>
              <View style={{ gap: 8 }}>
                {FREE_FEATURES.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={f.included ? 'checkmark-circle' : 'close-circle'} size={16} color={f.included ? '#22C55E' : '#EF4444'} />
                    <Text style={[typography.bodySmall, { color: f.included ? colors.textSecondary : colors.textMuted }]}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Plan Pro */}
          <View style={{ backgroundColor: '#0A0A0A', borderRadius: Radius.lg, borderWidth: plan === 'pro' ? 2 : 0, borderColor: '#FFD700', overflow: 'hidden' }}>
            {plan === 'pro' ? (
              <View style={{ backgroundColor: '#FFD700', padding: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0A0A0A' }}>TU PLAN ACTUAL</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#FFD70020', padding: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFD700' }}>⭐ RECOMENDADO</Text>
              </View>
            )}
            <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Pro</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFD700' }}>
                    {billingCycle === 'annual' ? '$1,490' : '$199'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                    MXN/{billingCycle === 'annual' ? 'año' : 'mes'}
                  </Text>
                  {billingCycle === 'annual' && (
                    <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '600' }}>≈ $124/mes</Text>
                  )}
                </View>
              </View>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Acceso completo a todas las funciones</Text>
              <View style={{ gap: 8 }}>
                {PRO_FEATURES.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    <Text style={{ fontSize: 14, color: '#D1D5DB' }}>{f.label}</Text>
                  </View>
                ))}
              </View>

              {!isPro && (
                <TouchableOpacity
                  onPress={handleSubscribe}
                  disabled={loading}
                  style={{ backgroundColor: '#FFD700', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: 4 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0A0A0A' }}>
                    {loading ? 'Procesando...' : `Suscribirse ${billingCycle === 'annual' ? 'anual' : 'mensual'}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Testing toggle */}
        <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: colors.border, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[typography.bodySmall, { fontWeight: '600' }]}>Modo Pro (solo testing)</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Activa Pro sin pago para probar funciones</Text>
          </View>
          <Switch
            value={isPro}
            onValueChange={(v) => setProForTesting(v)}
            trackColor={{ false: colors.surfaceTertiary, true: '#FFD700' }}
            thumbColor={isPro ? '#0A0A0A' : colors.textMuted}
          />
        </View>

        {/* Restaurar y legales */}
        <TouchableOpacity onPress={handleRestore} style={{ alignItems: 'center' }}>
          <Text style={[typography.bodySmall, { color: colors.primary }]}>Restaurar compras</Text>
        </TouchableOpacity>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
          La suscripción se renueva automáticamente. Puedes cancelar en cualquier momento desde la configuración de tu tienda (Google Play / App Store). Al suscribirte aceptas nuestros Términos y Condiciones.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
