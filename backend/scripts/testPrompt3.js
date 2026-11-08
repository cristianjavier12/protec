/**
 * Pruebas funcionales obligatorias del PROMPT 3 (sección 51).
 * Recorre el flujo completo: solicitud -> chatbot -> técnico -> chat en tiempo real ->
 * presupuesto -> anticipo -> recolección -> reparación -> pago final -> entrega -> calificación,
 * y verifica las restricciones de acceso.
 *
 * Requisitos: backend en ejecución (npm run dev) y datos demo (npm run db:seed).
 * Ejecutar:   npm run test:prompt3
 */
import 'dotenv/config'
import { io } from 'socket.io-client'
import { pool } from '../src/config/db.js'

const PORT = process.env.PORT || 4000
const BASE = process.env.SMOKE_API_URL || `http://localhost:${PORT}/api`
const SOCKET_URL = BASE.replace(/\/api\/?$/, '')
const DEMO_PASSWORD = 'Protec2026!' // solo cuentas de desarrollo creadas por seed.js
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const results = []
const record = (n, name, ok, detail = '') => {
  results.push({ n, name, ok: Boolean(ok) })
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

const login = async (correo, password = DEMO_PASSWORD) => (await call('POST', '/auth/login', { body: { correo, password } })).data?.token

async function upload(token, name) {
  const form = new FormData()
  form.append('file', new Blob([PNG_1X1], { type: 'image/png' }), name)
  return (await call('POST', '/uploads', { token, form })).data?.evidence?.token
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'], reconnection: false })
    socket.once('connect', () => resolve(socket))
    socket.once('connect_error', (err) => reject(err))
  })
}

const emitAck = (socket, event, payload, timeout = 4000) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, message: 'timeout' }), timeout)
    socket.emit(event, payload, (res) => {
      clearTimeout(timer)
      resolve(res)
    })
  })

const waitFor = (socket, event, predicate = () => true, timeout = 4000) =>
  new Promise((resolve) => {
    const handler = (data) => {
      if (!predicate(data)) return
      clearTimeout(timer)
      socket.off(event, handler)
      resolve(data)
    }
    const timer = setTimeout(() => {
      socket.off(event, handler)
      resolve(null)
    }, timeout)
    socket.on(event, handler)
  })

const today = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

