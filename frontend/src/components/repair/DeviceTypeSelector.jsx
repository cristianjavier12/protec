import { CheckCircle2 } from 'lucide-react'
import { DEVICE_TYPES } from '../../data/devices'
import { cn } from '../../utils/cn'

/** Selector visual del tipo de dispositivo (radio group accesible). */
export default function DeviceTypeSelector({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">
        Tipo de dispositivo <span className="text-electric">*</span>
      </legend>
      <div role="radiogroup" className="mt-3 grid gap-3 sm:grid-cols-3">
        {DEVICE_TYPES.map((device) => {
          const Icon = device.icon
          const selected = value === device.id
          return (
            <button
              key={device.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(device.id)}
              className={cn(
                'group relative flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 sm:flex-col sm:items-start sm:p-5',
                selected
                  ? 'border-electric bg-electric/[0.05] shadow-[0_10px_30px_-14px_rgb(36_124_255/0.6)]'
                  : 'border-line bg-white hover:-translate-y-0.5 hover:border-electric/40',
              )}
            >
              <span
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-xl transition-all duration-200',
                  selected ? 'bg-brand-gradient text-white shadow-glow' : 'bg-surface text-electric',
                )}
              >
                <Icon className="size-6" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{device.name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {device.issues.slice(0, 3).join(' · ')}
                </span>
              </span>
              <CheckCircle2
                className={cn(
                  'absolute top-3 right-3 size-5 text-electric transition-all duration-200',
                  selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                )}
                aria-hidden
              />
            </button>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  )
}
