/** Normaliza un folio: " pro-1025 " -> "PRO-1025", "1025" -> "PRO-1025" */
export function normalizeFolio(value = '') {
  const clean = value.trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '')
  if (/^\d+$/.test(clean)) return `PRO-${clean}`
  if (/^PRO\d+$/.test(clean)) return clean.replace('PRO', 'PRO-')
  return clean
}

/** Formatea montos en pesos mexicanos. */
export function formatCurrency(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}

/** Formatea fechas ISO a texto legible. */
export function formatDate(iso, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-MX', options).format(new Date(iso))
}

export function formatDateTime(iso) {
  return formatDate(iso, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
