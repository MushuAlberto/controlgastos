# MonAi Pro 💰

> Tu mentor financiero inteligente con IA. Gestión de gastos, metas de ahorro, entrada por voz y escaneo de recibos.

## ✨ Funcionalidades

- 📊 Dashboard de gastos con gráficos
- 🎤 Registro de gastos por voz
- 📸 Escaneo de recibos con IA (Gemini)
- 🎯 Metas de ahorro
- 🔐 Autenticación con Google (Firebase)
- ☁️ Sincronización en la nube (Firestore)

## 🚀 Despliegue

### Requisitos previos

- Node.js 18+
- Cuenta en [Firebase](https://console.firebase.google.com/)
- API Key de [Google AI Studio (Gemini)](https://aistudio.google.com/app/apikey)
- Cuenta en [Vercel](https://vercel.com/)

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/monai-pro.git
cd monai-pro
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y rellena con tus valores:

```bash
cp .env.example .env
```

Las variables necesarias son:

| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | Tu API Key de Google AI Studio |
| `VITE_FIREBASE_API_KEY` | API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain de Firebase |
| `VITE_FIREBASE_PROJECT_ID` | Project ID de Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket de Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID de Firebase |
| `VITE_FIREBASE_APP_ID` | App ID de Firebase |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID (opcional) |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | ID de tu base de datos Firestore |

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`.

---

### 4. Desplegar en Vercel

1. Sube el proyecto a GitHub.
2. Ve a [vercel.com](https://vercel.com/) e importa el repositorio.
3. En la sección **Environment Variables** de Vercel, agrega todas las variables del archivo `.env.example`.
4. Haz clic en **Deploy**.

Vercel detectará automáticamente que es un proyecto Vite y usará `npm run build` como comando de build.

> ⚠️ **Importante**: Nunca subas el archivo `.env` a GitHub. Está incluido en `.gitignore` para proteger tus claves.

---

## 🛠️ Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Verifica errores de TypeScript |

## 🔒 Reglas de Firestore

Las reglas de seguridad de Firestore están en `firestore.rules`. Despliégalas con Firebase CLI:

```bash
firebase deploy --only firestore:rules
```
