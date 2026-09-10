import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { Spacing, Radius } from '../../lib/theme';
import { router } from 'expo-router';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;        // Ej: "Reportes PDF"
  description?: string;   // Descripción de por qué es útil
}

const PRO_FEATURES = [
  { icon: 'document-text-outline', label: 'Reportes PDF ilimitados' },
  { icon: 'wallet-outline',        label: 'Control de presupuesto' },
  { icon: 'trending-up-outline',   label: 'EVM — Valor Ganado' },
  { icon: 'map-outline',           label: 'Mapa de sitio' },
  { icon: 'infinite-outline',      label: 'Proyectos ilimitados' },
  { icon: 'cloud-upload-outline',  label: 'Planos y documentos ilimitados' },
];

export function PaywallModal({ visible, onClose, feature, description }: PaywallModalProps) {
  const { colors, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>

          {/* Header negro/dorado */}
          <View style={{ backgroundColor: '#0A0A0A', padding: Spacing.lg, alignItems: 'center', gap: 8 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0A0A0A' }}>PP</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Projex Plan Pro</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
              <Text style={{ color: '#FFD700', fontWeight: '700' }}>{feature}</Text> es una función exclusiva del plan Pro
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            {description && (
              <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                {description}
              </Text>
            )}

            {/* Features Pro */}
            <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm }}>
              <Text style={[typography.bodySmall, { fontWeight: '700', marginBottom: 4 }]}>Todo lo que incluye Pro:</Text>
              {PRO_FEATURES.map((f, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFD70020', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={f.icon as any} size={15} color="#FFD700" />
                  </View>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Precios */}
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Mensual</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>$199</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>MXN/mes</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#FFD70015', borderRadius: Radius.lg, borderWidth: 2, borderColor: '#FFD700', padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: '#FFD700', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#0A0A0A' }}>AHORRA 2 MESES</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary }}>$1,490</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>MXN/año</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={() => { onClose(); router.push('/subscription' as never); }}
              style={{ backgroundColor: '#FFD700', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0A0A0A' }}>Ver planes y suscribirse</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: Spacing.sm }}>
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Ahora no</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
