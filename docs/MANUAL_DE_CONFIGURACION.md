# 📘 Manual de Configuración — ExamTaker Platform

Este manual proporciona una guía exhaustiva paso a paso para configurar, personalizar y desplegar la plataforma **ExamTaker**, tanto en entornos de desarrollo local como en producción con **Firebase** y **GitHub Pages**.

---

## 📑 Tabla de Contenidos

1. [Requisitos Previos](#1-requisitos-previos)
2. [Configuración de Firebase en la Nube](#2-configuración-de-firebase-en-la-nube)
   - [2.1 Creación del Proyecto](#21-creación-del-proyecto)
   - [2.2 Configuración de Firebase Authentication](#22-configuración-de-firebase-authentication)
   - [2.3 Configuración de Realtime Database](#23-configuración-de-realtime-database)
   - [2.4 Despliegue de Reglas de Seguridad Zero-Leak](#24-despliegue-de-reglas-de-seguridad-zero-leak)
   - [2.5 Obtención de Credenciales Web](#25-obtención-de-credenciales-web)
3. [Configuración del Entorno Local (.env)](#3-configuración-del-entorno-local-env)
   - [3.1 Variables de Entorno](#31-variables-de-entorno)
   - [3.2 Modo Mock Fallback (Sin Firebase / Offline)](#32-modo-mock-fallback-sin-firebase--offline)
4. [Configuración de CI/CD en GitHub y Solución de Errores](#4-configuración-de-cicd-en-github-y-solución-de-errores)
   - [4.1 Solución al Error 404 de GitHub Pages (actions/configure-pages)](#41-solución-al-error-404-de-github-pages-actionsconfigure-pages)
   - [4.2 Solución a la Deprecación de Node en GitHub Actions](#42-solución-a-la-deprecación-de-node-en-github-actions)
   - [4.3 Carga de Secretos en el Repositorio (GitHub Secrets)](#43-carga-de-secretos-en-el-repositorio-github-secrets)
5. [Personalización del Motor Anti-Cheat](#5-personalización-del-motor-anti-cheat)
6. [Comandos de Verificación y Compilación](#6-comandos-de-verificación-y-compilación)

---

## 1. Requisitos Previos

Antes de comenzar, asegúrate de contar con las siguientes herramientas instaladas en tu equipo:

- **Node.js**: Versión `20.x` o `22.x` (LTS recomendada). Puedes verificarlo con:
  ```bash
  node -v
  ```
- **npm**: Versión `10.x` o superior (`npm -v`).
- **Git**: Instalado y configurado en tu terminal.
- **Firebase CLI** (opcional, para desplegar reglas desde consola):
  ```bash
  npm install -g firebase-tools
  ```

---

## 2. Configuración de Firebase en la Nube

ExamTaker utiliza los servicios serverless de **Google Firebase**. Sigue estos pasos para aprovisionar tu backend gratuito:

### 2.1 Creación del Proyecto
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Haz clic en **"Agregar proyecto"** (o "Add project").
3. Asigna un nombre a tu proyecto (por ejemplo: `examtaker-prod`).
4. (Opcional) Puedes deshabilitar Google Analytics si no lo requieres para simplificar el setup.
5. Haz clic en **"Crear proyecto"**.

---

### 2.2 Configuración de Firebase Authentication
ExamTaker utiliza un esquema híbrido de autenticación:
- **Docentes**: Acceden mediante correo electrónico y contraseña.
- **Estudiantes**: Acceden mediante inicio de sesión anónimo transparente (sin registro forzado, ingresando únicamente su nombre, matrícula y PIN del examen).

Para habilitar ambos métodos:
1. En el menú lateral izquierdo de la consola de Firebase, ve a **Build > Authentication**.
2. Haz clic en **"Comenzar"** (Get Started).
3. En la pestaña **Sign-in method** (Método de inicio de sesión):
   - **Correo electrónico/Contraseña (Email/Password)**:
     - Haz clic en el proveedor.
     - Activa la primera casilla (**Habilitar**). Deja desactivado "Vínculo del correo electrónico".
     - Guarda los cambios.
   - **Anónimo (Anonymous)**:
     - En la lista de proveedores, selecciona **Anónimo**.
     - Activa el interruptor (**Habilitar**) y haz clic en **Guardar**.

---

### 2.3 Configuración de Cloud Firestore
1. En el menú lateral izquierdo de la consola de Firebase, ve a **Build > Firestore Database**.
2. Haz clic en **"Crear base de datos"** (Create database).
3. Selecciona el modo de inicio de reglas: selecciona **"Comenzar en modo de prueba"** o **"Comenzar en modo bloqueado"** (desplegaremos nuestras reglas personalizadas en el siguiente paso).
4. Elige la ubicación geográfica más cercana (por ejemplo: `us-central1` o `southamerica-east1`).
5. Haz clic en **Habilitar**.

---

### 2.4 Despliegue de Reglas de Seguridad Zero-Leak
ExamTaker cuenta con un archivo [`firestore.rules`](../firestore.rules) preconfigurado que garantiza:
- Aislamiento absoluto de las claves secretas de respuestas (`/exam_keys/{examId}`), las cuales jamás se exponen a los estudiantes.
- Acceso granular por documento y subcolección a los exámenes (`/exams/{examId}`), envíos (`/exams/{examId}/submissions/{studentUid}`) y logs de auditoría.
- Inmutabilidad de los envíos de exámenes una vez finalizados.

**Opción A — Desde la Consola Web de Firebase**:
1. Dentro de **Firestore Database**, abre la pestaña **Reglas** (Rules).
2. Borra el contenido existente y copia todo el contenido del archivo [`firestore.rules`](../firestore.rules) de este repositorio.
3. Haz clic en **"Publicar"** (Publish).

**Opción B — Mediante Firebase CLI**:
```bash
firebase login
firebase use --add  # Selecciona el ID de tu proyecto creado
firebase deploy --only firestore:rules
```

---

### 2.5 Obtención de Credenciales Web
1. En la consola de Firebase, haz clic en el ícono de engrane ⚙️ junto a *Descripción general del proyecto* y selecciona **Configuración del proyecto** (Project settings).
2. En la pestaña **General**, desplázate hacia abajo hasta la sección **Tus apps** y haz clic en el ícono Web `</>`.
3. Registra un apodo (ej. `ExamTaker Web`) y haz clic en **Registrar app**.
4. Firebase te mostrará un objeto JavaScript `firebaseConfig` con las siguientes claves:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

Conserva estos valores para el siguiente paso.

---

## 3. Configuración del Entorno Local (.env)

### 3.1 Variables de Entorno
En la raíz del proyecto, crea un archivo llamado `.env` copiando la plantilla existente:

```bash
cp .env.example .env
```

Abre `.env` y sustituye los valores con las credenciales obtenidas en el paso 2.5:

```env
VITE_FIREBASE_API_KEY=AIzaSyTuClaveRealDeFirebase123456
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

### 3.2 Modo Mock Fallback (Sin Firebase / Offline)

ExamTaker cuenta con un sistema inteligente de **reserva local (Mock Storage)**:

- Si no configuras el archivo `.env` o las claves de Firebase no son válidas, la aplicación **no fallará**.
- El sistema conmutará automáticamente al modo de simulación mediante `localStorage`.
- Podrás crear exámenes como docente, iniciar sesión, generar PINs, rendir evaluaciones como alumno y probar todo el flujo anti-trampas de manera offline y autónoma.

> [!TIP]
> Puedes forzar o comprobar el estado de conexión abriendo la consola del navegador (`F12`), donde se imprimirá un mensaje confirmando si se inicializó Firebase en la nube o el almacenamiento Mock local.

---

## 4. Configuración de CI/CD en GitHub y Solución de Errores

Al desplegar el proyecto mediante el flujo automatizado de GitHub Actions hacia **GitHub Pages**, pueden presentarse dos errores comunes que ya han sido contemplados:

---

### 4.1 Solución al Error 404 / 403 de GitHub Pages (`actions/configure-pages`)

#### Síntoma del Error:
```text
Run actions/configure-pages@v5
Warning: Get Pages site failed. Error: Not Found - https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site
Error: Create Pages site failed. Error: Resource not accessible by integration - https://docs.github.com/rest/pages/pages#create-a-apiname-pages-site
Error: HttpError: Resource not accessible by integration
```

#### Causa Raíz:
1. **GitHub Pages no está activado**: En repositorios nuevos de GitHub, Pages viene desactivado por defecto (o en *"Deploy from a branch"*).
2. **Limitación de seguridad de GitHub (`GITHUB_TOKEN`)**: La API de GitHub no permite que un runner de Actions cree o active un sitio de Pages por primera vez (`Resource not accessible by integration`) porque requiere privilegios de administrador que el token del workflow no posee por seguridad.

#### Solución Definitiva (1 Solo Paso en la Web de GitHub):
Debes activar GitHub Pages una única vez desde la interfaz de GitHub:

1. Abre tu repositorio en GitHub (`https://github.com/Jlebot7/ExamTaker`).
2. Haz clic en la pestaña **Settings** (Configuración, arriba a la derecha).
3. En la barra lateral izquierda, desplázate hasta la sección **Code and automation** y haz clic en **Pages**.
4. En el apartado **Build and deployment**:
   - En el menú desplegable **Source** (Origen), selecciona **GitHub Actions**.
5. ¡Listo! Al seleccionar **GitHub Actions**, GitHub habilita el sitio internamente.
6. Ahora ve a la pestaña **Actions**, entra al workflow fallido y haz clic en **"Re-run all jobs"** (o haz un nuevo `git push`). El paso `actions/configure-pages@v5` detectará el sitio activo y el despliegue se completará exitosamente.

---

### 4.2 Solución a la Deprecación de Node en GitHub Actions

#### Síntoma del Error:
```text
Node 20 is being deprecated. This workflow is running with Node 24 by default.
If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable.
```

#### Causa y Solución:
GitHub actualizó el entorno de ejecución predeterminado de los ejecutores de GitHub Actions hacia Node 24.
En el archivo [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml), el paso de Node está fijado en la versión **Active LTS 22**:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'npm'
```
Node 22 es totalmente compatible con React 19, TypeScript 6, Vite 8 y los runners actualizados de GitHub Actions.

---

### 4.3 Carga de Secretos en el Repositorio (GitHub Secrets)

Para que el build de producción en GitHub Pages se conecte a tu Firebase real, debes cargar las variables de entorno en los secretos del repositorio:

1. En tu repositorio de GitHub, ve a **Settings > Secrets and variables > Actions**.
2. Haz clic en el botón verde **"New repository secret"**.
3. Agrega cada una de las siguientes variables con sus respectivos valores:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Guarda cada secreto. En el siguiente push a la rama `main` o `master`, el workflow compilará la aplicación inyectando tus credenciales seguras.

---

## 5. Personalización del Motor Anti-Cheat

El motor de telemetría e integridad se encuentra en [`src/hooks/useAntiCheat.ts`](../src/hooks/useAntiCheat.ts). Permite ajustar los siguientes parámetros según las políticas de tu institución:

| Parámetro | Ubicación | Descripción | Valor por Defecto |
|---|---|---|---|
| `maxViolations` | Creador de Examen (`ExamEditor.tsx`) | Número máximo de infracciones antes de descalificar al alumno | `3` (Configurable por examen de 1 a 20) |
| `cooldown` | `useAntiCheat.ts` (línea 45) | Tiempo de espera en milisegundos para evitar eventos dobles simultáneos (ej. blur + visibilitychange) | `1500 ms` |
| Monitoreo de Foco | `useAntiCheat.ts` | Dispara infracción al cambiar de pestaña o minimizar ventana | Activo (`visibilitychange`) |
| Menú Contextual | `useAntiCheat.ts` | Previene clic derecho para inspeccionar o buscar respuestas | Bloqueado (`contextmenu`) |
| Atajos de DevTools | `useAntiCheat.ts` | Intercepta `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+U` | Bloqueado |
| Restricción de Portapapeles | `useAntiCheat.ts` | Intercepta comandos de copiar (`Ctrl+C`) y pegar (`Ctrl+V`) | Bloqueado |

---

## 6. Comandos de Verificación y Compilación

Ejecuta estos comandos en tu terminal local para comprobar la salud del proyecto:

```bash
# 1. Instalar dependencias limpias
npm ci

# 2. Análisis estático y linter ultra-rápido (Oxlint)
npm run lint

# 3. Comprobación de tipos de TypeScript y compilación de producción
npm run build

# 4. Previsualización local del artefacto compilado (/dist)
npm run preview
```

Con estos pasos completados, tu plataforma **ExamTaker** estará completamente operativa, segura y lista para gestionar evaluaciones con máxima integridad académica.
