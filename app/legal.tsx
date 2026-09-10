import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/lib/ThemeContext';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { Spacing, Radius } from '../src/lib/theme';

const PRIVACY_CONTENT = [
  {
    title: '1. Responsable del Tratamiento',
    body: 'Jacaranda Lab, desarrolladora de Projex Plan, con domicilio en Guadalajara, Jalisco, México, es la entidad responsable del tratamiento de sus datos personales conforme a la LFPDPPP.\n\nContacto: noreply@jacaranda-lab.com',
  },
  {
    title: '2. Datos que Recabamos',
    body: 'Recopilamos los siguientes datos:\n\n• Nombre, correo electrónico y fotografía de perfil\n• Proyectos, tareas y mensajes generados en la app\n• Fotografías de evidencia de avance de obra\n• Documentos y planos subidos\n• Token de notificaciones push\n• Ubicación GPS (solo al usar la función de mapa, con su consentimiento)\n• Datos técnicos del dispositivo',
  },
  {
    title: '3. Finalidades del Tratamiento',
    body: 'Sus datos se utilizan para:\n\n• Gestionar su cuenta y proyectos de construcción\n• Facilitar la comunicación entre miembros del equipo\n• Enviar notificaciones de actividad del proyecto\n• Generar reportes de avance en PDF\n• Gestionar invitaciones a proyectos\n• Mejorar la experiencia de uso (finalidad secundaria, puede oponerse)',
  },
  {
    title: '4. Transferencia de Datos',
    body: 'Sus datos pueden ser compartidos con:\n\n• Supabase Inc. — infraestructura de base de datos\n• Google LLC — mapas y notificaciones push (Firebase)\n• Expo Technology Inc. — plataforma de la aplicación\n• Resend Inc. — envío de correos electrónicos\n\nTodos cuentan con políticas de privacidad propias y niveles adecuados de protección.',
  },
  {
    title: '5. Derechos ARCO',
    body: 'Tiene derecho a Acceder, Rectificar, Cancelar y Oponerse al tratamiento de sus datos. Para ejercerlos, envíe una solicitud a noreply@jacaranda-lab.com con:\n\n• Nombre completo y correo registrado\n• Derecho que desea ejercer\n• Copia de identificación oficial\n\nResponderemos en un máximo de 20 días hábiles.',
  },
  {
    title: '6. Seguridad',
    body: 'Implementamos medidas de seguridad que incluyen:\n\n• Cifrado HTTPS/TLS en todas las comunicaciones\n• Autenticación segura mediante Supabase Auth\n• Control de acceso por roles (Row Level Security)\n• Sin almacenamiento de contraseñas en texto plano',
  },
  {
    title: '7. Cambios al Aviso',
    body: 'Podemos modificar este aviso en cualquier momento. Los cambios serán notificados a través de la aplicación. Le recomendamos revisarlo periódicamente.',
  },
];

