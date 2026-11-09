import nodemailer from 'nodemailer'
import { env, mailEnabled } from '../config/env.js'

/**
 * Envío de correos por API HTTPS de Brevo (puerto 443, nunca bloqueado en Railway)
 * o por SMTP (puerto 2525 / 587 con timeout corto para nunca colgar las peticiones).
 */
const brevoApiKey = process.env.BREVO_API_KEY || (env.mail.pass?.startsWith('xkeysib-') ? env.mail.pass : '')

function createSmtpTransport(port) {
  return nodemailer.createTransport({
    host: env.mail.host,
    port,
    secure: port === 465 || env.mail.secure,
    auth: { user: env.mail.user, pass: env.mail.pass },
    connectionTimeout: 3500,
    greetingTimeout: 3500,
    socketTimeout: 5000,
  })
}

const primaryPort =
  env.isProduction && env.mail.host === 'smtp-relay.brevo.com' && env.mail.port === 587 ? 2525 : env.mail.port

const transporter = mailEnabled ? createSmtpTransport(primaryPort) : null
let smtpReachable = true

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Pie con los datos del negocio que estén configurados (BUSINESS_*). */
function businessFooter() {
  const b = env.business
  const parts = [b.name, b.legalName ? `Responsables: ${b.legalName}` : '', b.address, b.phone, b.email].filter(Boolean).map(escapeHtml)
  return parts.join(' · ')
}

/** Plantilla HTML con la identidad visual de PROTEC (compatible con clientes de correo). */
function layout({ title, intro, buttonLabel, buttonUrl, footer }) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f6f9fc;font-family:Arial,Helvetica,sans-serif;color:#10213a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4ebf3;border-radius:20px;overflow:hidden">
        <tr><td style="background:#081a33;padding:22px 28px;font-size:22px;font-weight:800;color:#ffffff">PRO<span style="color:#18c8ff">TEC</span></td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#10213a">${escapeHtml(title)}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5b6b82">${intro}</p>
          ${
            buttonUrl
              ? `<p style="margin:0 0 22px"><a href="${buttonUrl}" style="display:inline-block;background:#247cff;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px">${escapeHtml(buttonLabel)}</a></p>
                 <p style="margin:0 0 6px;font-size:12px;color:#5b6b82">Si el botón no funciona, copia este enlace en tu navegador:</p>
                 <p style="margin:0 0 22px;font-size:12px;word-break:break-all"><a href="${buttonUrl}" style="color:#247cff">${buttonUrl}</a></p>`
              : ''
          }
          <p style="margin:0;font-size:13px;line-height:1.6;color:#5b6b82">${footer}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8a98ab">${businessFooter()}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#8a98ab">Este es un mensaje automático, no respondas a este correo. <a href="${env.frontendUrl}/privacidad" style="color:#8a98ab">Aviso de privacidad</a></p>
    </td></tr>
  </table>
</body></html>`
}

function parseFrom(raw) {
  const m = String(raw || '').match(/^(.*?)\s*<([^>]+)>$/)
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || 'PROTEC', email: m[2].trim() }
  return { name: 'PROTEC', email: String(raw || '').trim() }
}

async function sendViaBrevoHttp({ to, subject, html, text }) {
  const sender = parseFrom(env.mail.from)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Brevo HTTP ${res.status}: ${body}`)
  }
  return true
}

async function send({ to, subject, html, text, devLink }) {
  if (brevoApiKey) {
    try {
      return await sendViaBrevoHttp({ to, subject, html, text })
    } catch (error) {
      console.error('[mail] Error en API HTTPS de Brevo:', error.message)
    }
  }
  if (!transporter || !smtpReachable) {
    if (env.isProduction) {
      console.error('[mail] Salida SMTP no disponible en este servidor. Usa una API key HTTP de Brevo (xkeysib-...) en SMTP_PASS o BREVO_API_KEY.')
      return false
    }
    // Solo en desarrollo: permite probar el flujo sin servidor de correo.
    console.log(`[mail] (desarrollo, SMTP no configurado) Correo para ${to}: "${subject}"${devLink ? `\n       Enlace: ${devLink}` : ''}`)
    return false
  }
  try {
    await transporter.sendMail({ from: env.mail.from, to, subject, html, text })
    return true
  } catch (error) {
    if (error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET' || error?.code === 'ECONNREFUSED') {
      smtpReachable = false
    }
    console.error('[mail] Error al enviar correo:', error.response || error.code || error.message)
    if (!env.isProduction && devLink) {
      console.log(`[mail] (desarrollo) Enlace directo para "${subject}": ${devLink}`)
    }
    return false
  }
}

