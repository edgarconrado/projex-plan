# Projex Plan

Gestión de proyectos de construcción — React Native + Expo + Supabase

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React Native + Expo SDK 53 |
| Navegación | Expo Router (file-based) |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |
| Estado | Zustand |
| Notificaciones | Expo Notifications |
| Planos | react-native-pdf + react-native-svg |
| Lenguaje | TypeScript estricto |

## Setup inicial

### 1. Instalar dependencias

```bash
npm install
# o si usas yarn:
yarn install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Encuéntralas en: Supabase Dashboard → Settings → API

### 3. Configurar Supabase

Ejecuta el schema SQL en Supabase Dashboard → SQL Editor.

Activa **Realtime** en las tablas: `messages`, `notifications`, `tasks`.

Crea los **buckets de Storage**:
- `plans` (público)
- `photos` (público)
- `documents` (privado)
- `avatars` (público)

### 4. Iniciar la app

```bash
npx expo start
```

## Estructura de carpetas

```
projex-plan/
├── app/
│   ├── _layout.tsx          # Root layout + AuthProvider
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── index.tsx        # Dashboard
│   │   ├── projects.tsx     # Lista de proyectos
│   │   ├── tasks.tsx        # Mis tareas
│   │   ├── chat.tsx         # Mensajes
│   │   └── profile.tsx      # Perfil
│   └── project/
│       └── [id]/            # Stack interno de proyecto
│           ├── _layout.tsx
│           ├── index.tsx    # Detalle proyecto
│           ├── tasks.tsx    # Tareas del proyecto
│           ├── plans.tsx    # Planos
│           └── team.tsx     # Equipo
├── src/
│   ├── lib/
│   │   ├── supabase.ts      # Cliente + helpers de storage
│   │   ├── AuthContext.tsx  # Sesión global
│   │   ├── theme.ts         # Colores, tipografía, espaciado
│   │   └── notifications.ts # Push notifications
│   ├── hooks/               # Hooks de datos (paso 3+)
│   ├── components/
│   │   ├── ui/              # Button, Input, Card, Badge...
│   │   ├── tasks/
│   │   ├── plans/
│   │   └── chat/
│   ├── stores/              # Zustand stores
│   └── types/               # Tipos TypeScript del schema
└── assets/
```

## Progreso de módulos

- [x] Setup base, tipos, tema, componentes UI
- [x] Autenticación (login / registro)
- [ ] Dashboard + Proyectos (paso 3)
- [ ] Tareas (paso 4)
- [ ] Planos + Anotaciones (paso 5)
- [ ] Chat Realtime (paso 6)
