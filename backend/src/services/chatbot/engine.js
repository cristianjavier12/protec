import { PROBLEM_CATEGORIES } from '../../utils/constants.js'
import { RULES } from './rules.js'

/**
 * ==========================================================
 * PROTEC · Motor de diagnóstico basado en reglas
 * ==========================================================
 * Función pura y determinista: dado el contexto de la solicitud y la lista
 * de respuestas del usuario, "reproduce" la conversación y devuelve:
 *
 *   { status: 'question', question, intro[] }   -> siguiente pregunta
 *   { status: 'clarify',  question, message }   -> respuesta no entendida
 *   { status: 'result',   result }              -> diagnóstico preliminar
 *
 * Al ser sin estado, el servidor siempre recalcula el resultado a partir de
 * las respuestas: el cliente no puede enviar un diagnóstico "inventado".
 * No usa IA generativa: solo reglas declaradas en rules.js.
 */

export const YES_NO_OPTIONS = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'nose', label: 'No estoy seguro' },
]

const DEVICE_QUESTION = {
  id: '__device',
  text: '¿Qué dispositivo presenta el problema?',
  type: 'choice',
  options: [
    { value: 'celular', label: 'Celular', aliases: ['phone', 'telefono', 'movil', 'smartphone', 'cel', 'iphone', 'android'] },
    { value: 'laptop', label: 'Laptop', aliases: ['notebook', 'portatil', 'macbook', 'lap'] },
    { value: 'computadora', label: 'Computadora', aliases: ['pc', 'escritorio', 'desktop', 'computador', 'cpu', 'ordenador'] },
  ],
}

const CATEGORY_ALIASES = {
  Pantalla: ['display', 'imagen', 'monitor', 'tactil'],
  Batería: ['pila', 'se descarga'],
  Carga: ['cargador', 'no carga', 'puerto'],
  Encendido: ['no enciende', 'no prende', 'prender', 'encender'],
  Rendimiento: ['lento', 'lenta', 'se traba'],
  Software: ['sistema', 'aplicacion', 'app', 'virus'],
  Almacenamiento: ['memoria', 'espacio', 'disco'],
  Sonido: ['audio', 'bocina', 'microfono'],
  Conectividad: ['wifi', 'internet', 'bluetooth', 'red'],
  Otro: ['otra', 'otra cosa', 'ninguna'],
}

const CATEGORY_QUESTION = {
  id: '__category',
  text: '¿Cuál de estas opciones describe mejor el problema?',
  type: 'choice',
  options: PROBLEM_CATEGORIES.map((c) => ({ value: c, label: c, aliases: CATEGORY_ALIASES[c] ?? [] })),
}

/* ---------------- Normalización de texto ---------------- */

export const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const containsWord = (text, phrase) => new RegExp(`(^|\\W)${escapeRe(normalizeText(phrase))}(\\W|$)`).test(text)

function normalizeYesNo(raw) {
  const t = normalizeText(raw)
  if (!t) return null
  if (['si', 'no', 'nose'].includes(t)) return t
  if (/^(no se|no lo se|no estoy segur|no sabria|tal vez|quiza|quizas|no recuerdo|ni idea|desconozco|creo que|puede ser|a veces)/.test(t)) {
    return 'nose'
  }
  if (/^(si|sip|sii+|claro|correcto|afirmativo|asi es|exacto|efectivamente|yes|ok|aja|por supuesto|desde luego|totalmente)(\W|$)/.test(t)) {
    return 'si'
  }
  if (/^(no|nop|nel|nunca|negativo|para nada|ninguno|ninguna|tampoco|nada)(\W|$)/.test(t)) return 'no'
  return null
}

function normalizeChoice(question, raw) {
  const t = normalizeText(raw)
  if (!t) return null
  const opts = question.options
  // 1) coincidencia exacta con valor, etiqueta o alias
  const exact = opts.find(
    (o) =>
      normalizeText(o.value) === t ||
      normalizeText(o.label) === t ||
      (o.aliases ?? []).some((a) => normalizeText(a) === t),
  )
  if (exact) return exact.value
  // 2) la respuesta contiene la etiqueta o algún alias
  const partial = opts.find(
    (o) => containsWord(t, o.label) || (o.aliases ?? []).some((a) => containsWord(t, a)),
  )
  return partial?.value ?? null
}

function normalizeAnswer(question, raw) {
  if (raw === null || raw === undefined) return null
  return question.type === 'yesno' ? normalizeYesNo(raw) : normalizeChoice(question, raw)
}

const labelFor = (question, value) => {
  const options = question.type === 'yesno' ? YES_NO_OPTIONS : question.options
  return options.find((o) => o.value === value)?.label ?? String(value)
}

const publicQuestion = (q) => ({
  id: q.id,
  text: q.text,
  type: q.type,
  options: (q.type === 'yesno' ? YES_NO_OPTIONS : q.options).map(({ value, label }) => ({ value, label })),
})

/* ---------------- Selección de regla ---------------- */

const categoriesOf = (rule) => [].concat(rule.category ?? [])

function scoreRule(rule, state) {
  let score = 0
  if (state.category && categoriesOf(rule).includes(state.category)) score += 5
  const text = normalizeText(state.description)
  if (text) {
    for (const kw of rule.keywords ?? []) {
      if (containsWord(text, kw)) score += kw.includes(' ') ? 3 : 2
    }
  }
  return score
}

const fallbackFor = (deviceType) => RULES.find((r) => r.fallback && r.deviceType === deviceType) ?? null