export const mailService = {
  async verify() {
    if (brevoApiKey) {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { accept: 'application/json', 'api-key': brevoApiKey },
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    }
    if (!transporter) return false
    return transporter.verify()
  },
  sendEmailVerification({ to, nombre, url, hours }) {
    return send({
      to,
      subject: 'Confirma tu correo en PROTEC',
      devLink: url,
      text: `Hola ${nombre}. Confirma tu correo para activar tu cuenta de PROTEC (el enlace vence en ${hours} horas): ${url}`,
      html: layout({
        title: 'Confirma tu correo',
        intro: `Hola ${escapeHtml(nombre)}, gracias por registrarte. Confirma que este correo es tuyo para activar tu cuenta. El enlace es válido durante <strong>${hours} horas</strong>.`,
        buttonLabel: 'Confirmar mi correo',
        buttonUrl: url,
        footer: 'Si tú no creaste una cuenta en PROTEC, ignora este correo.',
      }),
    })
  },

  /** Aviso de un momento clave de la reparación (presupuesto, pago, reparación terminada...). */
  sendRepairUpdate({ to, nombre, titulo, mensaje, url }) {
    return send({
      to,
      subject: `${titulo} · PROTEC`,
      text: `Hola ${nombre}. ${mensaje}\n\nConsulta los detalles: ${url}`,
      html: layout({
        title: titulo,
        intro: `Hola ${escapeHtml(nombre)}, ${escapeHtml(mensaje)}`,
        buttonLabel: 'Ver mi solicitud',
        buttonUrl: url,
        footer: 'También verás este aviso en la sección de notificaciones de tu cuenta.',
      }),
    })
  },
  sendPasswordReset({ to, nombre, url, minutes }) {
    return send({
      to,
      subject: 'Recupera tu contraseña de PROTEC',
      devLink: url,
      text: `Hola ${nombre}. Para crear una nueva contraseña abre este enlace (vence en ${minutes} minutos): ${url}\nSi no lo solicitaste, ignora este correo.`,
      html: layout({
        title: 'Recupera tu contraseña',
        intro: `Hola ${escapeHtml(nombre)}, recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace es válido durante <strong>${minutes} minutos</strong> y solo puede usarse una vez.`,
        buttonLabel: 'Crear nueva contraseña',
        buttonUrl: url,
        footer: 'Si tú no solicitaste este cambio, ignora este correo: tu contraseña actual seguirá funcionando.',
      }),
    })
  },

  sendPasswordChanged({ to, nombre }) {
    return send({
      to,
      subject: 'Tu contraseña de PROTEC fue actualizada',
      text: `Hola ${nombre}. La contraseña de tu cuenta se actualizó. Si no fuiste tú, recupera tu cuenta desde ${env.frontendUrl}/recuperar-contrasena`,
      html: layout({
        title: 'Tu contraseña fue actualizada',
        intro: `Hola ${escapeHtml(nombre)}, la contraseña de tu cuenta se cambió correctamente y cerramos las sesiones abiertas en otros dispositivos.`,
        buttonLabel: 'Iniciar sesión',
        buttonUrl: `${env.frontendUrl}/login`,
        footer: `Si no reconoces este cambio, <a href="${env.frontendUrl}/recuperar-contrasena" style="color:#247cff">recupera tu cuenta</a> de inmediato.`,
      }),
    })
  },

  sendAccountCreated({ to, nombre, rol }) {
    const rolLabel = rol === 'admin' ? 'administrador' : rol === 'tecnico' ? 'técnico' : 'cliente'
    return send({
      to,
      subject: 'Se creó tu cuenta en PROTEC',
      text: `Hola ${nombre}. Se creó tu cuenta de ${rolLabel} en PROTEC. El administrador te compartirá tu contraseña temporal; cámbiala desde Mi cuenta.`,
      html: layout({
        title: 'Bienvenido a PROTEC',
        intro: `Hola ${escapeHtml(nombre)}, el administrador creó tu cuenta de <strong>${rolLabel}</strong>. Inicia sesión con la contraseña temporal que te compartió y cámbiala desde <strong>Mi cuenta</strong>.`,
        buttonLabel: 'Iniciar sesión',
        buttonUrl: `${env.frontendUrl}/login`,
        footer: 'Si olvidaste la contraseña temporal, usa “¿Olvidaste tu contraseña?” en la pantalla de inicio de sesión.',
      }),
    })
  },
}
