/**
 * Pruebas de humo del flujo completo (PROMPT 2 · sección 39).
 * Requiere el backend en ejecución:  npm run dev   y luego:  npm run test:flow
 *
 * Usa solo la API pública; no modifica las cuentas demo salvo crear solicitudes nuevas.
 */
import 'dotenv/config'
import { pool } from '../src/config/db.js'

const BASE = process.env.SMOKE_API_URL || `http://localhost:${process.env.PORT || 4000}/api`
// PNG 1x1 válido (los bytes mágicos se verifican en el servidor).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const results = []
const record = (n, name, ok, detail = '') => {
  results.push({ n, name, ok })
  console.log(`${ok ? '✔' : '✘'} PRUEBA ${n}: ${name}${detail ? ` — ${detail}` : ''}`)
}

async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

async function run() {
  const email = `prueba.${Date.now()}@protec.app`
  const password = 'ClaveSegura123'

  // 1. Registro
  const reg = await call('POST', '/auth/register', {
    body: { nombre: 'Laura', apellidos: 'Pruebas Gómez', correo: email, telefono: '55 9876 5432', password, aceptaTerminos: true },
  })
  // El enlace de verificación llega por correo; la prueba confirma la cuenta directamente (ver test:accounts).
  await pool.query('UPDATE usuarios SET correo_verificado = 1 WHERE correo = ?', [email])
  record(1, 'Registrar usuario nuevo', reg.status === 201, reg.data?.message)

  // 2. Correo duplicado
  const dup = await call('POST', '/auth/register', {
    body: { nombre: 'Laura', apellidos: 'Pruebas Gómez', correo: email, telefono: '55 9876 5432', password, aceptaTerminos: true },
  })
  record(2, 'Correo duplicado rechazado', dup.status === 409, dup.data?.errors?.correo || dup.data?.message)

  // 3. Login correcto
  const login = await call('POST', '/auth/login', { body: { correo: email, password } })
  const token = login.data?.token
  const me = token ? await call('GET', '/auth/me', { token }) : { status: 0 }
  record(3, 'Login con credenciales correctas', login.status === 200 && me.status === 200, me.data?.user?.correo)

  // 4. Login incorrecto
  const bad = await call('POST', '/auth/login', { body: { correo: email, password: 'incorrecta123' } })
  const noToken = await call('GET', '/repairs')
  record(4, 'Contraseña incorrecta rechazada', bad.status === 401 && !bad.data?.token && noToken.status === 401, bad.data?.message)

  // 6a. Subir fotografía (antes de crear la solicitud, como en el wizard)
  const form = new FormData()
  form.append('file', new Blob([PNG_1X1], { type: 'image/png' }), 'pantalla.png')
  const up = await call('POST', '/uploads', { token, form })
  const evidenceToken = up.data?.evidence?.token

  // 5. Crear solicitud
  const created = await call('POST', '/repairs', {
    token,
    body: {
      tipo: 'laptop',
      marca: 'Lenovo',
      modelo: 'IdeaPad 3',
      categoria: 'Pantalla',
      descripcion: 'Enciende y se escucha el ventilador, pero la pantalla permanece completamente negra.',
      metodoContacto: 'chat',
      evidencias: evidenceToken ? [evidenceToken] : [],
    },
  })
  const folio = created.data?.repair?.folio
  record(5, 'Crear solicitud con folio', created.status === 201 && /^PRO-\d{4}-\d{5}$/.test(folio ?? ''), folio)

  // 6b. Imagen asociada y visible
  const detail = await call('GET', `/repairs/${folio}`, { token })
  const imgUrl = detail.data?.repair?.evidencias?.[0]?.url
  const img = imgUrl ? await fetch(imgUrl) : null
  record(
    6,
    'Fotografía asociada y visible',
    up.status === 201 && Boolean(imgUrl) && img?.ok && img.headers.get('content-type')?.startsWith('image/'),
    imgUrl,
  )

  // 7. Diagnóstico: el chatbot responde con preguntas de sus reglas
  let answers = []
  let step = await call('POST', `/diagnostics/${folio}/answer`, { token, body: { answers } })
  const firstQuestion = step.data?.question?.text
  record(7, 'Chatbot responde según reglas', step.status === 200 && step.data?.status === 'question', firstQuestion)

  // 8. Finalizar diagnóstico (se responde la primera opción de cada pregunta)
  for (let i = 0; i < 15 && step.data?.status !== 'result'; i += 1) {
    const option = step.data?.question?.options?.[0]?.label
    if (!option) break
    answers = [...answers.slice(0, step.data.validCount ?? answers.length), option]
    step = await call('POST', `/diagnostics/${folio}/answer`, { token, body: { answers } })
  }
  const after = await call('GET', `/repairs/${folio}`, { token })
  const saved = after.data?.repair
  record(
    8,
    'Diagnóstico almacenado y estado actualizado',
    step.data?.status === 'result' && Boolean(saved?.diagnostico) && saved?.estado !== 'Solicitud registrada',
    `${saved?.estado} · requiere técnico: ${saved?.requiereTecnico ? 'sí' : 'no'}`,
  )

  // 9. Mis reparaciones: solo las propias
  const mine = await call('GET', '/repairs', { token })
  const list = mine.data?.repairs ?? []
  record(9, 'Mis reparaciones solo del usuario', mine.status === 200 && list.length === 1 && list[0].folio === folio, `${list.length} solicitud(es)`)

  // 10. Acceso a solicitud de otro usuario
  const other = await call('POST', '/auth/login', { body: { correo: 'otro@protec.app', password: 'Protec2026!' } })
  const otherToken = other.data?.token
  const steal = await call('GET', `/repairs/${folio}`, { token: otherToken })
  const stealDx = await call('GET', `/diagnostics/${folio}`, { token: otherToken })
  const publicView = await call('GET', `/repairs/${folio}/tracking`)
  const leaks = JSON.stringify(publicView.data ?? {}).match(/descripcion|correo|telefono|evidencias|url/i)
  record(
    10,
    'Acceso a solicitud ajena rechazado',
    Boolean(otherToken) && [403, 404].includes(steal.status) && [403, 404].includes(stealDx.status) && !leaks,
    `detalle: ${steal.status}, diagnóstico: ${stealDx.status}, seguimiento público sin datos privados: ${!leaks}`,
  )

  const passed = results.filter((r) => r.ok).length
  console.log(`\n${passed}/${results.length} pruebas superadas.`)
  await pool.end()
  process.exit(passed === results.length ? 0 : 1)
}

run().catch((err) => {
  console.error('Error ejecutando las pruebas:', err.message)
  process.exit(1)
})