export function selectRule(state) {
  const candidates = RULES.filter(
    (r) => !r.fallback && (r.deviceType === state.deviceType || r.deviceType === '*'),
  )
  const pool = state.categoryChosen
    ? candidates.filter((r) => categoriesOf(r).includes(state.category))
    : candidates

  let best = null
  let bestScore = 0
  for (const rule of pool) {
    const score = scoreRule(rule, state) + (state.categoryChosen ? 1 : 0)
    if (score > bestScore) {
      best = rule
      bestScore = score
    }
  }

  if (best && bestScore >= 2) return best
  // Hay categoría pero ninguna regla específica: revisión general del dispositivo.
  if (state.categoryChosen || state.category) return fallbackFor(state.deviceType)
  return null // se preguntará la categoría
}

/* ---------------- Evaluación del resultado ---------------- */

const matches = (when = {}, responses) =>
  Object.entries(when).every(([key, expected]) =>
    Array.isArray(expected) ? expected.includes(responses[key]) : responses[key] === expected,
  )

export function buildResult(rule, responses) {
  const outcome = rule.outcomes.find((o) => !o.default && matches(o.when, responses)) ??
    rule.outcomes.find((o) => o.default)
  const requiresTechnician = outcome.requiresTechnician ?? rule.requiresTechnician ?? true
  const selfFixSteps = !requiresTechnician && outcome.selfFixSteps?.length ? outcome.selfFixSteps : null
  const priority = outcome.priority ?? (requiresTechnician ? 'media' : 'baja')
  const attention =
    outcome.attention ??
    (selfFixSteps
      ? 'Puedes intentarlo tú mismo'
      : priority === 'alta'
        ? 'Atención prioritaria · Técnico requerido'
        : 'Técnico requerido')

  return {
    ruleId: rule.id,
    title: rule.title,
    problem: outcome.problem,
    recommendation: outcome.recommendation,
    attention,
    priority,
    requiresTechnician: Boolean(requiresTechnician),
    selfFixSteps,
    tips: rule.recommendations ?? [],
  }
}

/** Texto legible para guardar en `diagnosticos.resultado` y `solicitudes.diagnostico_inicial`. */
export function summarizeResult(result) {
  return [
    `Posible problema: ${result.problem}`,
    `Recomendación: ${result.recommendation}`,
    `Nivel de atención: ${result.attention}`,
    `Requiere técnico: ${result.requiresTechnician ? 'Sí' : 'No'}`,
  ].join('\n')
}

/* ---------------- Reproducción de la conversación ---------------- */

function nextStep(state) {
  if (!state.deviceType) return { question: DEVICE_QUESTION, intro: [] }
  if (!state.rule) {
    state.rule = selectRule(state)
    if (!state.rule) return { question: CATEGORY_QUESTION, intro: [] }
  }
  const question = state.rule.questions.find((q) => !(q.id in state.responses))
  if (!question) return { done: true }
  const isFirst = Object.keys(state.responses).length === 0
  return { question, intro: isFirst && state.rule.intro ? [state.rule.intro] : [] }
}

function applyAnswer(state, question, value) {
  if (question.id === DEVICE_QUESTION.id) {
    state.deviceType = value
    state.rule = null
  } else if (question.id === CATEGORY_QUESTION.id) {
    state.category = value
    state.categoryChosen = true
    state.rule = null
  } else {
    state.responses[question.id] = value
  }
}

const ruleInfo = (rule) => (rule ? { id: rule.id, title: rule.title } : null)

/**
 * @param {{ deviceType?: string, category?: string, description?: string }} context
 * @param {Array<string>} rawAnswers respuestas del usuario en orden (texto libre o valor)
 */
export function runDiagnosis(context = {}, rawAnswers = []) {
  const state = {
    deviceType: ['celular', 'laptop', 'computadora'].includes(context.deviceType) ? context.deviceType : null,
    category: PROBLEM_CATEGORIES.includes(context.category) ? context.category : null,
    description: typeof context.description === 'string' ? context.description : '',
    categoryChosen: false,
    rule: null,
    responses: {},
  }
  const answers = Array.isArray(rawAnswers) ? rawAnswers.slice(0, 40) : []
  const transcript = []

  for (let i = 0; i < answers.length; i += 1) {
    const step = nextStep(state)
    if (step.done) break
    const value = normalizeAnswer(step.question, answers[i])
    if (value === null) {
      return {
        status: 'clarify',
        validCount: i,
        question: publicQuestion(step.question),
        message:
          step.question.type === 'yesno'
            ? 'No logré entender tu respuesta. Puedes responder "Sí", "No" o "No estoy seguro".'
            : 'No logré identificar tu respuesta. Elige una de las opciones disponibles.',
        rule: ruleInfo(state.rule),
        transcript,
      }
    }
    applyAnswer(state, step.question, value)
    transcript.push({
      questionId: step.question.id,
      question: step.question.text,
      answer: labelFor(step.question, value),
      value,
    })
  }

  const step = nextStep(state)
  if (!step.done) {
    return {
      status: 'question',
      validCount: transcript.length,
      question: publicQuestion(step.question),
      intro: step.intro,
      rule: ruleInfo(state.rule),
      transcript,
    }
  }

  return {
    status: 'result',
    validCount: transcript.length,
    rule: ruleInfo(state.rule),
    result: buildResult(state.rule, state.responses),
    transcript,
    context: { deviceType: state.deviceType, category: state.category },
  }
}