async function run() {
  const sockets = []
  try {
    // ---------- Preparación ----------
    const email = `flujo.${Date.now()}@protec.app`
    const password = 'ClaveSegura123'
    await call('POST', '/auth/register', {
      body: { nombre: 'Sofía', apellidos: 'Flujo Completo', correo: email, telefono: '55 1111 2222', password, aceptaTerminos: true },
    })
    await pool.query('UPDATE usuarios SET correo_verificado = 1 WHERE correo = ?', [email]) // ver test:accounts
    const user = await login(email, password)
    const tech = await login('tecnico2@protec.app') // especialidad: laptops y computadoras
    const otherTech = await login('tecnico@protec.app') // especialidad: celulares
    const otherUser = await login('otro@protec.app')
    const admin = await login('admin@protec.app')
    if (!user || !tech || !otherTech || !otherUser || !admin) throw new Error('No fue posible iniciar sesión con las cuentas demo. ¿Ejecutaste npm run db:seed?')
    await call('PATCH', '/technician/availability', { token: tech, body: { disponible: true } })

    // ---------- PRUEBA 1: solicitud + chatbot determina técnico ----------
    const photo = await upload(user, 'laptop.png')
    const created = await call('POST', '/repairs', {
      token: user,
      body: {
        tipo: 'laptop',
        marca: 'HP',
        modelo: 'Pavilion 15',
        categoria: 'Pantalla',
        descripcion: 'La laptop enciende y se escuchan los ventiladores, pero no muestra imagen en la pantalla.',
        metodoContacto: 'chat',
        solicitaRecoleccion: true,
        evidencias: photo ? [photo] : [],
      },
    })
    const folio = created.data?.repair?.folio
    let answers = []
    let step = await call('POST', `/diagnostics/${folio}/answer`, { token: user, body: { answers } })
    for (let i = 0; i < 15 && step.data?.status !== 'result'; i += 1) {
      const option = step.data?.question?.options?.at(-1)?.label ?? step.data?.question?.options?.[0]?.label
      if (!option) break
      answers = [...answers.slice(0, step.data.validCount ?? answers.length), option]
      step = await call('POST', `/diagnostics/${folio}/answer`, { token: user, body: { answers } })
    }
    if (step.data?.status === 'result' && !step.data?.result?.requiresTechnician) {
      // Si sugirió una solución sencilla, el usuario indica que no funcionó y se escala.
      await call('POST', `/diagnostics/${folio}/resolution`, { token: user, body: { resolved: false } })
    }
    let detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    const escalated = detail?.requiereTecnico && detail?.historial?.some((h) => h.estado === 'Pendiente de técnico')
    record(1, 'Chatbot determina técnico requerido → Pendiente de técnico', escalated, `${folio} · historial incluye "Pendiente de técnico"`)

    // ---------- PRUEBA 2: asignación automática ----------
    const notes = (await call('GET', '/notifications', { token: user })).data?.notifications ?? []
    record(
      2,
      'Sistema asigna técnico y notifica al usuario',
      detail?.estado === 'Técnico asignado' && detail?.tecnicoPerfil?.nombre && !('correo' in (detail?.tecnicoPerfil ?? {})) && notes.some((n) => n.titulo === 'Técnico asignado'),
      `${detail?.estado} · ${detail?.tecnicoPerfil?.nombre} (${detail?.tecnicoPerfil?.especialidad})`,
    )

    // ---------- PRUEBA 3: chat en tiempo real ----------
    const userSocket = await connect(user)
    const techSocket = await connect(tech)
    sockets.push(userSocket, techSocket)
    const joinU = await emitAck(userSocket, 'chat:join', { folio })
    const joinT = await emitAck(techSocket, 'chat:join', { folio })
    const techGets = waitFor(techSocket, 'chat:message', (d) => d.message?.mensaje === 'Hola, ¿cuándo podrían revisarla?')
    const sent = await emitAck(userSocket, 'chat:message', { folio, mensaje: 'Hola, ¿cuándo podrían revisarla?' })
    const received = await techGets
    const userGets = waitFor(userSocket, 'chat:message', (d) => d.message?.mensaje === 'Hoy mismo la revisamos.')
    await emitAck(techSocket, 'chat:message', { folio, mensaje: 'Hoy mismo la revisamos.' })
    const reply = await userGets
    const history = (await call('GET', `/repairs/${folio}/messages`, { token: user })).data?.mensajes ?? []
    record(3, 'Usuario y técnico intercambian mensajes en tiempo real', joinU?.ok && joinT?.ok && sent?.ok && received && reply && history.length === 2, `${history.length} mensajes persistidos`)

    // ---------- PRUEBA 4: presupuesto ----------
    await call('POST', `/technician/repairs/${folio}/diagnosis`, {
      token: tech,
      body: { diagnostico: 'Falla en el cable flex de video; se requiere reemplazo.', costoEstimado: 2000, tiempoEstimado: '3 días' },
    })
    const budget = await call('POST', `/technician/repairs/${folio}/budget`, {
      token: tech,
      body: { diagnostico: 'Reemplazo del cable flex de video y pruebas de imagen.', manoObra: 1200, costoPiezas: 800, tiempoEstimado: '3 días' },
    })
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    record(
      4,
      'Técnico genera presupuesto y el usuario lo consulta',
      budget.status === 201 && detail?.presupuesto?.costoTotal === 2000 && detail?.presupuesto?.anticipoRequerido === 1000 && detail?.acciones?.respondBudget,
      `total $${detail?.presupuesto?.costoTotal} · anticipo $${detail?.presupuesto?.anticipoRequerido}`,
    )

    // ---------- PRUEBA 5: aceptar presupuesto ----------
    const accept = await call('POST', `/repairs/${folio}/budget/respond`, { token: user, body: { accept: true } })
    detail = accept.data?.repair
    record(5, 'Usuario acepta presupuesto → se habilita anticipo', detail?.estado === 'Pendiente de anticipo' && detail?.acciones?.payDeposit, detail?.estado)

    // ---------- PRUEBA 6: anticipo (pago recibido en sucursal; con Stripe ver PRUEBA 23) ----------
    const online = await call('POST', `/repairs/${folio}/payments/checkout`, { token: user, body: { tipo: 'anticipo' } })
    const pay = await call('POST', `/admin/repairs/${folio}/payments`, {
      token: admin,
      body: { tipo: 'anticipo', metodo: 'Transferencia', referencia: 'SPEI 4242424242424242' },
    })
    const payments = (await call('GET', `/repairs/${folio}/payments`, { token: user })).data
    const userCantSelfConfirm = await call('POST', `/admin/repairs/${folio}/payments`, { token: user, body: { tipo: 'pago_final', metodo: 'Efectivo' } })
    record(
      6,
      'Anticipo registrado correctamente',
      pay.status === 201 && payments?.resumenPagos?.anticipoPagado === 1000 && payments?.pagos?.some((p) => p.estado === 'pagado') && userCantSelfConfirm.status === 403,
      `estado: ${pay.data?.repair?.estado} · pago en línea: ${online.status === 201 ? 'Stripe disponible' : `no configurado (${online.status})`} · el cliente no puede autoconfirmar: ${userCantSelfConfirm.status}`,
    )

    // Logística de recolección (sin GPS): programar y avanzar hasta "Equipo recibido"
    await call('POST', `/repairs/${folio}/pickup`, {
      token: user,
      body: { direccion: 'Calle Reforma 100, Col. Centro, CDMX', referencias: 'Portón negro', fechaPreferida: today(), horario: '12:00 - 15:00' },
    })
    let techDetail = (await call('GET', `/technician/repairs/${folio}`, { token: tech })).data?.repair
    const pickupId = techDetail?.logistica?.find((l) => l.tipo === 'recoleccion')?.id
    for (const estado of ['Repartidor en camino', 'Dispositivo recogido', 'Entregado al técnico']) {
      await call('PATCH', `/technician/repairs/${folio}/logistics/${pickupId}/status`, { token: tech, body: { estado } })
    }

    // ---------- PRUEBA 7: En reparación sin perder historial ----------
    const before = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    await call('PATCH', `/technician/repairs/${folio}/status`, { token: tech, body: { estado: 'En revisión' } })
    const liveNote = waitFor(userSocket, 'notification:new', (n) => n.titulo?.includes('En reparación'))
    await call('PATCH', `/technician/repairs/${folio}/status`, {
      token: tech,
      body: { estado: 'En reparación', comentario: 'Se reemplazará el cable flex dañado.' },
    })
    const realtime = await liveNote
    const jump = await call('PATCH', `/technician/repairs/${folio}/status`, { token: tech, body: { estado: 'Finalizado' } })
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    record(
      7,
      'Técnico actualiza a En reparación; el usuario lo ve sin perder historial',
      before?.estado === 'Equipo recibido' &&
        detail?.estado === 'En reparación' &&
        detail.historial.length > before.historial.length &&
        detail.historial[0].estado === 'Solicitud registrada' &&
        detail.historial.some((h) => h.descripcion === 'Se reemplazará el cable flex dañado.') &&
        realtime &&
        jump.status === 400,
      `${detail?.historial?.length} eventos · notificación en tiempo real: ${Boolean(realtime)} · salto a Finalizado rechazado: ${jump.status}`,
    )

    // ---------- PRUEBA 8: evidencia del técnico ----------
    const techPhoto = await upload(tech, 'reparacion.png')
    await call('POST', `/technician/repairs/${folio}/evidences`, { token: tech, body: { evidencias: [techPhoto], tipoEvidencia: 'reparacion', descripcion: 'Equipo abierto' } })
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    const techEvidence = detail?.evidencias?.find((e) => e.tipoEvidencia === 'reparacion')
    const img = techEvidence ? await fetch(techEvidence.url) : null
    record(8, 'Técnico sube evidencia y el usuario la visualiza', techEvidence && img?.ok, techEvidence?.url)

    // ---------- PRUEBA 9: pieza registrada ----------
    await call('POST', `/technician/repairs/${folio}/parts`, {
      token: tech,
      body: { nombre: 'Cable flex de video', marca: 'HP', numeroSerie: 'FLX-239494', codigoQr: 'PROTEC-PZ-TEST', costo: 800, tipo: 'original' },
    })
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    const part = detail?.piezas?.[0]
    record(9, 'Técnico registra pieza y aparece en trazabilidad', part?.nombre === 'Cable flex de video' && part?.verificada && part?.numeroSerie === 'FLX-239494', `${part?.nombre} · ${part?.tipo} · verificada en PROTEC`)

    // ---------- PRUEBA 10: reparación terminada y saldo pendiente ----------
    const noSummary = await call('PATCH', `/technician/repairs/${folio}/status`, { token: tech, body: { estado: 'Reparación terminada' } })
    await call('PATCH', `/technician/repairs/${folio}/status`, {
      token: tech,
      body: { estado: 'Reparación terminada', resumenReparacion: 'Se reemplazó el cable flex de video y se realizaron pruebas de funcionamiento.' },
    })
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    record(
      10,
      'Técnico finaliza reparación → se calcula saldo pendiente',
      noSummary.status === 422 && detail?.estado === 'Reparación terminada' && detail?.resumenPagos?.saldoPendiente === 1000 && detail?.acciones?.payFinal,
      `saldo pendiente $${detail?.resumenPagos?.saldoPendiente} · resumen obligatorio: ${noSummary.status === 422}`,
    )

    // ---------- PRUEBA 11: pago final ----------
    const finalPay = await call('POST', `/admin/repairs/${folio}/payments`, { token: admin, body: { tipo: 'pago_final', metodo: 'Efectivo' } })
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    record(11, 'Usuario registra pago final → Listo para entrega', finalPay.status === 201 && detail?.estado === 'Listo para entrega' && detail?.resumenPagos?.saldoPendiente === 0, detail?.estado)

    // ---------- PRUEBA 12: entrega completada ----------
    await call('POST', `/repairs/${folio}/delivery`, {
      token: user,
      body: { metodo: 'domicilio', direccion: 'Calle Reforma 100, Col. Centro, CDMX', fechaPreferida: today(), horario: '15:00 - 18:00' },
    })
    techDetail = (await call('GET', `/technician/repairs/${folio}`, { token: tech })).data?.repair
    const deliveryId = techDetail?.logistica?.find((l) => l.tipo === 'entrega')?.id
    for (const estado of ['En camino', 'Dispositivo entregado']) {
      await call('PATCH', `/technician/repairs/${folio}/logistics/${deliveryId}/status`, { token: tech, body: { estado } })
    }
    detail = (await call('GET', `/repairs/${folio}`, { token: user })).data?.repair
    record(12, 'Entrega completada → Finalizado', detail?.estado === 'Finalizado' && Boolean(detail?.fechaFinalizacion), `${detail?.estado} · ${detail?.fechaFinalizacion}`)

    // ---------- PRUEBA 13: calificación ----------
    const rate = await call('POST', `/repairs/${folio}/rating`, { token: user, body: { puntuacion: 5, comentario: 'Excelente servicio.' } })
    const dupRate = await call('POST', `/repairs/${folio}/rating`, { token: user, body: { puntuacion: 4 } })
    record(13, 'Usuario califica al técnico y se almacena', rate.status === 201 && rate.data?.repair?.calificacion?.puntuacion === 5 && dupRate.status === 409, `promedio técnico: ${rate.data?.repair?.tecnicoPerfil?.calificacion}`)

    // ---------- PRUEBA 14: reparación ajena ----------
    const otherSocket = await connect(otherUser)
    sockets.push(otherSocket)
    const steal = await call('GET', `/repairs/${folio}`, { token: otherUser })
    const stealChat = await call('GET', `/repairs/${folio}/messages`, { token: otherUser })
    const stealJoin = await emitAck(otherSocket, 'chat:join', { folio })
    const stealPay = await call('POST', `/repairs/${folio}/payments/checkout`, { token: otherUser, body: { tipo: 'pago_final' } })
    record(
      14,
      'Usuario intenta acceder a reparación ajena → acceso denegado',
      steal.status === 403 && stealChat.status === 403 && stealJoin?.ok === false && stealPay.status === 403,
      `detalle ${steal.status} · chat REST ${stealChat.status} · chat Socket.IO ${stealJoin?.ok === false ? 'denegado' : 'PERMITIDO'} · pago ${stealPay.status}`,
    )

    // ---------- PRUEBA 15: /admin ----------
    const asUser = await call('GET', '/admin/dashboard', { token: user })
    const asTech = await call('GET', '/admin/dashboard', { token: tech })
    const asAdmin = await call('GET', '/admin/dashboard', { token: admin })
    record(
      15,
      'Usuario intenta entrar a /admin → acceso denegado',
      asUser.status === 403 && asTech.status === 403 && asAdmin.status === 200 && asAdmin.data?.ingresos?.total >= 2000,
      `usuario ${asUser.status} · técnico ${asTech.status} · admin ${asAdmin.status} (ingresos $${asAdmin.data?.ingresos?.total})`,
    )

    // ---------- PRUEBA 16: técnico no asignado ----------
    const foreignDetail = await call('GET', `/technician/repairs/${folio}`, { token: otherTech })
    const foreignStatus = await call('PATCH', `/technician/repairs/${folio}/status`, { token: otherTech, body: { estado: 'En revisión' } })
    const foreignPart = await call('POST', `/technician/repairs/${folio}/parts`, { token: otherTech, body: { nombre: 'Pieza ajena' } })
    const userAsTech = await call('GET', '/technician/dashboard', { token: user })
    record(
      16,
      'Técnico intenta modificar solicitud no asignada → acceso denegado',
      foreignDetail.status === 403 && foreignStatus.status === 403 && foreignPart.status === 403 && userAsTech.status === 403,
      `detalle ${foreignDetail.status} · estado ${foreignStatus.status} · pieza ${foreignPart.status} · usuario en panel técnico ${userAsTech.status}`,
    )
  } finally {
    sockets.forEach((s) => s.disconnect())
    await pool.end()
  }

  const passed = results.filter((r) => r.ok).length
  console.log(`\n${passed}/${results.length} pruebas superadas.`)
  process.exit(passed === results.length ? 0 : 1)
}

run().catch((err) => {
  console.error('Error ejecutando las pruebas:', err.message)
  process.exit(1)
})
