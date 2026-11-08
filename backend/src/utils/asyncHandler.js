/** Envuelve controladores async para delegar errores al middleware central. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
