# Publicar PROTEC en internet

Arquitectura recomendada:

| Parte | Servicio | Por qué |
| --- | --- | --- |
| Backend (Node.js + Socket.IO) | **Railway** | Soporta WebSockets y procesos permanentes |
| Base de datos MySQL | **Railway MySQL** | En el mismo proyecto que el backend |
| Frontend (React) | **Vercel** o **Netlify** | Sitio estático rápido con HTTPS gratis |
| Fotografías | **Cloudinary** | El disco de Railway es temporal |
| Pagos con tarjeta | **Stripe** | La tarjeta se captura en la página segura de Stripe |
| Correos (recuperar contraseña) | **Brevo** o **Resend** (SMTP) | Envío confiable |

> [!IMPORTANT]
> Render no ofrece MySQL administrado; por eso se usa Railway para el backend y la base de datos.

---

## 0. Requisitos previos

1. Sube el proyecto a un repositorio de **GitHub** (los archivos `.env` ya están en `.gitignore` y no se suben).
2. Crea cuentas en: Railway, Vercel (o Netlify), Cloudinary, Stripe y Brevo (o Resend).

## 1. Base de datos y backend en Railway

1. En Railway: **New Project → Deploy from GitHub repo** y elige el repositorio.
2. En el servicio creado, abre **Settings → Root Directory** y escribe `backend`.
3. En el mismo proyecto: **New → Database → MySQL**.
4. En el servicio del backend, **Variables**, agrega:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (referencia a la base de Railway) |
| `JWT_SECRET` | Cadena aleatoria de 64 caracteres (ver abajo) |
| `PUBLIC_URL` | URL pública del backend, p. ej. `https://protec-api.up.railway.app` |
| `FRONTEND_URL` | URL del frontend, p. ej. `https://protec.vercel.app` |
| `CORS_ORIGIN` | La misma URL del frontend (si tienes dominio propio, sepáralas con coma) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Del panel de Cloudinary |
| `STRIPE_SECRET_KEY` | `sk_test_...` para pruebas o `sk_live_...` en producción |
| `STRIPE_WEBHOOK_SECRET` | Paso 3 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Paso 4 |

   Para generar `JWT_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. En **Settings → Networking**, pulsa **Generate Domain** para obtener la URL pública del backend.
6. El archivo `backend/railway.json` hace que cada despliegue ejecute `npm run start:prod`: crea o migra las tablas automáticamente y arranca el servidor. Railway verifica que responda en `/api/health`.
7. Crea tu cuenta de administrador (una sola vez): agrega las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 8 caracteres, con letras y números) y vuelve a desplegar. Al arrancar se crea la cuenta; si ya existe, no se modifica. Inicia sesión en el sitio, cambia la contraseña desde **Mi cuenta** y **elimina esas dos variables** de Railway.

> [!CAUTION]
> Nunca ejecutes `npm run db:seed` ni `npm run db:reset` en producción: están bloqueados con `NODE_ENV=production`.

## 2. Frontend en Vercel (o Netlify)

**Vercel**

1. **Add New → Project**, importa el repositorio.
2. **Root Directory**: `frontend`. Vercel detecta Vite y usa `frontend/vercel.json` (redirecciones de la SPA y encabezados de seguridad).
3. **Environment Variables**:

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | `https://<tu-backend>/api` |
| `VITE_SOCKET_URL` | `https://<tu-backend>` |

4. **Deploy**. Copia la URL final y colócala en `FRONTEND_URL` y `CORS_ORIGIN` del backend (Railway se vuelve a desplegar solo).

### Datos del negocio y documentos legales

Agrega también en el frontend (Vercel/Netlify) los datos reales de tu negocio; se muestran en el pie de página, en Ayuda, en los **Términos y condiciones** (`/terminos`) y en el **Aviso de privacidad** (`/privacidad`):

| Variable | Ejemplo |
| --- | --- |
| `VITE_BUSINESS_NAME` | `PROTEC` |
| `VITE_BUSINESS_LEGAL_NAME` | `Cristian Javier Padilla Cornejo, Jessica Pedraza Quintana, Gael Ceja de Anda, Edwin Daniel Carvajal López y Mario Abraham Murillo García` (ya incluido por defecto) |
| `VITE_BUSINESS_RFC` | Opcional |
| `VITE_BUSINESS_ADDRESS` | Domicilio del centro de servicio |
| `VITE_BUSINESS_EMAIL` | Correo de contacto |
| `VITE_BUSINESS_PRIVACY_EMAIL` | Correo para solicitudes de privacidad (derechos ARCO) |
| `VITE_BUSINESS_PHONE` | Teléfono de atención |
| `VITE_BUSINESS_WHATSAPP` | `5215512345678` (lada internacional, solo números) |
| `VITE_BUSINESS_HOURS` | `Lunes a viernes 9:00 a 18:00, sábado 9:00 a 14:00` |
| `VITE_LEGAL_UPDATED` | Fecha de publicación de los documentos legales |

