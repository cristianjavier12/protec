import { useState } from 'react'
import { Star, Send } from 'lucide-react'
import Button from '../ui/Button'
import { FormError, inputClass } from './Feedback'
import { cn } from '../../utils/cn'

const LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']

/** Calificación 1-5 estrellas con comentario opcional. Si `value` existe se muestra en solo lectura. */
export default function RatingForm({ value, onSubmit }) {
  const [score, setScore] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (value) {
    return (
      <div className="rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-1" aria-label={`${value.puntuacion} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={cn('size-5', n <= value.puntuacion ? 'fill-amber-400 text-amber-400' : 'text-line')} aria-hidden />
          ))}
          <span className="ml-2 text-sm font-semibold text-ink">{LABELS[value.puntuacion]}</span>
        </div>
        {value.comentario && <p className="mt-2 text-sm text-muted">“{value.comentario}”</p>}
        <p className="mt-2 text-xs text-muted">Gracias por compartir tu experiencia.</p>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!score) return setError('Selecciona de 1 a 5 estrellas.')
    setBusy(true)
    setError('')
    try {
      await onSubmit({ puntuacion: score, comentario: comment.trim() || undefined })
    } catch (err) {
      setError(err?.message || 'No pudimos guardar tu calificación.')
    } finally {
      setBusy(false)
    }
  }

  const shown = hover || score
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-lg p-1 transition hover:scale-110"
            >
              <Star className={cn('size-8 transition', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-line')} aria-hidden />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm font-medium text-muted">{LABELS[shown]}</p>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
        className={inputClass}
      />
      <FormError message={error} />
      <Button type="submit" leadingIcon={Send} loading={busy} className="self-start">
        Enviar calificación
      </Button>
    </form>
  )
}
