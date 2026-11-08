# PROTEC

Plataforma web para gestionar la reparación de dispositivos electrónicos (celulares, laptops y computadoras) **de principio a fin**: el cliente reporta el problema y elige entre un diagnóstico guiado con el asistente o enviar el folio directo a un técnico; se asigna un técnico especializado, ambos conversan en tiempo real, se genera un presupuesto, el cliente paga el anticipo del 50 % (con tarjeta mediante Stripe o en sucursal), se coordina la recolección, el técnico documenta la reparación (estados, evidencias y piezas), el cliente paga el saldo, recibe su dispositivo y califica el servicio. Todo queda registrado en MySQL con trazabilidad completa.

> **Publicar en internet:** sigue la guía paso a paso de [DEPLOY.md](DEPLOY.md) (Railway + Vercel/Netlify + Cloudinary + Stripe + Brevo/Resend).

---

## Funciones principales

| Rol | Puede |
| --- | --- |
| **Cliente** | Registrarse, solicitar reparaciones (con asistente o directo a técnico), subir fotografías, chatear con su técnico, aceptar o rechazar presupuestos, pagar con tarjeta (Stripe), programar recolección y entrega, calificar el servicio, cambiar su contraseña y recuperarla por correo. |
| **Técnico** | Ver sus trabajos asignados, registrar diagnóstico y presupuesto, actualizar estados con observaciones, subir evidencias, registrar piezas, avanzar la logística y chatear con el cliente. |
| **Administrador** | Ver indicadores e ingresos, asignar técnicos, crear y eliminar cuentas de técnicos, administradores y clientes, convertir una cuenta en técnico, eliminar folios, registrar pagos recibidos en sucursal y gestionar la disponibilidad de los técnicos. |

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | React 18, Vite 6, JavaScript, Tailwind CSS 4, React Router 6, Lucide React, socket.io-client |
| Backend | Node.js 18+, Express 4, mysql2, JWT, bcrypt, Multer, Cloudinary, Socket.IO 4, Stripe, Nodemailer, Helmet, CORS, express-rate-limit |
| Base de datos | MySQL 5.7+ / MariaDB 10.4+ |

## Requisitos

- Node.js **18.18 o superior** y npm.
- MySQL o MariaDB (por ejemplo, XAMPP en desarrollo).
- Para producción: cuentas de Cloudinary, Stripe y un proveedor SMTP (Brevo o Resend).

## Instalación (desarrollo)