En el backend (Railway) agrega `BUSINESS_NAME`, `BUSINESS_LEGAL_NAME`, `BUSINESS_ADDRESS`, `BUSINESS_EMAIL` y `BUSINESS_PHONE` para el pie de los correos.

> [!IMPORTANT]
> Los textos de Términos y Aviso de privacidad siguen la estructura que pide la legislación mexicana (LFPDPPP y Ley Federal de Protección al Consumidor), pero **pídele a un abogado que los revise** y ajuste a tu negocio antes de publicar (políticas de garantía, cancelación y reembolso, etc.). Están en `frontend/src/pages/TermsPage.jsx` y `frontend/src/pages/PrivacyPage.jsx`.

**Netlify (alternativa)**: **Add new site → Import from Git**, base directory `frontend`. El archivo `frontend/netlify.toml` ya define el build y las redirecciones. Agrega las mismas dos variables `VITE_*`.

> [!NOTE]
> Las variables `VITE_*` se incrustan al compilar: si las cambias, vuelve a desplegar el frontend.

## 3. Stripe (pagos con tarjeta)

1. En [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) copia la **clave secreta** a `STRIPE_SECRET_KEY`.
2. En **Developers → Webhooks → Add endpoint**:
   - URL: `https://<tu-backend>/api/payments/stripe/webhook`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`
3. Copia el **Signing secret** (`whsec_...`) a `STRIPE_WEBHOOK_SECRET`.
4. Prueba con el modo de prueba de Stripe y la tarjeta `4242 4242 4242 4242` (cualquier fecha futura y CVC). Cuando todo funcione, activa tu cuenta de Stripe y cambia a las claves `sk_live_...` y a un webhook en modo live.

La moneda predeterminada es MXN (`STRIPE_CURRENCY=mxn`). Los pagos en efectivo o transferencia los registra el administrador desde **Administración → Solicitudes → Registrar pago**.

## 4. Correo (Brevo o Resend)

**Brevo**: en *SMTP & API → SMTP*, copia el login y genera una clave SMTP. Verifica tu remitente en *Remitentes e IP → Remitentes* (*Senders*) y en *Seguridad → IP autorizadas* (*Security → Authorized IPs*) desactiva el bloqueo de IP desconocidas para que Railway pueda conectarse sin el error `525 5.7.1 Unauthorized IP address`.

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=c21e88001@smtp-brevo.com
SMTP_PASS=<clave SMTP de Brevo>
MAIL_FROM=PROTEC <cristianpadilla1108@gmail.com>
```

**Resend**: verifica tu dominio y crea una API key.

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=<API key de Resend>
MAIL_FROM=PROTEC <no-reply@tudominio.com>
```

El enlace de recuperación vence a los `RESET_TOKEN_MINUTES` minutos (30 por defecto) y solo funciona una vez.

Con SMTP configurado también se activan:

- **Verificación de correo al registrarse:** la cuenta no puede iniciar sesión hasta confirmar el correo (el enlace vence en `VERIFY_TOKEN_HOURS`, 48 h por defecto). Las cuentas creadas por el administrador ya quedan verificadas.
- **Avisos por correo** de técnico asignado, presupuesto disponible, pago recibido, reparación terminada, recolección y entrega programadas.

> [!WARNING]
> Sin SMTP en producción no se envían correos y la verificación de correo se desactiva para no bloquear el registro. El registro de Railway lo indica al arrancar.

## 5. Verificación final

Al arrancar, el registro del backend en Railway debe mostrar:

```
[db] Conectado a MySQL ...
[api] PROTEC API escuchando en https://.../api (producción)
[api] Imágenes: Cloudinary
[api] Pagos en línea: Stripe + webhook
[api] Correo: SMTP smtp-relay.brevo.com
```

Lista de comprobación:

- [ ] `https://<tu-backend>/api/health` responde `{"status":"ok"}`.
- [ ] Registro e inicio de sesión desde el sitio publicado.
- [ ] "¿Olvidaste tu contraseña?" envía el correo y el enlace abre el formulario.
- [ ] Crear una solicitud con fotografías (se guardan en Cloudinary).
- [ ] Chat en tiempo real entre cliente y técnico (Socket.IO).
- [ ] Pago de prueba con Stripe: al volver, la solicitud avanza.
- [ ] El administrador puede crear un técnico desde **Administración → Usuarios**.

## Dominio propio (opcional)

- Frontend: en Vercel/Netlify agrega el dominio (p. ej. `protec.mx`).
- Backend: en Railway agrega un subdominio (p. ej. `api.protec.mx`).
- Actualiza `FRONTEND_URL`, `CORS_ORIGIN`, `PUBLIC_URL`, `VITE_API_URL`, `VITE_SOCKET_URL` y la URL del webhook de Stripe.
