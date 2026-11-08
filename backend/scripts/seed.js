/**
 * Datos de demostración para desarrollo.  npm run db:seed
 * Es idempotente: si los usuarios ya existen no se duplican.
 * La aplicación funciona igual sin estos datos.
 *
 * Cuentas (contraseña para todas: Protec2026!)
 *   cliente@protec.app  (usuario)
 *   otro@protec.app     (usuario, para probar que no se ven solicitudes ajenas)
 *   tecnico@protec.app  (tecnico — especialidad: celulares)
 *   tecnico2@protec.app (tecnico — especialidad: laptops_computadoras)
 *   admin@protec.app    (admin)
 */
import bcrypt from 'bcrypt'
import { pool, query, withTransaction } from '../src/config/db.js'
import { deviceModel } from '../src/models/deviceModel.js'
import { diagnosisModel } from '../src/models/diagnosisModel.js'
import { evidenceModel } from '../src/models/evidenceModel.js'
import { repairModel } from '../src/models/repairModel.js'
import { statusHistoryModel } from '../src/models/statusHistoryModel.js'
import { userModel } from '../src/models/userModel.js'
import { technicianModel } from '../src/models/technicianModel.js'
import { generateFolio } from '../src/services/folioService.js'
import { REPAIR_STATUS as S } from '../src/utils/constants.js'

const PASSWORD = 'Protec2026!'

const USERS = [
  { nombre: 'Ana', apellidos: 'Martínez López', correo: 'cliente@protec.app', telefono: '55 1234 5678', rol: 'usuario' },
  { nombre: 'Luis', apellidos: 'Ramírez Soto', correo: 'otro@protec.app', telefono: '55 8765 4321', rol: 'usuario' },
  { nombre: 'Carlos', apellidos: 'Mendoza Ruiz', correo: 'tecnico@protec.app', telefono: '55 2222 3333', rol: 'tecnico' },
  { nombre: 'María', apellidos: 'García Torres', correo: 'tecnico2@protec.app', telefono: '55 4444 5555', rol: 'tecnico' },
  { nombre: 'Admin', apellidos: 'PROTEC', correo: 'admin@protec.app', telefono: '55 0000 0000', rol: 'admin' },
]

const TECHNICIANS = [
  { correo: 'tecnico@protec.app', especialidad: 'celulares' },
  { correo: 'tecnico2@protec.app', especialidad: 'laptops_computadoras' },
]

const SAMPLE_IMAGE = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'

async function ensureUser(u, passwordHash) {
  const existing = await userModel.findByEmailWithPassword(u.correo)
  if (existing) return { id: existing.id_usuario, created: false }
  const id = await userModel.create({ ...u, passwordHash, correoVerificado: true, aceptoTerminos: true })
  return { id, created: true }
}

async function ensureTechnician(userId, especialidad) {
  const existing = await technicianModel.findByUserId(userId)
  if (existing) return false
  await technicianModel.create({ userId, especialidad })
  return true
}

