import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

/** Item individual del acordeón (accesible: aria-expanded / aria-controls). */
function AccordionItem({ item, isOpen, onToggle, index }) {
  const baseId = useId()
  const panelId = `${baseId}-panel`
  const buttonId = `${baseId}-button`

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white transition-all duration-300',
        isOpen ? 'border-electric/30 shadow-card' : 'border-line hover:border-electric/20',
      )}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
        >
          <span
            className={cn(
              'hidden size-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition-colors sm:grid',
              isOpen ? 'bg-electric text-white' : 'bg-surface text-muted',
            )}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="flex-1 text-base font-semibold text-ink sm:text-lg">{item.question}</span>
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full transition-all duration-300',
              isOpen ? 'rotate-180 bg-electric/10 text-electric' : 'bg-surface text-muted',
            )}
          >
            <ChevronDown className="size-4" aria-hidden />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-6 leading-relaxed text-muted sm:pl-[4.5rem] sm:pr-16">{item.answer}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Acordeón. items: [{ id, question, answer }]
 * `multiple` permite varios abiertos a la vez.
 */
export default function Accordion({ items, defaultOpen = [], multiple = false, className }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen))

  const toggle = (id) => {
    setOpen((prev) => {
      const next = new Set(multiple ? prev : [])
      if (prev.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item, i) => (
        <AccordionItem
          key={item.id}
          item={item}
          index={i}
          isOpen={open.has(item.id)}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  )
}
