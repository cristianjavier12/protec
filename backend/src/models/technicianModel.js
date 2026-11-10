import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `tecnicos` (perfil extendido de usuarios con rol tecnico). */
export const technicianModel = {
  findByUserId(userId, conn) {
    return queryOne('SELECT * FROM tecnicos WHERE id_usuario = ?', [userId], conn)
  },

  async create({ userId, especialidad = 'general' }, conn) {
    const result = await query('INSERT INTO tecnicos (id_usuario, especialidad) VALUES (?, ?)', [userId, especialidad], conn)
    return result.insertId
  },

  /**
   * Técnicos activos, priorizando los marcados como disponibles, menor carga de trabajo
   * y mejor calificación. El filtrado por especialidad se hace en assignmentService.
   */
  findAvailable(conn) {
    return query(
      `SELECT u.id_usuario, u.nombre, u.apellidos,
              t.id_tecnico,
              COALESCE(t.especialidad, 'general') AS especialidad,
              COALESCE(t.disponible, 1) AS disponible,
              COALESCE(t.calificacion, 5.00) AS calificacion,
              COALESCE(t.servicios_terminados, 0) AS servicios_terminados,
              COALESCE(t.estado, 1) AS estado,
              (SELECT COUNT(*) FROM solicitudes s
                WHERE s.id_tecnico = u.id_usuario
                  AND s.estado NOT IN ('Finalizado','Resuelto mediante diagnóstico','Presupuesto rechazado','Folio rechazado')) AS carga
         FROM usuarios u
         LEFT JOIN tecnicos t ON t.id_usuario = u.id_usuario
        WHERE u.estado = 1 AND u.rol = 'tecnico' AND COALESCE(t.estado, 1) = 1
        ORDER BY COALESCE(t.disponible, 1) DESC, carga ASC, COALESCE(t.calificacion, 5.00) DESC, u.id_usuario ASC`,
      [],
      conn,
    )
  },

  listAll(conn) {
    return query(
      `SELECT t.*, u.nombre, u.apellidos, u.correo, u.telefono,
              (SELECT COUNT(*) FROM solicitudes s
                WHERE s.id_tecnico = u.id_usuario
                  AND s.estado NOT IN ('Finalizado','Resuelto mediante diagnóstico','Presupuesto rechazado')) AS reparaciones_activas
         FROM tecnicos t
         JOIN usuarios u ON u.id_usuario = t.id_usuario
        ORDER BY u.nombre ASC`,
      [],
      conn,
    )
  },

  async updateAvailability(userId, disponible, conn) {
    await query('UPDATE tecnicos SET disponible = ? WHERE id_usuario = ?', [disponible ? 1 : 0, userId], conn)
  },

  async updateStatus(techId, estado, conn) {
    await query('UPDATE tecnicos SET estado = ? WHERE id_tecnico = ?', [estado ? 1 : 0, techId], conn)
  },

  async updateSpecialty(techId, especialidad, conn) {
    await query('UPDATE tecnicos SET especialidad = ? WHERE id_tecnico = ?', [especialidad, techId], conn)
  },

  /** Recalcula promedio de calificaciones y servicios terminados. */
  async recalculateRating(userId, conn) {
    await query(
      `UPDATE tecnicos SET
         calificacion = COALESCE((SELECT ROUND(AVG(c.puntuacion), 2) FROM calificaciones c WHERE c.id_tecnico = ?), 5.00),
         servicios_terminados = (SELECT COUNT(*) FROM solicitudes s WHERE s.id_tecnico = ? AND s.estado = 'Finalizado')
       WHERE id_usuario = ?`,
      [userId, userId, userId],
      conn,
    )
  },

  /** Perfil público: SIN correo ni teléfono. */
  getPublicProfile(userId, conn) {
    return queryOne(
      `SELECT t.especialidad, t.calificacion, t.servicios_terminados, u.nombre, u.apellidos
         FROM tecnicos t JOIN usuarios u ON u.id_usuario = t.id_usuario
        WHERE t.id_usuario = ?`,
      [userId],
      conn,
    )
  },
}
