import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `pagos`. Nunca almacena números de tarjeta completos. */
export const paymentModel = {
  async create(data, conn) {
    const result = await query(
      'INSERT INTO pagos (id_solicitud, tipo, monto, estado, metodo, referencia, registrado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.idSolicitud, data.tipo, data.monto, data.estado || 'pagado', data.metodo, data.referencia || null, data.registradoPor ?? null],
      conn,
    )
    return result.insertId
  },

  listByRepair(repairId, conn) {
    return query('SELECT * FROM pagos WHERE id_solicitud = ? ORDER BY fecha ASC, id_pago ASC', [repairId], conn)
  },

  async totalPaid(repairId, conn) {
    const row = await queryOne(
      "SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE id_solicitud = ? AND estado = 'pagado'",
      [repairId],
      conn,
    )
    return Number(row?.total ?? 0)
  },

  async totalPaidByType(repairId, tipo, conn) {
    const row = await queryOne(
      "SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE id_solicitud = ? AND tipo = ? AND estado = 'pagado'",
      [repairId, tipo],
      conn,
    )
    return Number(row?.total ?? 0)
  },

  listAll({ limit = 100, offset = 0 } = {}, conn) {
    return query(
      `SELECT p.*, s.folio, u.nombre, u.apellidos
         FROM pagos p
         JOIN solicitudes s ON s.id_solicitud = p.id_solicitud
         JOIN usuarios u ON u.id_usuario = s.id_usuario
        ORDER BY p.fecha DESC, p.id_pago DESC
        LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)],
      conn,
    )
  },

  /** Ingresos: SOLO pagos con estado 'pagado'. */
  async revenueSummary(conn) {
    const row = await queryOne(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'anticipo'   AND estado = 'pagado' THEN monto END), 0) AS anticipos,
         COALESCE(SUM(CASE WHEN tipo = 'pago_final' AND estado = 'pagado' THEN monto END), 0) AS pagos_finales,
         COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto END), 0) AS total
       FROM pagos`,
      [],
      conn,
    )
    return { anticipos: Number(row.anticipos), pagosFinales: Number(row.pagos_finales), total: Number(row.total) }
  },
}
