import { query, queryOne } from '../config/db.js'
import { FINISHED_STATUSES } from '../utils/constants.js'

/** Acceso a la tabla `solicitudes` (con datos del dispositivo y técnico). */

const BASE_SELECT = `
  SELECT s.id_solicitud, s.folio, s.id_usuario, s.id_dispositivo, s.descripcion_problema, s.categoria,
         s.estado, s.prioridad, s.diagnostico_inicial, s.requiere_tecnico, s.id_tecnico, s.costo_estimado,
         s.metodo_contacto, s.solicita_recoleccion, s.fecha_creacion, s.fecha_actualizacion,
         s.resumen_reparacion, s.diagnostico_final, s.tiempo_estimado, s.metodo_entrega, s.fecha_finalizacion,
         d.tipo AS dispositivo_tipo, d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo,
         d.numero_serie AS dispositivo_numero_serie,
         t.nombre AS tecnico_nombre, t.apellidos AS tecnico_apellidos,
         (SELECT COUNT(*) FROM evidencias e WHERE e.id_solicitud = s.id_solicitud) AS evidencias_total
    FROM solicitudes s
    JOIN dispositivos d ON d.id_dispositivo = s.id_dispositivo
    LEFT JOIN usuarios t ON t.id_usuario = s.id_tecnico`

