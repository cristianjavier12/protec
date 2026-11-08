/**
 * Pruebas de cuentas, contraseñas, administración y pagos con Stripe.
 *   npm run test:accounts   (backend en ejecución + datos de ejemplo de desarrollo: npm run db:seed)
 *
 * La prueba del webhook de Stripe se ejecuta solo si el backend y esta prueba comparten
 * STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET (puede ser una clave de prueba sk_test_...).
 */
import crypto from 'node:crypto'
import 'dotenv/config'
import Stripe from 'stripe'
import { pool } from '../src/config/db.js'

const BASE = process.env.SMOKE_API_URL || `http://localhost:${process.env.PORT || 4000}/api`
const DEMO_PASSWORD = 'Protec2026!' // solo cuentas de desarrollo creadas por seed.js
const results = []
const record = (n, name, ok, detail = '') => {
  results.push({ ok: Boolean(ok) })
  console.log(`${ok ? '✔' : '✘'} PRUEBA ${n}: ${name}${detail ? ` — ${detail}` : ''}`)
}

async function call(method, path, { token, body, headers = {}, raw } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}
const login = async (correo, password = DEMO_PASSWORD) => (await call('POST', '/auth/login', { body: { correo, password } })).data?.token
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex')

async function run() {
  const admin = await login('admin@protec.app')
  if (!admin) throw new Error('No fue posible iniciar sesión como administrador. ¿Ejecutaste npm run db:seed?')
  const stamp = Date.now()

  // ---------- 1. Atención directa con técnico (sin chatbot) ----------
  const email = `cuenta.${stamp}@protec.app`
  await call('POST', '/auth/register', { body: { nombre: 'Rosa', apellidos: 'Cuentas Prueba', correo: email, telefono: '55 3333 4444', password: 'ClaveSegura123', aceptaTerminos: true } })
  await pool.query('UPDATE usuarios SET correo_verificado = 1 WHERE correo = ?', [email])
  let user = await login(email, 'ClaveSegura123')
  const direct = await call('POST', '/repairs', {
    token: user,
    body: { tipo: 'celular', marca: 'Motorola', modelo: 'G84', categoria: 'Pantalla', descripcion: 'La pantalla se rompió tras una caída y ya no responde al tacto.', atencion: 'tecnico' },
  })
  const directFolio = direct.data?.repair?.folio
  const directDetail = (await call('GET', `/repairs/${directFolio}`, { token: user })).data?.repair
  record(
    1,
    'Solicitud con atención directa de técnico (sin chatbot)',
    ['Técnico asignado', 'Pendiente de técnico'].includes(directDetail?.estado) && directDetail?.requiereTecnico && !directDetail?.diagnostico,
    `${directFolio} → ${directDetail?.estado}${directDetail?.tecnicoPerfil ? ` (${directDetail.tecnicoPerfil.nombre})` : ''}`,
  )

  // ---------- 2. Cambio de contraseña desde el perfil ----------
  const wrong = await call('PUT', '/users/me/password', { token: user, body: { actual: 'Incorrecta123', nueva: 'NuevaClave456', confirmacion: 'NuevaClave456' } })
  const weak = await call('PUT', '/users/me/password', { token: user, body: { actual: 'ClaveSegura123', nueva: 'corta', confirmacion: 'corta' } })
  const changed = await call('PUT', '/users/me/password', { token: user, body: { actual: 'ClaveSegura123', nueva: 'NuevaClave456', confirmacion: 'NuevaClave456' } })
  const oldSession = await call('GET', '/auth/me', { token: user })
  const newSession = await call('GET', '/auth/me', { token: changed.data?.token })
  const oldPwd = await call('POST', '/auth/login', { body: { correo: email, password: 'ClaveSegura123' } })
  user = await login(email, 'NuevaClave456')
  record(
    2,
    'Cambio de contraseña exige la actual y cierra otras sesiones',
    wrong.status === 422 && wrong.data?.errors?.actual && weak.status === 422 && changed.status === 200 && oldSession.status === 401 && newSession.status === 200 && oldPwd.status === 401 && user,
    `actual incorrecta ${wrong.status} · débil ${weak.status} · sesión anterior ${oldSession.status} · token nuevo ${newSession.status}`,
  )

  // ---------- 3. Recuperación de contraseña con enlace que vence ----------
  const unknown = await call('POST', '/auth/forgot-password', { body: { correo: `no.existe.${stamp}@protec.app` } })
  const known = await call('POST', '/auth/forgot-password', { body: { correo: email } })
  const [[{ total: created }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM password_resets r JOIN usuarios u ON u.id_usuario = r.id_usuario WHERE u.correo = ? AND r.usado_en IS NULL',
    [email],
  )
  // El token real viaja solo por correo; la prueba crea uno equivalente para simular el clic en el enlace.
  const [[u]] = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [email])
  const token = crypto.randomBytes(32).toString('hex')
  await pool.query('UPDATE password_resets SET usado_en = UTC_TIMESTAMP() WHERE id_usuario = ? AND usado_en IS NULL', [u.id_usuario])
  await pool.query('INSERT INTO password_resets (id_usuario, token_hash, expira) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))', [u.id_usuario, sha256(token)])
  const valid = await call('GET', `/auth/reset-password/validate?token=${token}`)
  const reset = await call('POST', '/auth/reset-password', { body: { token, password: 'Recuperada789', confirmacion: 'Recuperada789' } })
  const reuse = await call('POST', '/auth/reset-password', { body: { token, password: 'OtraClave789', confirmacion: 'OtraClave789' } })
  const afterReset = await call('GET', '/auth/me', { token: user })
  user = await login(email, 'Recuperada789')
  const expiredToken = crypto.randomBytes(32).toString('hex')
  await pool.query('INSERT INTO password_resets (id_usuario, token_hash, expira) VALUES (?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE))', [u.id_usuario, sha256(expiredToken)])
  const expired = await call('POST', '/auth/reset-password', { body: { token: expiredToken, password: 'Vencida789', confirmacion: 'Vencida789' } })
  const expiredValid = await call('GET', `/auth/reset-password/validate?token=${expiredToken}`)
  record(
    3,
    'Recuperación de contraseña: respuesta genérica, enlace de un solo uso y con vencimiento',
    unknown.status === 200 && known.status === 200 && unknown.data?.message === known.data?.message && Number(created) === 1 &&
      valid.data?.valid === true && reset.status === 200 && reuse.status === 400 && afterReset.status === 401 && user &&
      expired.status === 400 && expiredValid.data?.valid === false,
    `enlace creado: ${created} · reutilizado ${reuse.status} · vencido ${expired.status} · sesiones previas cerradas ${afterReset.status}`,
  )

  // ---------- 4. Administración: crear cuentas de técnico y administrador ----------
  const newTech = await call('POST', '/admin/users', {
    token: admin,
    body: { rol: 'tecnico', especialidad: 'celulares', nombre: 'Pedro', apellidos: 'Técnico Nuevo', correo: `tec.${stamp}@protec.app`, telefono: '55 5555 1111', password: 'Temporal123' },
  })
  const newAdmin = await call('POST', '/admin/users', {
    token: admin,
    body: { rol: 'admin', nombre: 'Laura', apellidos: 'Admin Nueva', correo: `adm.${stamp}@protec.app`, telefono: '55 5555 2222', password: 'Temporal123' },
  })
  const dupe = await call('POST', '/admin/users', { token: admin, body: { rol: 'tecnico', nombre: 'Otro', apellidos: 'Igual', correo: `tec.${stamp}@protec.app`, telefono: '55 5555 1111', password: 'Temporal123' } })
  const techToken = await login(`tec.${stamp}@protec.app`, 'Temporal123')
  const techDash = await call('GET', '/technician/dashboard', { token: techToken })
  const userCreates = await call('POST', '/admin/users', { token: user, body: { rol: 'admin', nombre: 'Hack', apellidos: 'Er', correo: `x.${stamp}@protec.app`, telefono: '55 5555 9999', password: 'Temporal123' } })
  record(
    4,
    'Admin crea cuentas de técnico y administrador',
    newTech.status === 201 && newAdmin.status === 201 && dupe.status === 409 && techDash.status === 200 && techDash.data?.perfil?.especialidad === 'celulares' && userCreates.status === 403,
    `técnico ${newTech.status} · admin ${newAdmin.status} · duplicado ${dupe.status} · cliente intentando crear ${userCreates.status}`,
  )

  // ---------- 5. Convertir una cuenta de cliente en técnico ----------
  const convEmail = `convertir.${stamp}@protec.app`
  await call('POST', '/auth/register', { body: { nombre: 'Jorge', apellidos: 'Cliente Convertido', correo: convEmail, telefono: '55 6666 7777', password: 'ClaveSegura123', aceptaTerminos: true } })
  await pool.query('UPDATE usuarios SET correo_verificado = 1 WHERE correo = ?', [convEmail])
  const convOld = await login(convEmail, 'ClaveSegura123')
  const convId = (await call('GET', '/auth/me', { token: convOld })).data?.user?.id
  const convert = await call('PATCH', `/admin/users/${convId}/role`, { token: admin, body: { rol: 'tecnico', especialidad: 'laptops_computadoras' } })
  const oldConvSession = await call('GET', '/auth/me', { token: convOld })
  const convNew = await login(convEmail, 'ClaveSegura123')
  const convDash = await call('GET', '/technician/dashboard', { token: convNew })
  const adminId = (await call('GET', '/auth/me', { token: admin })).data?.user?.id
  const selfRole = await call('PATCH', `/admin/users/${adminId}/role`, { token: admin, body: { rol: 'usuario' } })
  record(
    5,
    'Admin convierte una cuenta en técnico',
    convert.status === 200 && convert.data?.user?.rol === 'tecnico' && oldConvSession.status === 401 && convDash.status === 200 && selfRole.status === 409,
    `rol: ${convert.data?.user?.rol} · sesión anterior ${oldConvSession.status} · panel técnico ${convDash.status} · cambiar su propio rol ${selfRole.status}`,
  )

  // ---------- 6. Eliminar folio de un cliente ----------
  const delFolio = await call('DELETE', `/admin/repairs/${directFolio}`, { token: admin })
  const gone = await call('GET', `/repairs/${directFolio}`, { token: user })
  const notes = (await call('GET', '/notifications', { token: user })).data?.notifications ?? []
  const techDelete = await call('DELETE', `/admin/repairs/PRO-2026-00001`, { token: techToken })
  record(
    6,
    'Admin elimina un folio de reparación',
    delFolio.status === 200 && gone.status === 404 && notes.some((n) => n.titulo === 'Solicitud eliminada') && techDelete.status === 403,
    `eliminado ${delFolio.status} · consulta posterior ${gone.status} · técnico intentando eliminar ${techDelete.status}`,
  )

  // ---------- 7. Eliminar cuentas (cliente, técnico, administrador) con reglas de seguridad ----------
  await call('POST', '/repairs', { token: user, body: { tipo: 'laptop', marca: 'Acer', modelo: 'Aspire 5', descripcion: 'La batería ya no carga y el equipo se apaga al desconectarlo.' } })
  const userId = (await call('GET', '/auth/me', { token: user })).data?.user?.id
  const delUser = await call('DELETE', `/admin/users/${userId}`, { token: admin })
  const [[{ total: leftover }]] = await pool.query('SELECT COUNT(*) AS total FROM solicitudes WHERE id_usuario = ?', [userId])
  const deletedLogin = await call('POST', '/auth/login', { body: { correo: email, password: 'Recuperada789' } })
  const selfDelete = await call('DELETE', `/admin/users/${adminId}`, { token: admin })
  const tech2Id = (await call('GET', '/auth/me', { token: await login('tecnico2@protec.app') })).data?.user?.id
  const busyTech = await call('DELETE', `/admin/users/${tech2Id}`, { token: admin })
  const delTech = await call('DELETE', `/admin/users/${newTech.data?.user?.id}`, { token: admin })
  const delAdmin = await call('DELETE', `/admin/users/${newAdmin.data?.user?.id}`, { token: admin })
  record(
    7,
    'Admin elimina cuentas de cliente, técnico y administrador',
    delUser.status === 200 && Number(leftover) === 0 && deletedLogin.status === 401 && selfDelete.status === 409 && busyTech.status === 409 && delTech.status === 200 && delAdmin.status === 200,
    `cliente ${delUser.status} (solicitudes restantes: ${leftover}) · propia ${selfDelete.status} · técnico con trabajos activos ${busyTech.status} · técnico libre ${delTech.status} · admin ${delAdmin.status}`,
  )

  // ---------- 8. Pagos con Stripe (webhook firmado) ----------
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const unsigned = await call('POST', '/payments/stripe/webhook', { raw: JSON.stringify({ type: 'checkout.session.completed' }), headers: { 'stripe-signature': 't=1,v1=falsa' } })
  if (!secretKey || !webhookSecret) {
    record(8, 'Webhook de Stripe rechaza firmas inválidas', [400, 503].includes(unsigned.status), `Stripe no configurado en esta prueba (respuesta ${unsigned.status})`)
  } else {
    const client = await login('cliente@protec.app')
    const [[repair]] = await pool.query("SELECT id_solicitud, folio FROM solicitudes WHERE estado = 'En reparación' ORDER BY id_solicitud LIMIT 1")
    // Lleva la solicitud demo hasta "Reparación terminada" con saldo pendiente.
    await pool.query("UPDATE solicitudes SET estado = 'Reparación terminada' WHERE id_solicitud = ?", [repair.id_solicitud])
    const pending = (await call('GET', `/repairs/${repair.folio}/payments`, { token: client })).data
    const sessionId = `cs_test_${stamp}`
    const [ins] = await pool.query(
      "INSERT INTO pagos (id_solicitud, tipo, monto, estado, metodo, referencia, stripe_session_id) VALUES (?, 'pago_final', ?, 'pendiente', 'Tarjeta', 'Stripe Checkout', ?)",
      [repair.id_solicitud, pending.resumenPagos.saldoPendiente, sessionId],
    )
    const payload = JSON.stringify({
      id: `evt_${stamp}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: Math.round(pending.resumenPagos.saldoPendiente * 100),
          currency: process.env.STRIPE_CURRENCY || 'mxn',
          client_reference_id: String(ins.insertId),
          metadata: { pagoId: String(ins.insertId), folio: repair.folio, tipo: 'pago_final' },
          payment_intent: `pi_test_${stamp}`,
        },
      },
    })
    const signature = new Stripe(secretKey).webhooks.generateTestHeaderString({ payload, secret: webhookSecret })
    const hook = await call('POST', '/payments/stripe/webhook', { raw: payload, headers: { 'stripe-signature': signature } })
    const again = await call('POST', '/payments/stripe/webhook', { raw: payload, headers: { 'stripe-signature': signature } })
    const after = (await call('GET', `/repairs/${repair.folio}`, { token: client })).data?.repair
    const [[{ pagados }]] = await pool.query("SELECT COUNT(*) AS pagados FROM pagos WHERE id_solicitud = ? AND tipo = 'pago_final' AND estado = 'pagado'", [repair.id_solicitud])
    record(
      8,
      'Webhook de Stripe: firma verificada, pago confirmado una sola vez',
      unsigned.status === 400 && hook.status === 200 && again.status === 200 && after?.estado === 'Listo para entrega' && Number(pagados) === 1,
      `firma inválida ${unsigned.status} · estado: ${after?.estado} · pagos finales confirmados: ${pagados}`,
    )
  }

  // ---------- 9. Registro con consentimiento y verificación de correo ----------
  const vEmail = `verificar.${stamp}@protec.app`
  const base = { nombre: 'Elena', apellidos: 'Verifica Correo', correo: vEmail, telefono: '55 7777 8888', password: 'ClaveSegura123' }
  const noTerms = await call('POST', '/auth/register', { body: base })
  const reg = await call('POST', '/auth/register', { body: { ...base, aceptaTerminos: true } })
  const [[vu]] = await pool.query('SELECT id_usuario, correo_verificado, acepto_terminos_en FROM usuarios WHERE correo = ?', [vEmail])
  const blocked = await call('POST', '/auth/login', { body: { correo: vEmail, password: 'ClaveSegura123' } })
  const resend = await call('POST', '/auth/resend-verification', { body: { correo: vEmail } })
  const [[{ pendientes }]] = await pool.query('SELECT COUNT(*) AS pendientes FROM verificaciones_correo WHERE id_usuario = ? AND usado_en IS NULL', [vu.id_usuario])
  // El enlace real llega por correo; la prueba crea uno equivalente para simular el clic.
  const vToken = crypto.randomBytes(32).toString('hex')
  await pool.query('INSERT INTO verificaciones_correo (id_usuario, token_hash, expira) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))', [vu.id_usuario, sha256(vToken)])
  const verified = await call('POST', '/auth/verify-email', { body: { token: vToken } })
  const reused = await call('POST', '/auth/verify-email', { body: { token: vToken } })
  const allowed = await call('POST', '/auth/login', { body: { correo: vEmail, password: 'ClaveSegura123' } })
  record(
    9,
    'Registro exige aceptar términos y confirmar el correo antes de iniciar sesión',
    noTerms.status === 422 && reg.status === 201 && reg.data?.verificationRequired && !vu.correo_verificado && vu.acepto_terminos_en &&
      blocked.status === 403 && blocked.data?.code === 'EMAIL_NOT_VERIFIED' && resend.status === 200 && Number(pendientes) === 1 &&
      verified.status === 200 && reused.status === 400 && allowed.status === 200,
    `sin términos ${noTerms.status} · login sin verificar ${blocked.status} (${blocked.data?.code}) · verificado ${verified.status} · enlace reutilizado ${reused.status} · login ${allowed.status}`,
  )

  const passed = results.filter((r) => r.ok).length
  console.log(`\n${passed}/${results.length} pruebas superadas.`)
  return passed === results.length
}

run()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Error ejecutando las pruebas:', err.message)
    process.exit(1)
  })
  .finally(() => pool.end())