async function createRepair({ userId, device, descripcion, categoria, history, tecnicoId, diagnostico, prioridad, conImagen, extras }) {
  return withTransaction(async (conn) => {
    const deviceId =
      (await deviceModel.findMatching(userId, device, conn))?.id_dispositivo ?? (await deviceModel.create(userId, device, conn))
    const folio = await generateFolio(conn)
    const finalStatus = history[history.length - 1][0]
    const id = await repairModel.create(
      {
        folio,
        userId,
        deviceId,
        descripcion,
        categoria,
        estado: finalStatus,
        requiereTecnico: Boolean(diagnostico?.requiresTechnician),
        metodoContacto: 'chat',
        solicitaRecoleccion: true,
      },
      conn,
    )
    if (tecnicoId) await conn.query('UPDATE solicitudes SET id_tecnico = ?, costo_estimado = ? WHERE id_solicitud = ?', [tecnicoId, 1450, id])
    if (diagnostico) {
      const summary = `Posible problema: ${diagnostico.problem}\nRecomendación: ${diagnostico.recommendation}\nNivel de atención: ${diagnostico.attention}\nRequiere técnico: ${diagnostico.requiresTechnician ? 'Sí' : 'No'}`
      await diagnosisModel.create(id, { tipo: 'chatbot', resultado: summary, detalle: { version: 1, ruleId: diagnostico.ruleId, result: diagnostico, transcript: [] } }, conn)
      await repairModel.updateStatus(id, { estado: finalStatus, diagnosticoInicial: summary, prioridad, requiereTecnico: diagnostico.requiresTechnician }, conn)
    }
    if (conImagen) await evidenceModel.create(id, { url: SAMPLE_IMAGE, publicId: `seed/sample-${folio}`, descripcion: 'Fotografía de ejemplo' }, conn)

    // Historial con fechas escalonadas hacia el pasado
    const base = Date.now() - history.length * 26 * 3600 * 1000
    for (const [i, [estado, nota]] of history.entries()) {
      await statusHistoryModel.add(id, estado, nota, conn)
      const fecha = new Date(base + i * 26 * 3600 * 1000)
      await conn.query(
        'UPDATE historial_estados SET fecha = ? WHERE id_solicitud = ? ORDER BY id_historial DESC LIMIT 1',
        [fecha, id],
      )
    }
    await conn.query('UPDATE solicitudes SET fecha_creacion = ? WHERE id_solicitud = ?', [new Date(base), id])
    if (extras) await extras(conn, id)
    return folio
  })
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Los datos de ejemplo no se cargan en producción. Usa npm run admin:create.')
  const passwordHash = await bcrypt.hash(PASSWORD, 12)
  const ids = {}
  for (const u of USERS) {
    const { id, created } = await ensureUser(u, passwordHash)
    ids[u.correo] = id
    console.log(`${created ? '[+]' : '[=]'} ${u.rol.padEnd(8)} ${u.correo}`)
  }

  // Crear perfiles de técnico
  for (const t of TECHNICIANS) {
    const created = await ensureTechnician(ids[t.correo], t.especialidad)
    console.log(`${created ? '[+]' : '[=]'} técnico  ${t.correo} → ${t.especialidad}`)
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM solicitudes WHERE id_usuario = ?', [ids['cliente@protec.app']])
  if (Number(total) > 0) {
    console.log('[=] El usuario de demostración ya tiene solicitudes; no se crean nuevas.')
    return
  }

  const cliente = ids['cliente@protec.app']
  const tecnico = ids['tecnico@protec.app']
  const tecnico2 = ids['tecnico2@protec.app']
  const created = []

  // Reparación 1: laptop en reparación (asignada a técnico 2)
  created.push(
    await createRepair({
      userId: cliente,
      device: { tipo: 'laptop', marca: 'Lenovo', modelo: 'IdeaPad 5 14"', numeroSerie: 'PF3K9X21' },
      descripcion: 'La laptop enciende, se escucha el ventilador, pero la pantalla permanece negra.',
      categoria: 'Pantalla',
      tecnicoId: tecnico2,
      prioridad: 'media',
      conImagen: true,
      diagnostico: {
        ruleId: 'laptop-sin-imagen',
        title: 'Enciende sin imagen',
        problem: 'Falla relacionada con el sistema de video, la pantalla, la memoria o una conexión interna.',
        recommendation: 'Se recomienda una revisión física del dispositivo.',
        attention: 'Técnico requerido',
        priority: 'media',
        requiresTechnician: true,
        selfFixSteps: null,
        tips: [],
      },
      history: [
        [S.REGISTERED, 'Solicitud creada desde la plataforma con 1 fotografía.'],
        [S.DIAGNOSIS, 'Diagnóstico preliminar del asistente: falla del sistema de video o pantalla.'],
        [S.PENDING_TECH, 'El caso requiere revisión de un técnico. En espera de asignación.'],
        [S.TECH_ASSIGNED, 'Se asignó a María García Torres, especialista en laptops y computadoras.'],
        ['Presupuesto enviado', 'Total $1,450.00 · Anticipo requerido (50 %) $725.00.'],
        [S.PENDING_DEPOSIT, 'Presupuesto aceptado ($1,450.00). Anticipo requerido: $725.00.'],
        ['Anticipo registrado', 'Anticipo de $725.00 · Pago con tarjeta (Stripe).'],
        [S.PICKUP_PENDING, 'Programa la recolección de tu dispositivo.'],
        [S.PICKUP_SCHEDULED, 'Recolección programada.'],
        [S.DEVICE_RECEIVED, 'Recolección completada: el dispositivo fue entregado al técnico.'],
        [S.IN_REVIEW, 'El técnico está revisando el equipo.'],
        [S.IN_REPAIR, 'Se reemplazará el cable flex de video dañado.'],
      ],
      extras: async (conn, id) => {
        await conn.query(
          `INSERT INTO diagnosticos (id_solicitud, tipo, resultado) VALUES (?, 'tecnico', ?)`,
          [id, 'Cable flex de video dañado por desgaste en la bisagra. Se requiere reemplazo.'],
        )
        await conn.query(
          `UPDATE solicitudes SET diagnostico_final = ?, costo_estimado = 1450, tiempo_estimado = '3 días' WHERE id_solicitud = ?`,
          ['Cable flex de video dañado por desgaste en la bisagra. Se requiere reemplazo.', id],
        )
        await conn.query(
          `INSERT INTO presupuestos (id_solicitud, diagnostico, mano_obra, costo_piezas, costo_total, anticipo_requerido, tiempo_estimado, estado)
           VALUES (?, ?, 650, 800, 1450, 725, '3 días', 'Aceptado')`,
          [id, 'Reemplazo del cable flex de video y pruebas de imagen.'],
        )
        await conn.query(
          `INSERT INTO pagos (id_solicitud, tipo, monto, estado, metodo, referencia) VALUES (?, 'anticipo', 725, 'pagado', 'Tarjeta', 'Stripe pi_ejemplo_seed01')`,
          [id],
        )
        await conn.query(
          `INSERT INTO logistica (id_solicitud, tipo, direccion, referencias, horario, fecha_programada, fecha_real, estado)
           VALUES (?, 'recoleccion', 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX', 'Edificio azul, timbre 3B', '9:00 - 12:00', CURDATE(), NOW(), 'Entregado al técnico')`,
          [id],
        )
        await conn.query(
          `INSERT INTO piezas (id_solicitud, nombre, marca, numero_serie, codigo_qr, costo, tipo, verificada)
           VALUES (?, 'Cable flex de video', 'Lenovo', 'FLX-5C10S29', 'PROTEC-PZ-0001', 800, 'original', 1)`,
          [id],
        )
      },
    }),
  )

  // Reparación 2: celular pendiente de técnico
  created.push(
    await createRepair({
      userId: cliente,
      device: { tipo: 'celular', marca: 'Samsung', modelo: 'Galaxy S21', numeroSerie: null },
      descripcion: 'El celular no carga aunque lo conecte toda la noche, a veces no muestra nada.',
      categoria: 'Carga',
      prioridad: 'media',
      diagnostico: {
        ruleId: 'celular-carga',
        title: 'Problema de carga',
        problem: 'Posible falla en el puerto, la batería o el circuito de carga.',
        recommendation: 'Se recomienda revisión técnica del puerto, batería o circuito de carga.',
        attention: 'Técnico requerido',
        priority: 'media',
        requiresTechnician: true,
        selfFixSteps: null,
        tips: [],
      },
      history: [
        [S.REGISTERED, 'Solicitud creada desde la plataforma.'],
        [S.DIAGNOSIS, 'Diagnóstico preliminar del asistente: posible falla del circuito de carga.'],
        [S.PENDING_TECH, 'El caso requiere revisión de un técnico. En espera de asignación.'],
      ],
    }),
  )

  // Reparación 3: computadora finalizada
  created.push(
    await createRepair({
      userId: cliente,
      device: { tipo: 'computadora', marca: 'HP', modelo: 'Pavilion Desktop TP01', numeroSerie: null },
      descripcion: 'La computadora estaba muy lenta y se calentaba demasiado al usar programas pesados.',
      categoria: 'Rendimiento',
      tecnicoId: tecnico2,
      prioridad: 'baja',
      history: [
        [S.REGISTERED, 'Solicitud creada desde la plataforma.'],
        [S.DIAGNOSIS, 'Diagnóstico preliminar: posible sobrecalentamiento.'],
        [S.PENDING_TECH, 'En espera de asignación.'],
        [S.TECH_ASSIGNED, 'Técnico asignado.'],
        ['Presupuesto enviado', 'Total $900.00 · Anticipo requerido (50 %) $450.00.'],
        [S.PENDING_DEPOSIT, 'Presupuesto aceptado.'],
        ['Anticipo registrado', 'Anticipo de $450.00 · Pago con transferencia.'],
        [S.READY_TO_RECEIVE, 'Lleva tu dispositivo al centro de servicio.'],
        [S.DEVICE_RECEIVED, 'Equipo recibido en el centro de servicio.'],
        [S.IN_REVIEW, 'Revisión completada.'],
        [S.IN_REPAIR, 'Mantenimiento preventivo y cambio de pasta térmica.'],
        [S.REPAIR_DONE, 'Trabajo realizado: limpieza interna, cambio de pasta térmica y pruebas de estrés.'],
        ['Pago final registrado', 'Pago final de $450.00 · Pago con efectivo.'],
        [S.READY, 'Elige cómo quieres recibir tu dispositivo.'],
        [S.FINISHED, 'El cliente recogió su dispositivo en el centro de servicio. Entrega completada.'],
      ],
      extras: async (conn, id) => {
        await conn.query(
          `UPDATE solicitudes SET resumen_reparacion = ?, diagnostico_final = ?, metodo_entrega = 'recoger',
                  costo_estimado = 900, tiempo_estimado = '2 días', fecha_finalizacion = NOW(), solicita_recoleccion = 0
            WHERE id_solicitud = ?`,
          ['Limpieza interna, cambio de pasta térmica y pruebas de estrés.', 'Acumulación de polvo y pasta térmica degradada.', id],
        )
        await conn.query(
          `INSERT INTO presupuestos (id_solicitud, diagnostico, mano_obra, costo_piezas, costo_total, anticipo_requerido, tiempo_estimado, estado)
           VALUES (?, 'Mantenimiento preventivo y cambio de pasta térmica.', 600, 300, 900, 450, '2 días', 'Aceptado')`,
          [id],
        )
        await conn.query(
          `INSERT INTO pagos (id_solicitud, tipo, monto, estado, metodo, referencia) VALUES
             (?, 'anticipo', 450, 'pagado', 'Transferencia', 'Transferencia SPEI 0012345'),
             (?, 'pago_final', 450, 'pagado', 'Efectivo', 'Recibido en sucursal')`,
          [id, id],
        )
        await conn.query(
          `INSERT INTO piezas (id_solicitud, nombre, marca, numero_serie, costo, tipo, verificada)
           VALUES (?, 'Pasta térmica', 'Arctic MX-4', NULL, 300, 'compatible', 1)`,
          [id],
        )
      },
    }),
  )

  // Reparación 4: de otro usuario
  created.push(
    await createRepair({
      userId: ids['otro@protec.app'],
      device: { tipo: 'laptop', marca: 'Dell', modelo: 'Inspiron 15 3520', numeroSerie: null },
      descripcion: 'La batería de la laptop dura muy poco y el sistema muestra un aviso de reemplazo.',
      categoria: 'Batería',
      history: [[S.REGISTERED, 'Solicitud creada desde la plataforma.']],
    }),
  )

  // Calificación del servicio finalizado y promedio del técnico
  const [[finished]] = await pool.query('SELECT id_solicitud FROM solicitudes WHERE folio = ?', [created[2]])
  await pool.query(
    'INSERT IGNORE INTO calificaciones (id_solicitud, id_usuario, id_tecnico, puntuacion, comentario) VALUES (?, ?, ?, 5, ?)',
    [finished.id_solicitud, cliente, tecnico2, 'Excelente servicio, la computadora quedó como nueva.'],
  )
  await pool.query(
    "INSERT INTO historial_estados (id_solicitud, estado, descripcion) VALUES (?, 'Servicio calificado', 'Calificación: 5/5')",
    [finished.id_solicitud],
  )
  await technicianModel.recalculateRating(tecnico)
  await technicianModel.recalculateRating(tecnico2)

  // Notificaciones de ejemplo (actividad reciente del dashboard)
  const [[r1]] = await pool.query('SELECT id_solicitud FROM solicitudes WHERE folio = ?', [created[0]])
  const [[r2]] = await pool.query('SELECT id_solicitud FROM solicitudes WHERE folio = ?', [created[1]])
  const demoNotifications = [
    [cliente, finished.id_solicitud, 'estado', 'Tu dispositivo fue entregado', `Tu reparación ${created[2]} finalizó. ¡Gracias por confiar en PROTEC!`, 1],
    [cliente, r1.id_solicitud, 'presupuesto', 'Tu presupuesto está disponible', `Revisa el presupuesto de ${created[0]}: total $1,450.00, anticipo $725.00.`, 1],
    [cliente, r1.id_solicitud, 'logistica', 'Actualización de recolección', `Recolección completada: el dispositivo fue entregado al técnico. (${created[0]})`, 1],
    [cliente, r2.id_solicitud, 'sistema', 'Estamos buscando un técnico disponible', `Tu solicitud ${created[1]} quedó en espera de asignación.`, 0],
    [cliente, r1.id_solicitud, 'estado', 'Tu reparación cambió a En reparación', 'Tu dispositivo entró en reparación. Nota del técnico: Se reemplazará el cable flex de video dañado.', 0],
    [tecnico2, r1.id_solicitud, 'pago', 'Anticipo registrado', `El cliente registró el anticipo ($725.00) de ${created[0]}.`, 0],
  ]
  for (const [userId, repairId, tipo, titulo, mensaje, leida] of demoNotifications) {
    await pool.query('INSERT INTO notificaciones (id_usuario, id_solicitud, tipo, titulo, mensaje, leida) VALUES (?, ?, ?, ?, ?, ?)', [userId, repairId, tipo, titulo, mensaje, leida])
  }

  // Conversación de ejemplo entre cliente y técnico
  const [conv] = await pool.query('INSERT INTO conversaciones (id_solicitud) VALUES (?)', [r1.id_solicitud])
  const demoMessages = [
    [cliente, 'Hola, ¿ya pudieron revisar la laptop?', 1],
    [tecnico2, 'Hola Ana, sí. El cable flex de video está dañado; ya inicié el reemplazo.', 1],
    [cliente, '¡Perfecto, gracias por avisar!', 0],
  ]
  for (const [i, [sender, text, leido]] of demoMessages.entries()) {
    await pool.query(
      'INSERT INTO mensajes (id_conversacion, id_remitente, mensaje, leido, fecha_envio) VALUES (?, ?, ?, ?, DATE_SUB(NOW(3), INTERVAL ? MINUTE))',
      [conv.insertId, sender, text, leido, (demoMessages.length - i) * 7],
    )
  }

  console.log(`[+] Solicitudes de demostración: ${created.join(', ')}`)
  console.log(`    Contraseña de todas las cuentas demo: ${PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('[seed] Error:', error.code ?? '', error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