const TERMS_CONTENT = [
  {
    title: '1. Descripción del Servicio',
    body: 'Projex Plan es una aplicación de gestión de proyectos de construcción que incluye: gestión de tareas y equipos, visor de planos, gestión de documentos, chat entre miembros, bitácora de obra, control de presupuesto, reportes PDF, registro de riesgos, EVM y diagrama de Gantt.',
  },
  {
    title: '2. Registro y Cuenta',
    body: 'Al registrarse, usted se compromete a:\n\n• Proporcionar información veraz y actualizada\n• Mantener la confidencialidad de sus credenciales\n• Notificar inmediatamente cualquier acceso no autorizado\n• Ser responsable de todas las actividades realizadas bajo su cuenta\n\nNos reservamos el derecho de suspender cuentas que violen estos términos.',
  },
  {
    title: '3. Roles y Permisos',
    body: 'El sistema de roles funciona así:\n\n• Administrador: acceso total, puede eliminar el proyecto\n• Project Manager: gestiona tareas y equipo\n• Supervisor: supervisa y edita tareas\n• Trabajador: ve y completa sus tareas\n• Inspector: revisa y agrega observaciones\n• Observador: solo lectura\n\nSolo el creador de un proyecto puede eliminarlo.',
  },
  {
    title: '4. Contenido del Usuario',
    body: 'Usted es responsable de todo el contenido que suba a Projex Plan. Queda prohibido subir contenido:\n\n• Ilegal, difamatorio u obsceno\n• Que vulnere derechos de terceros\n• Que contenga malware o código malicioso\n\nAl subir contenido, otorga a Jacaranda Lab una licencia limitada para almacenarlo y mostrarlo como parte del servicio.',
  },
  {
    title: '5. Invitaciones',
    body: 'Las invitaciones a proyectos son válidas por 7 días. Al aceptar una invitación, el usuario queda registrado como miembro con el rol asignado. Cualquier miembro puede abandonar un proyecto en cualquier momento, perdiendo el acceso hasta una nueva invitación.',
  },
  {
    title: '6. Propiedad Intelectual',
    body: 'Projex Plan, su diseño, logotipos y código fuente son propiedad de Jacaranda Lab. Queda prohibida la reproducción, distribución o ingeniería inversa sin autorización expresa por escrito.',
  },
  {
    title: '7. Disponibilidad',
    body: 'Realizamos nuestros mejores esfuerzos para mantener el servicio disponible. La app incluye modo sin conexión que permite consultar datos y marcar tareas como completadas sin internet, sincronizando al reconectar.\n\nNo garantizamos disponibilidad ininterrumpida debido a mantenimientos, fallas de proveedores o causas de fuerza mayor.',
  },
  {
    title: '8. Limitación de Responsabilidad',
    body: 'Jacaranda Lab no será responsable por:\n\n• Pérdida de datos por fallas técnicas o uso incorrecto\n• Daños derivados del uso o imposibilidad de uso del servicio\n• Decisiones técnicas o profesionales de construcción tomadas con base en la app\n• Acciones de otros usuarios de la plataforma\n\nProjex Plan es una herramienta de gestión. La responsabilidad profesional de los proyectos recae en los profesionales a cargo.',
  },
  {
    title: '9. Modificaciones',
    body: 'Podemos modificar el servicio y estos términos en cualquier momento. Los cambios serán notificados en la app. El uso continuado después de la notificación constituye aceptación de los nuevos términos.',
  },
  {
    title: '10. Ley Aplicable',
    body: 'Estos términos se rigen por las leyes de México. Para cualquier controversia, las partes se someten a los tribunales de Guadalajara, Jalisco, renunciando a cualquier otro fuero.',
  },
];

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { colors, typography } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [expanded, setExpanded] = useState<number | null>(0);

  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Aviso de Privacidad' : 'Términos y Condiciones';
  const sections = isPrivacy ? PRIVACY_CONTENT : TERMS_CONTENT;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={isOnline ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 0.5, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h4, { flex: 1 }]}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60, gap: Spacing.sm }}>
        {/* Banner */}
        <View style={{
          backgroundColor: '#0A0A0A', borderRadius: Radius.lg,
          padding: Spacing.lg, alignItems: 'center', gap: 6,
          marginBottom: Spacing.sm,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFD700' }}>PROJEX PLAN</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Gestión de Proyectos de Construcción</Text>
          <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
            Última actualización: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Secciones acordeón */}
        {sections.map((section, idx) => (
          <View key={idx} style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: Radius.lg,
            borderWidth: 0.5,
            borderColor: expanded === idx ? colors.primary : colors.border,
            overflow: 'hidden',
          }}>
            <TouchableOpacity
              onPress={() => setExpanded(expanded === idx ? null : idx)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                padding: Spacing.md, gap: Spacing.sm,
              }}
            >
              <Text style={[typography.bodySmall, { fontWeight: '700', flex: 1, color: expanded === idx ? colors.primary : colors.textPrimary }]}>
                {section.title}
              </Text>
              <Ionicons
                name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={expanded === idx ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            {expanded === idx && (
              <View style={{
                paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
                borderTopWidth: 0.5, borderTopColor: colors.border,
                paddingTop: Spacing.md,
              }}>
                <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 22 }]}>
                  {section.body}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingTop: Spacing.lg, gap: 4 }}>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            © 2026 Jacaranda Lab · Todos los derechos reservados
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            noreply@jacaranda-lab.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
