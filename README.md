# TRAZA 360

**Protección y trazabilidad de personas en riesgo**  
*Última señal. Respuesta real.*

---

## Arquitectura

```
traza360/
├── apps/
│   ├── web/          ← Frontend React + Vite + Tailwind (deploy en Vercel)
│   └── api/          ← Backend Node.js + Express + Prisma (deploy en Render/Railway)
├── packages/
│   └── shared/       ← Tipos y constantes compartidas
├── prisma/           ← Schema y migraciones de base de datos
└── .github/          ← CI/CD workflows
```

## Requisitos

- Node.js 18+
- PostgreSQL 15+
- npm o pnpm

## Setup rápido

### 1. Clonar e instalar

```bash
git clone <repo>
cd traza360
npm install
```

### 2. Configurar variables de entorno

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Editar con tus datos de PostgreSQL, JWT secret, etc.

# Frontend
cp apps/web/.env.example apps/web/.env
# Editar con la URL de tu API
```

### 3. Base de datos

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Levantar en desarrollo

```bash
# Terminal 1 - Backend
cd apps/api
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

## Deploy

### Frontend → Vercel
1. Conectar repo en Vercel
2. Root directory: `apps/web`
3. Build command: `npm run build`
4. Output: `dist`
5. Variables de entorno: `VITE_API_URL`

### Backend → Render / Railway
1. Conectar repo
2. Root directory: `apps/api`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Variables de entorno: ver `.env.example`

### Base de datos → Neon / Supabase / Railway PostgreSQL
1. Crear instancia PostgreSQL
2. Copiar connection string al backend `.env`
3. Ejecutar `npx prisma migrate deploy`

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Violencia de Género | Alerta silenciosa, grabación, evidencia, diario, camuflaje |
| Adulto Mayor | Medicamentos, check-in, caída, llegar a casa |
| Niño Seguro | Estoy perdido, llegar a casa, tareas |
| Hogar Seguro | Intrusión, monitoreo, temporizador |
| Trabajo Seguro | Trayecto protegido, zona de riesgo, última señal |

## Planes

| Feature | Gratis | Premium | Familiar |
|---------|--------|---------|----------|
| Botón de ayuda | ✓ | ✓ | ✓ |
| Alerta silenciosa | ✓ | ✓ | ✓ |
| 911 | ✓ | ✓ | ✓ |
| Contactos | 2 | Ilimitados | Ilimitados |
| Evidencia en nube | — | ✓ | ✓ |
| Historial completo | — | ✓ | ✓ |
| Tracking extendido | — | ✓ | ✓ |
| Panel familiar | — | — | ✓ |
| Cuidadores múltiples | — | — | ✓ |

## Licencia

Propietario — Traza 360 © 2026