```bash
# Backend
cd backend
npm install
cp .env.example .env        # completa JWT_SECRET y los datos de MySQL
npm run db:init             # crea las tablas
npm run db:seed             # opcional: datos de ejemplo SOLO para desarrollo

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

> En Windows PowerShell con la ejecución de scripts bloqueada, usa `npm.cmd` en lugar de `npm`.

## Ejecutar

```bash
cd backend && npm run dev      # API + Socket.IO en http://localhost:4000
cd frontend && npm run dev     # sitio en http://localhost:5173
```

## Variables de entorno

Consulta `backend/.env.example` y `frontend/.env.example` (cada variable está documentada).

| Grupo | Variables (backend) |
| --- | --- |
| Servidor | `PORT`, `NODE_ENV`, `PUBLIC_URL`, `FRONTEND_URL`, `CORS_ORIGIN` |
| MySQL | `DATABASE_URL` **o** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; `DB_SSL` |
| Sesión | `JWT_SECRET` (mínimo 32 caracteres en producción), `JWT_EXPIRES_IN` |
| Fotografías | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` |
| Pagos | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` |
| Correo | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `RESET_TOKEN_MINUTES`, `VERIFY_TOKEN_HOURS` |
| Negocio (correos) | `BUSINESS_NAME`, `BUSINESS_LEGAL_NAME`, `BUSINESS_ADDRESS`, `BUSINESS_EMAIL`, `BUSINESS_PHONE` |
| Admin inicial | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (solo para crear la primera cuenta de administrador) |

Frontend: `VITE_API_URL`, `VITE_SOCKET_URL` y los datos del negocio `VITE_BUSINESS_*` (nombre o razón social, RFC, domicilio, correo, correo de privacidad, teléfono, WhatsApp, horario) más `VITE_LEGAL_UPDATED`.

## Base de datos

```bash
npm run db:init     # crea lo que falte y aplica migraciones sin borrar datos
npm run db:reset    # SOLO desarrollo: elimina y recrea todas las tablas
```

También existe el script completo `backend/database/database.sql`. Tablas: `usuarios`, `password_resets`, `tecnicos`, `dispositivos`, `folio_secuencias`, `solicitudes`, `evidencias`, `diagnosticos`, `historial_estados`, `presupuestos`, `pagos`, `logistica`, `conversaciones`, `mensajes`, `notificaciones`, `piezas`, `calificaciones`.

## Pagos (Stripe)

- **Tarjeta:** el cliente pulsa *Pagar con tarjeta* y es redirigido a **Stripe Checkout**. PROTEC nunca recibe ni guarda los datos de la tarjeta. El pago se confirma con el **webhook firmado** `POST /api/payments/stripe/webhook` (y también al regresar del pago, como respaldo). La confirmación es idempotente: un pago nunca se registra dos veces.
- **Efectivo o transferencia:** el administrador lo registra en **Administración → Solicitudes → Registrar pago**; el monto se calcula a partir del presupuesto aceptado.
- Si `STRIPE_SECRET_KEY` no está configurada, el sitio solo ofrece el pago en sucursal.

## Cuentas y contraseñas

- **Registro:** exige aceptar los Términos y el Aviso de privacidad (se guarda la fecha del consentimiento) y **confirmar el correo** con un enlace que vence en `VERIFY_TOKEN_HOURS` horas antes de poder iniciar sesión. Desde el login se puede reenviar el enlace.

- **Cambiar contraseña:** *Mi cuenta → Seguridad*. Pide la contraseña actual, la nueva y su confirmación; al guardar se cierran las sesiones en otros dispositivos.
- **Recuperar contraseña:** *Iniciar sesión → ¿Olvidaste tu contraseña?*. Se envía un enlace por correo que **vence** en `RESET_TOKEN_MINUTES` minutos (30 por defecto) y solo funciona una vez. La respuesta es la misma exista o no la cuenta, y se guarda únicamente el hash del token.
- **Administración de cuentas:** el administrador puede crear cuentas (con contraseña temporal), cambiar el tipo de una cuenta (por ejemplo, convertir un cliente en técnico) y eliminar cuentas. No puede eliminarse a sí mismo, siempre debe quedar al menos un administrador y un técnico con solicitudes activas debe reasignarse antes de eliminarse.
- **Primer administrador en producción:** define `ADMIN_EMAIL` y `ADMIN_PASSWORD` y despliega (o ejecuta `npm run admin:create`). Nunca se cargan datos de ejemplo en producción.

## Avisos por correo

Con SMTP configurado, el cliente recibe un correo cuando se le asigna técnico, cuando su presupuesto está disponible, cuando se recibe un pago, cuando la reparación termina y cuando se programa la recolección o la entrega. El técnico recibe un correo al asignársele una solicitud.

## Información legal

- `/terminos` — Términos y condiciones.
- `/privacidad` — Aviso de privacidad integral (estructura conforme a la LFPDPPP).

Ambos toman los datos del negocio de las variables `VITE_BUSINESS_*`. **Deben revisarse con un abogado** antes de publicar.

## Socket.IO

- Autenticación con el mismo JWT (validado contra la base de datos, incluida la versión de credenciales).
- Sala personal `user:<id>`: notificaciones en tiempo real, actualizaciones de solicitudes y cierre de sesión cuando el administrador cambia el rol o elimina la cuenta.
- Sala `repair:<folio>`: chat cliente-técnico (solo propietario, técnico asignado y administrador).

## Pruebas automatizadas

Con el backend en ejecución y los datos de ejemplo de desarrollo cargados:

```bash
cd backend
npm run test:flow       # 10 pruebas: registro, login, solicitudes, chatbot, permisos
npm run test:prompt3    # 16 pruebas: flujo completo, chat en tiempo real y permisos
npm run test:accounts   # 9 pruebas: atención directa, contraseñas, verificación de correo, administración y webhook de Stripe
npm test                # todas
```

La prueba del webhook de Stripe se ejecuta cuando el backend y la prueba comparten `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` (pueden ser claves de prueba).

## Datos de ejemplo (solo desarrollo)

`npm run db:seed` crea cuentas de prueba (contraseña `Protec2026!`, documentada solo aquí y en `backend/scripts/seed.js`): `admin@protec.app`, `tecnico@protec.app` (celulares), `tecnico2@protec.app` (laptops y computadoras), `cliente@protec.app` y `otro@protec.app`. El seed está bloqueado con `NODE_ENV=production`.

## Estructura del proyecto

```text
PROTEC/
├── DEPLOY.md                     # guía de publicación
├── backend/
│   ├── server.js                 # HTTP + Express + Socket.IO
│   ├── railway.json              # despliegue en Railway (migra y arranca)
│   ├── database/                 # schema.sql y database.sql
│   ├── scripts/                  # initDb, seed, createAdmin y pruebas
│   └── src/
│       ├── config/               # env, db, cloudinary, stripe
│       ├── controllers/          # auth, users, repairs, repairFlow, technician, admin...
│       ├── middleware/           # JWT + authorizeRoles, subida de archivos, límites, errores
│       ├── models/               # consultas parametrizadas por tabla
│       ├── routes/               # endpoints /api
│       ├── services/             # workflow, pagos, cuentas, correo, chat, notificaciones, chatbot
│       ├── socket/               # servidor Socket.IO
│       └── utils/                # constantes, serializadores, validadores, tokens
└── frontend/
    ├── vercel.json · netlify.toml
    └── src/
        ├── components/           # auth, admin, layout, workflow (chat, presupuesto, pagos...), ui
        ├── context/              # Auth, Socket, Notifications, Toast
        ├── pages/                # Dashboard, RepairDetail, RepairPayment, ForgotPassword, ResetPassword,
        │                         # TechnicianDashboard, AdminDashboard, MyAccount...
        ├── services/             # cliente HTTP y servicios por módulo
        └── utils/                # rutas, estados, formatos, validaciones
```

## Seguridad

- Contraseñas con bcrypt; JWT con versión de credenciales (cambiar o recuperar la contraseña cierra las demás sesiones).
- `authorizeRoles` en los paneles y verificación de propiedad/asignación en cada solicitud (REST y Socket.IO).
- Consultas parametrizadas, validación en el backend, Helmet, CORS restringido y límites de peticiones (incluido un límite estricto para recuperación de contraseña).
- Imágenes validadas por firma binaria (JPG, PNG, WEBP; máximo 5 MB). En producción solo se aceptan si Cloudinary está configurado.
- Los datos de tarjeta nunca llegan al servidor (Stripe Checkout) y los webhooks se verifican con firma.
