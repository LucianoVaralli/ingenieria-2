# Sportify

Plataforma web de gestión integral para gimnasios que digitaliza y centraliza todos los procesos administrativos: reservas de clases, gestión de membresías, control de pagos, registro de asistencia mediante código QR y panel de administración con estadísticas.

---

## Badges

![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-green?logo=fastapi)
![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-8.0-646cff?logo=vite)
![SQLite](https://img.shields.io/badge/SQLite-3-lightgrey?logo=sqlite)
![MercadoPago](https://img.shields.io/badge/MercadoPago-Integrated-009ee3?logo=mercadopago)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Tabla de Contenidos

- [Descripción](#descripción)
- [Características Principales](#características-principales)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Scripts Disponibles](#scripts-disponibles)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Contribución](#contribución)
- [Licencia](#licencia)
- [Autores](#autores)

---

## Descripción

**Sportify** es una aplicación web completa para la gestión de un gimnasio familiar ubicado en La Plata, Buenos Aires. El sistema reemplaza el manejo manual con planillas y efectivo por una plataforma digital que permite:

- **Socios**: Reservar clases, gestionar membresías, ver historial de pagos, escanear QR para ingreso
- **Profesores**: Escanear códigos QR para control de asistencia
- **Administradores**: Gestión completa de clases, profesores, capacidad, estadísticas, preguntas frecuentes y pagos

El gimnasio ofrece clases de **Funcional, Pilates y Yoga** con un sistema de membresías que prioriza la fidelización.

---

## Características Principales

### 🔐 Autenticación y Usuarios
- Registro e inicio de sesión con JWT (access + refresh tokens)
- Recuperación de contraseña por email
- Cambio de contraseña obligatorio en primer acceso
- Roles: Socio, Profesor, Administrador

### 📅 Gestión de Clases y Reservas
- Creación, edición y eliminación de clases (admin)
- Reservas individuales (por clase suelta)
- Reservas por membresía (cupos mensuales)
- Lista de espera automática con notificaciones
- Cancelación con políticas de tiempo configurable

### 💳 Pagos y Membresías
- Integración con **MercadoPago** (checkout Pro + webhooks)
- Tarjetas simuladas para testing (Visa, Mastercard, Amex)
- Historial completo de pagos con estados
- Membresías con renovación automática y cupos mensuales

### 📱 Asistencia con QR
- Generación de QR único por reserva
- Escaneo por profesores (cámara o archivo)
- Validación de vigencia y estado de reserva
- Registro de asistencia automático

### 🔔 Notificaciones
- Sistema de notificaciones en tiempo real
- Alertas de lista de espera, pagos, cambios de clase
- Centro de notificaciones por usuario

### 📊 Panel de Administración
- Dashboard con métricas clave
- Gestión de profesores (CRUD + horarios)
- Configuración de capacidad del gimnasio
- Estadísticas de ocupación, ingresos, retención
- Gestión de preguntas frecuentes

---

## Tecnologías

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.12+ | Lenguaje principal |
| FastAPI | 0.136.1 | Framework web API |
| SQLAlchemy | 2.0.49 | ORM |
| SQLite | 3 | Base de datos |
| Uvicorn | 0.46.0 | Servidor ASGI |
| python-jose | 3.5.0 | JWT tokens |
| argon2-cffi / bcrypt | 25.1.0 / 5.0.0 | Hash de contraseñas |
| APScheduler | 3.11.2 | Tareas programadas |
| python-multipart | 0.0.28 | Form data / file upload |
| MercadoPago SDK | - | Pagos online |

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19.2.6 | UI Library |
| Vite | 8.0.12 | Build tool / Dev server |
| React Router DOM | 7.15.1 | Routing SPA |
| Axios | 1.16.1 | HTTP Client |
| jsqr | 1.4.0 | Escaneo QR (cámara) |
| qrcode | 1.5.4 | Generación QR |
| recharts | 3.9.1 | Gráficos/Estadísticas |
| lucide-react / react-icons | 1.16.0 / 5.6.0 | Iconografía |
| react-hot-toast | 2.6.0 | Notificaciones toast |
| ESLint | 10.3.0 | Linting |

---

## Requisitos Previos

- **Python** 3.12 o superior
- **Node.js** 18+ y **npm** 9+
- **Git** para clonar el repositorio

> ⚠️ El backend usa `sqlite3` (incluido en Python stdlib), no requiere servidor de BD separado.

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://gitlab.com/luchito233/ingenieria-2.git
cd ingenieria-2
```

### 2. Backend - Entorno virtual y dependencias

```bash
cd backend

# Crear entorno virtual (recomendado Python 3.12)
python -m venv venv
# O específicamente:
py -3.12 -m venv venv

# Activar
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Frontend - Dependencias

```bash
cd ../frontend
npm install
```

---

## Configuración

### Variables de Entorno (Backend)

Crear archivo `backend/.env` basado en el ejemplo (el archivo existe pero no se versiona):

```env
# Database
DATABASE_URL=sqlite:///./sportify.db

# JWT
SECRET_KEY=tu_clave_secreta_muy_larga_y_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (para recuperación de contraseña y notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
EMAIL_FROM=noreply@sportify.com

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

> 📝 **Nota**: El `.env` actual contiene credenciales de prueba. Para producción, **genera nuevas claves seguras** y usa credenciales de producción de MercadoPago.

### Variables de Entorno (Frontend)

Crear `frontend/.env` (opcional):

```env
VITE_API_URL=http://localhost:8000
```

---

## Uso

### Desarrollo - Levantar ambos servidores

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
uvicorn main:app --reload
```
- API: http://localhost:8000
- Docs Swagger: http://localhost:8000/docs
- Docs ReDoc: http://localhost:8000/redoc

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
- App: http://localhost:5173

> ⚠️ **Ambos servidores deben estar corriendo** para que login, registro y pagos funcionen correctamente.

### Producción - Build Frontend

```bash
cd frontend
npm run build
# Los archivos optimizados están en frontend/dist/
# Servir con nginx, Apache o cualquier servidor estático
```

### Backend en Producción

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# Usar gunicorn + uvicorn workers para producción real
```

---

## Estructura del Proyecto

```
ingenieria-2/
├── backend/                    # API FastAPI
│   ├── models/                 # Modelos SQLAlchemy
│   │   ├── socio.py            # Usuario/Socio
│   │   ├── clase.py            # Clases de gimnasio
│   │   ├── reserva_MIO.py      # Reservas
│   │   ├── membresia.py        # Membresías y planes
│   │   ├── lista_espera.py     # Lista de espera
│   │   ├── notificacion.py     # Notificaciones
│   │   ├── pago / mercadopago  # Pagos (modelos en routes)
│   │   ├── tarjeta_simulada.py # Tarjetas test MP
│   │   ├── password_recovery.py# Recuperación contraseña
│   │   ├── pregunta_frecuente.py# FAQ
│   │   ├── gimnasio.py         # Config capacidad
│   │   ├── enums.py            # Enumeraciones compartidas
│   │   └── __init__.py
│   ├── routes/                 # Endpoints API (Routers)
│   │   ├── auth.py             # Login, register, tokens
│   │   ├── socios.py           # CRUD socios, perfil
│   │   ├── clase.py            # Gestión clases (admin/profe)
│   │   ├── reserva.py          # Reservas, lista espera, QR
│   │   ├── membresia.py        # Planes, suscripciones, cupos
│   │   ├── mercadopago.py      # Checkout, webhooks, tarjetas test
│   │   ├── notificacion.py     # Centro notificaciones
│   │   ├── pregunta_frecuente.py# FAQ CRUD
│   │   ├── gimnasio.py         # Capacidad, estado
│   │   ├── estadisticas.py     # Métricas dashboard admin
│   │   └── __init__.py
│   ├── services/               # Lógica de negocio
│   │   ├── auth.py             # Hash, tokens, validaciones
│   │   ├── mercadopago_service.py# Integración MP
│   │   ├── mail_service.py     # Envío emails
│   │   ├── scheduler.py        # Tareas automáticas (limpieza, recordatorios)
│   │   ├── password_recovery_service.py
│   │   ├── notificaciones.py   # Crear notificaciones
│   │   ├── tarjetas_seed.py    # Seed tarjetas simuladas
│   │   └── cuentas_seed.py     # Seed cuentas test
│   ├── uploads/                # Archivos subidos (QR, imágenes)
│   ├── database.py             # Config SQLAlchemy + engine
│   ├── main.py                 # App FastAPI + lifespan + routers
│   ├── requirements.txt        # Dependencias Python
│   ├── package.json            # Solo jwt-decode (compat)
│   └── sportify.db             # SQLite DB (generada auto)
│
├── frontend/                   # SPA React + Vite
│   ├── public/                 # Assets estáticos
│   ├── src/
│   │   ├── api/                # Cliente Axios + interceptores
│   │   │   └── api.js
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── Navbar.jsx
│   │   │   ├── AdminNavbar.jsx
│   │   │   ├── ModalConfirmacion.jsx
│   │   │   ├── ModalResultado.jsx
│   │   │   └── PagarConMP.jsx
│   │   ├── layouts/            # Layouts por rol
│   │   ├── pages/              # Páginas (vistas principales)
│   │   │   ├── admin/          # Vistas solo admin
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── ListaClasesAdmin.jsx
│   │   │   │   ├── CrearClase.jsx
│   │   │   │   ├── EditarCapacidad.jsx
│   │   │   │   ├── Estadisticas.jsx
│   │   │   │   ├── GestionProfesores.jsx
│   │   │   │   └── GestionPreguntasFrecuentes.jsx
│   │   │   ├── profesor/       # Vistas solo profesor
│   │   │   │   └── QRProfesor.jsx
│   │   │   ├── Home.jsx        # Dashboard socio
│   │   │   ├── Clases.jsx      # Listado + filtros
│   │   │   ├── ReservaIndividual.jsx
│   │   │   ├── ReservaMembresia.jsx
│   │   │   ├── Perfil.jsx      # Perfil, membresía, QR, pagos
│   │   │   ├── HistorialPagos.jsx
│   │   │   ├── Notificaciones.jsx
│   │   │   ├── login.jsx / Registro.jsx
│   │   │   ├── ForgotPassword.jsx / ResetPassword.jsx
│   │   │   ├── CambiarPassword.jsx / CambiarPasswordInicial.jsx
│   │   │   ├── pago.jsx / PagoResultado.jsx
│   │   │   └── EscanearQR.jsx
│   │   ├── routes/             # Configuración de rutas + guards
│   │   ├── App.jsx             # Root component + providers
│   │   ├── main.jsx            # Entry point
│   │   ├── App.css / index.css # Estilos globales
│   │   └── assets/             # Imágenes, fuentes
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── README.md
│
├── docs/                       # Documentación (vacía actualmente)
│   └── .gitkeep
│
├── .gitignore
└── README.md                   # Este archivo
```

---

## Scripts Disponibles

### Backend (desde `backend/`)

| Comando | Descripción |
|---------|-------------|
| `uvicorn main:app --reload` | Dev server con hot-reload (puerto 8000) |
| `uvicorn main:app --host 0.0.0.0 --port 8000` | Producción simple |
| `python -m pytest` | Tests (si existen, ver sección Testing) |

### Frontend (desde `frontend/`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server Vite (puerto 5173) |
| `npm run build` | Build producción en `dist/` |
| `npm run preview` | Preview del build local |
| `npm run lint` | ESLint sobre todo el proyecto |

---

## API Endpoints Principales

> Documentación interactiva completa en: **http://localhost:8000/docs** (Swagger UI)

### Autenticación (`/auth`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Login (devuelve access + refresh token) |
| POST | `/auth/register` | Registro de socio |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/forgot-password` | Solicitar reset por email |
| POST | `/auth/reset-password` | Confirmar reset con token |
| POST | `/auth/change-password` | Cambio obligatorio primer login |

### Socios (`/socios`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/socios/me` | Perfil del usuario autenticado |
| PUT | `/socios/me` | Actualizar perfil |
| GET | `/socios/me/membresia` | Membresía activa del socio |
| GET | `/socios/me/reservas` | Historial de reservas |
| GET | `/socios/me/pagos` | Historial de pagos |

### Clases (`/clases`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/clases` | Listado con filtros (tipo, fecha, profe) |
| GET | `/clases/{id}` | Detalle de clase |
| POST | `/clases` | Crear clase (admin) |
| PUT | `/clases/{id}` | Editar clase (admin) |
| DELETE | `/clases/{id}` | Eliminar clase (admin) |

### Reservas (`/reservas`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/reservas/individual` | Reservar clase suelta |
| POST | `/reservas/membresia` | Reservar con cupo membresía |
| GET | `/reservas/mis-reservas` | Reservas del usuario |
| DELETE | `/reservas/{id}` | Cancelar reserva |
| POST | `/reservas/{id}/qr` | Generar/obtener QR de asistencia |
| POST | `/reservas/escanear-qr` | Escanear QR (profesor) |

### Membresías (`/membresias`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/membresias/planes` | Planes disponibles |
| POST | `/membresias/suscribir` | Contratar/renovar plan |
| GET | `/membresias/mi-membresia` | Detalle membresía actual |
| PUT | `/membresias/cancelar` | Cancelar renovación |

### Pagos - MercadoPago (`/mercadopago`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/mercadopago/crear-preferencia` | Crear checkout MP |
| GET | `/mercadopago/webhook` | Recibir notificaciones MP |
| GET | `/mercadopago/tarjetas-test` | Tarjetas simuladas para testing |
| GET | `/mercadopago/estado/{payment_id}` | Consultar estado pago |

### Administración (`/admin` - requiere rol admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Métricas generales |
| GET | `/admin/estadisticas/ocupacion` | Ocupación por clase/horario |
| GET | `/admin/estadisticas/ingresos` | Ingresos por período |
| GET | `/admin/estadisticas/retencion` | Retención de socios |
| CRUD | `/admin/profesores` | Gestión profesores |
| CRUD | `/admin/preguntas-frecuentes` | Gestión FAQ |
| PUT | `/admin/gimnasio/capacidad` | Cambiar capacidad total |

### Notificaciones (`/notificaciones`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/notificaciones` | Listar notificaciones usuario |
| PUT | `/notificaciones/{id}/leer` | Marcar como leída |
| PUT | `/notificaciones/leer-todas` | Marcar todas como leídas |

---

## Testing

> ⚠️ **El proyecto no incluye tests automatizados configurados** (no hay carpeta `tests/`, ni `pytest.ini`, ni scripts de test en `package.json`).

### Testing Manual Recomendado

**Backend:**
```bash
# Probar endpoints con Swagger UI
open http://localhost:8000/docs

# Tarjetas de prueba MercadoPago (ya seedean al iniciar)
# Ver en: GET /mercadopago/tarjetas-test
```

**Frontend:**
```bash
# Linting
npm run lint

# Build de producción (verifica errores de compilación)
npm run build
```

### Sugerencia para Agregar Tests

```bash
# Backend - pytest
pip install pytest pytest-asyncio httpx
# Crear tests/ con fixtures para DB de test

# Frontend - Vitest + React Testing Library
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## Contribución

1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit con mensajes claros: `git commit -m "feat: agregar filtro por profesor en listado de clases"`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abrir Pull Request

### Estándares de Código
- **Backend**: `black` + `isort` + `flake8` (configurar en `pyproject.toml`)
- **Frontend**: `eslint` + `prettier` (ya configurado en `eslint.config.js`)

---

## Licencia

> ⚠️ **No se encontró archivo `LICENSE` en el repositorio.**

Se recomienda agregar una licencia (ej. MIT, Apache 2.0) antes de publicar. Para proyectos académicos, consultar con la cátedra.

---

## Autores

- **Joaquin Alejo Gimenez Ruiz**
- **Luciano Varalli**
- **Luis Vilte Tisiano**
- **Nicole Antonella Chavez**
- **Erik Nishimura**

---

## Notas Adicionales

### Base de Datos
- SQLite (`sportify.db`) se crea automáticamente al iniciar el backend
- Tablas creadas via `Base.metadata.create_all()` en `main.py:38`
- Seed automático: gimnasio por defecto (capacidad 50) + tarjetas simuladas MP

### Tareas Programadas (APScheduler)
- Limpieza de reservas expiradas
- Recordatorios de clases próximas
- Procesamiento de renovaciones de membresía
- Ver `backend/services/scheduler.py`

### Archivos Subidos
- Carpeta `backend/uploads/` servida estáticamente en `/uploads`
- Usada para imágenes de QR, comprobantes, etc.

### CORS Configurado
- `http://localhost:5173` (Vite dev)
- `http://127.0.0.1:5173`
- `http://localhost:8000` / `http://127.0.0.1:8000`

---

**¿Dudas o problemas?** Revisá la documentación interactiva en `/docs` o abrí un issue en el repositorio.