export const repairModel = {
  async create(data, conn) {
    const result = await query(
      `INSERT INTO solicitudes
         (folio, id_usuario, id_dispositivo, descripcion_problema, categoria, estado,
          requiere_tecnico, metodo_contacto, solicita_recoleccion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.folio,
        data.userId,
        data.deviceId,
        data.descripcion,
        data.categoria,
        data.estado,
        data.requiereTecnico ? 1 : 0,
        data.metodoContacto,
        data.solicitaRecoleccion ? 1 : 0,
      ],
      conn,
    )
    return result.insertId
  },

  findByFolio(folio, conn) {
    return queryOne(`${BASE_SELECT} WHERE s.folio = ?`, [folio], conn)
  },

  findById(id, conn) {
    return queryOne(`${BASE_SELECT} WHERE s.id_solicitud = ?`, [id], conn)
  },

  /**
   * Solicitudes de un usuario con filtros opcionales.
   * filter: 'all' | 'active' | 'finished'; search: texto parcial del folio.
   */
  listByUser(userId, { filter = 'all', search = '' } = {}, conn) {
    const where = ['s.id_usuario = ?']
    const params = [userId]
    const placeholders = FINISHED_STATUSES.map(() => '?').join(', ')
    if (filter === 'active') {
      where.push(`s.estado NOT IN (${placeholders})`)
      params.push(...FINISHED_STATUSES)
    } else if (filter === 'finished') {
      where.push(`s.estado IN (${placeholders})`)
      params.push(...FINISHED_STATUSES)
    }
    if (search) {
      where.push('s.folio LIKE ?')
      params.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`)
    }
    return query(`${BASE_SELECT} WHERE ${where.join(' AND ')} ORDER BY s.fecha_creacion DESC, s.id_solicitud DESC`, params, conn)
  },

  async countByUser(userId, conn) {
    const placeholders = FINISHED_STATUSES.map(() => '?').join(', ')
    const row = await queryOne(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(estado IN (${placeholders})), 0) AS terminadas
         FROM solicitudes WHERE id_usuario = ?`,
      [...FINISHED_STATUSES, userId],
      conn,
    )
    const total = Number(row?.total ?? 0)
    const terminadas = Number(row?.terminadas ?? 0)
    return { total, terminadas, activas: total - terminadas }
  },

  async updateStatus(id, { estado, requiereTecnico, diagnosticoInicial, prioridad }, conn) {
    const sets = ['estado = ?']
    const params = [estado]
    if (requiereTecnico !== undefined) {
      sets.push('requiere_tecnico = ?')
      params.push(requiereTecnico ? 1 : 0)
    }
    if (diagnosticoInicial !== undefined) {
      sets.push('diagnostico_inicial = ?')
      params.push(diagnosticoInicial)
    }
    if (prioridad !== undefined) {
      sets.push('prioridad = ?')
      params.push(prioridad)
    }
    params.push(id)
    await query(`UPDATE solicitudes SET ${sets.join(', ')} WHERE id_solicitud = ?`, params, conn)
  },

  /* ---------------- Paneles de técnico y administrador ---------------- */

  /** Bloquea la fila dentro de una transacción y devuelve su estado actual. */
  async lockForUpdate(id, conn) {
    return queryOne('SELECT id_solicitud, estado, id_tecnico, metodo_entrega FROM solicitudes WHERE id_solicitud = ? FOR UPDATE', [id], conn)
  },

  /** Conteos del dashboard del usuario. */
  async dashboardCountsByUser(userId, pendingStatuses, conn) {
    const fin = FINISHED_STATUSES.map(() => '?').join(', ')
    const pend = pendingStatuses.map(() => '?').join(', ')
    const row = await queryOne(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(estado IN (${fin})), 0) AS terminadas,
              COALESCE(SUM(estado IN (${pend})), 0) AS pendientes
         FROM solicitudes WHERE id_usuario = ?`,
      [...FINISHED_STATUSES, ...pendingStatuses, userId],
      conn,
    )
    const total = Number(row?.total ?? 0)
    const terminadas = Number(row?.terminadas ?? 0)
    const pendientes = Number(row?.pendientes ?? 0)
    return { total, terminadas, pendientes, activas: Math.max(0, total - terminadas - pendientes) }
  },

  /** Solicitudes asignadas a un técnico. groups: { pending, in_review, in_repair, finished } -> arreglos de estados. */
  listByTechnician(techId, { statuses = null, search = '' } = {}, conn) {
    const where = ['s.id_tecnico = ?']
    const params = [techId]
    if (statuses?.length) {
      where.push(`s.estado IN (${statuses.map(() => '?').join(', ')})`)
      params.push(...statuses)
    }
    if (search) {
      const term = `%${search.replace(/[%_\\]/g, '\\$&')}%`
      where.push('(s.folio LIKE ? OR d.marca LIKE ? OR d.modelo LIKE ? OR d.tipo LIKE ?)')
      params.push(term, term, term, term)
    }
    return query(
      `SELECT s.*, d.tipo AS dispositivo_tipo, d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo,
              d.numero_serie AS dispositivo_numero_serie,
              u.nombre AS cliente_nombre, u.apellidos AS cliente_apellidos,
              (SELECT MAX(h.fecha) FROM historial_estados h
                WHERE h.id_solicitud = s.id_solicitud AND h.estado = 'Técnico asignado') AS fecha_asignacion,
              (SELECT COUNT(*) FROM evidencias e WHERE e.id_solicitud = s.id_solicitud) AS evidencias_total
         FROM solicitudes s
         JOIN dispositivos d ON d.id_dispositivo = s.id_dispositivo
         JOIN usuarios u ON u.id_usuario = s.id_usuario
        WHERE ${where.join(' AND ')}
        ORDER BY FIELD(s.prioridad, 'alta', 'media', 'baja'), s.fecha_actualizacion DESC
        LIMIT 100`,
      params,
      conn,
    )
  },

  async countByTechnicianGroups(techId, groups, conn) {
    const cols = Object.entries(groups)
      .map(([key, statuses]) => `COALESCE(SUM(estado IN (${statuses.map(() => '?').join(', ')})), 0) AS ${key}`)
      .join(', ')
    const params = Object.values(groups).flat()
    const row = await queryOne(`SELECT COUNT(*) AS total, ${cols} FROM solicitudes WHERE id_tecnico = ?`, [...params, techId], conn)
    return Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v ?? 0)]))
  },

  /** Listado general para el administrador con filtros. */
  async listAll({ estado, tecnico, tipoDispositivo, desde, hasta, search, limit = 50, offset = 0 } = {}, conn) {
    const where = ['1 = 1']
    const params = []
    if (estado) { where.push('s.estado = ?'); params.push(estado) }
    if (tecnico === 'none') where.push('s.id_tecnico IS NULL')
    else if (tecnico) { where.push('s.id_tecnico = ?'); params.push(Number(tecnico)) }
    if (tipoDispositivo) { where.push('d.tipo = ?'); params.push(tipoDispositivo) }
    if (desde) { where.push('s.fecha_creacion >= ?'); params.push(`${desde} 00:00:00`) }
    if (hasta) { where.push('s.fecha_creacion <= ?'); params.push(`${hasta} 23:59:59`) }
    if (search) {
      where.push('s.folio LIKE ?')
      params.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`)
    }
    const from = `FROM solicitudes s
         JOIN dispositivos d ON d.id_dispositivo = s.id_dispositivo
         JOIN usuarios u ON u.id_usuario = s.id_usuario
         LEFT JOIN usuarios t ON t.id_usuario = s.id_tecnico
        WHERE ${where.join(' AND ')}`
    const rows = await query(
      `SELECT s.*, d.tipo AS dispositivo_tipo, d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo,
              u.nombre AS cliente_nombre, u.apellidos AS cliente_apellidos,
              t.nombre AS tecnico_nombre, t.apellidos AS tecnico_apellidos,
              (SELECT COUNT(*) FROM evidencias e WHERE e.id_solicitud = s.id_solicitud) AS evidencias_total
       ${from}
       ORDER BY s.fecha_actualizacion DESC, s.id_solicitud DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)],
      conn,
    )
    const count = await queryOne(`SELECT COUNT(*) AS total ${from}`, params, conn)
    return { rows, total: Number(count?.total ?? 0) }
  },

  async globalStats(conn) {
    const fin = FINISHED_STATUSES.map(() => '?').join(', ')
    const row = await queryOne(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(estado NOT IN (${fin})), 0) AS activas,
              COALESCE(SUM(estado IN ('En revisión','En reparación','Esperando pieza')), 0) AS en_reparacion,
              COALESCE(SUM(estado IN (${fin})), 0) AS terminadas,
              COALESCE(SUM(estado = 'Pendiente de técnico'), 0) AS pendientes_tecnico
         FROM solicitudes`,
      [...FINISHED_STATUSES, ...FINISHED_STATUSES],
      conn,
    )
    return {
      total: Number(row.total),
      activas: Number(row.activas),
      enReparacion: Number(row.en_reparacion),
      terminadas: Number(row.terminadas),
      pendientesTecnico: Number(row.pendientes_tecnico),
    }
  },

  statusBreakdown(conn) {
    return query('SELECT estado, COUNT(*) AS total FROM solicitudes GROUP BY estado ORDER BY total DESC', [], conn)
  },

  deviceBreakdown(conn) {
    return query(
      `SELECT d.tipo, COUNT(*) AS total FROM solicitudes s
         JOIN dispositivos d ON d.id_dispositivo = s.id_dispositivo
        GROUP BY d.tipo ORDER BY total DESC`,
      [],
      conn,
    )
  },
}
