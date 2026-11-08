import { query, queryOne } from '../config/db.js'

/** Acceso a la tabla `usuarios`. Nunca devuelve password_hash fuera de los flujos de autenticación. */

const PUBLIC_COLUMNS = 'id_usuario, nombre, apellidos, correo, telefono, rol, estado, token_version, correo_verificado, fecha_registro'

export const userModel = {
  findById(id, conn) {
    return queryOne(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id_usuario = ?`, [id], conn)
  },

  /** Incluye password_hash: usar exclusivamente para autenticación. */
  findByEmailWithPassword(correo, conn) {
    return queryOne(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM usuarios WHERE correo = ?`, [correo], conn)
  },

  /** Incluye password_hash: usar exclusivamente para verificar la contraseña actual. */
  findByIdWithPassword(id, conn) {
    return queryOne(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM usuarios WHERE id_usuario = ?`, [id], conn)
  },

  findByEmail(correo, conn) {
    return queryOne(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE correo = ?`, [correo], conn)
  },

  async existsByEmail(correo, conn) {
    const row = await queryOne('SELECT 1 AS found FROM usuarios WHERE correo = ? LIMIT 1', [correo], conn)
    return Boolean(row)
  },

  /**
   * correoVerificado: las cuentas creadas por el administrador o por scripts se consideran verificadas.
   * aceptoTerminos: registra la fecha en que la persona aceptó los términos y el aviso de privacidad.
   */
  async create({ nombre, apellidos, correo, telefono, passwordHash, rol = 'usuario', correoVerificado = false, aceptoTerminos = false }, conn) {
    const result = await query(
      `INSERT INTO usuarios (nombre, apellidos, correo, telefono, password_hash, rol, correo_verificado, acepto_terminos_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ${aceptoTerminos ? 'UTC_TIMESTAMP()' : 'NULL'})`,
      [nombre, apellidos, correo, telefono, passwordHash, rol, correoVerificado ? 1 : 0],
      conn,
    )
    return result.insertId
  },

  async updateProfile(id, { nombre, apellidos, telefono }, conn) {
    await query('UPDATE usuarios SET nombre = ?, apellidos = ?, telefono = ? WHERE id_usuario = ?', [
      nombre,
      apellidos,
      telefono,
      id,
    ], conn)
    return this.findById(id, conn)
  },

  /**
   * Cambia la contraseña e incrementa token_version:
   * todas las sesiones abiertas con la contraseña anterior dejan de ser válidas.
   */
  async updatePassword(id, passwordHash, conn) {
    await query('UPDATE usuarios SET password_hash = ?, token_version = token_version + 1 WHERE id_usuario = ?', [passwordHash, id], conn)
    return this.findById(id, conn)
  },

  /** Cambia el rol y cierra las sesiones abiertas para que el usuario vuelva a entrar con sus nuevos permisos. */
  async updateRole(id, rol, conn) {
    await query('UPDATE usuarios SET rol = ?, token_version = token_version + 1 WHERE id_usuario = ?', [rol, id], conn)
  },

  async markEmailVerified(id, conn) {
    await query('UPDATE usuarios SET correo_verificado = 1 WHERE id_usuario = ?', [id], conn)
  },

  async countAdmins(conn) {
    const row = await queryOne("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin' AND estado = 1", [], conn)
    return Number(row?.total ?? 0)
  },

  async remove(id, conn) {
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [id], conn)
  },
}
