import { useEffect, useState } from 'react'
import { Images, X } from 'lucide-react'
import { EVIDENCE_TYPE_LABELS } from '../../utils/status'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-navy/85 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Cerrar imagen"
      >
        <X className="size-5" />
      </button>
      <figure className="max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <img src={item.url} alt={item.descripcion || 'Evidencia'} className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        <figcaption className="mt-3 text-center text-sm text-white/80">
          {EVIDENCE_TYPE_LABELS[item.tipoEvidencia]} · {item.descripcion} · {formatDateTime(item.fechaSubida)}
        </figcaption>
      </figure>
    </div>
  )
}

const ORDER = ['inicial', 'diagnostico', 'reparacion', 'pieza', 'final']

/** Galería de evidencias organizada por etapa (inicial, diagnóstico, reparación, pieza, final). */
export default function EvidenceGallery({ evidences = [], emptyText = 'Aún no hay fotografías.' }) {
  const [active, setActive] = useState(null)
  const [filter, setFilter] = useState('todas')

  const groups = ORDER.map((tipo) => ({ tipo, items: evidences.filter((e) => (e.tipoEvidencia ?? 'inicial') === tipo) })).filter((g) => g.items.length)
  const visible = filter === 'todas' ? groups : groups.filter((g) => g.tipo === filter)

  if (!evidences.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center">
        <Images className="mx-auto size-8 text-muted/60" aria-hidden />
        <p className="mt-2 text-sm text-muted">{emptyText}</p>
      </div>
    )
  }

  return (
    <div>
      {groups.length > 1 && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ tipo: 'todas', items: evidences }, ...groups].map((g) => (
            <button
              key={g.tipo}
              type="button"
              onClick={() => setFilter(g.tipo)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                filter === g.tipo ? 'bg-electric text-white' : 'bg-surface text-muted hover:text-electric',
              )}
            >
              {g.tipo === 'todas' ? 'Todas' : EVIDENCE_TYPE_LABELS[g.tipo]} ({g.items.length})
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-5">
        {visible.map((g) => (
          <div key={g.tipo}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{EVIDENCE_TYPE_LABELS[g.tipo]}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setActive(ev)}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface"
                  aria-label={`Ampliar: ${ev.descripcion || EVIDENCE_TYPE_LABELS[g.tipo]}`}
                >
                  <img src={ev.url} alt={ev.descripcion || 'Evidencia'} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                  {ev.descripcion && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-navy/80 to-transparent px-2.5 pt-6 pb-2 text-left text-[11px] font-medium text-white">
                      {ev.descripcion}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {active && <Lightbox item={active} onClose={() => setActive(null)} />}
    </div>
  )
}
