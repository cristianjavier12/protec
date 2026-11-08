/**
 * Error controlado de la aplicación.
 * `message` SIEMPRE debe ser apto para mostrarse al usuario final.
 * Los detalles técnicos se registran solo en consola (desarrollo).
 */
export class AppError extends Error {
  constructor(message, status = 400, { errors, code } = {}) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.errors = errors
    this.code = code
    this.expose = true
  }

  static badRequest(message = 'La solicitud no es válida.', errors) {
    return new AppError(message, 400, { errors })
  }

  static validation(errors, message = 'Revisa los datos ingresados.') {
    return new AppError(message, 422, { errors })
  }

  static unauthorized(message = 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.') {
    return new AppError(message, 401)
  }

  static forbidden(message = 'No tienes permiso para realizar esta acción.') {
    return new AppError(message, 403)
  }

  static notFound(message = 'No encontramos el recurso solicitado.') {
    return new AppError(message, 404)
  }

  static conflict(message, errors) {
    return new AppError(message, 409, { errors })
  }
}
