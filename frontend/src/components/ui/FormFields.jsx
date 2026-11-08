import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff, ChevronDown, Check } from 'lucide-react'
import { cn } from '../../utils/cn'

const fieldBase =
  'peer h-12 w-full rounded-xl border bg-white text-[15px] text-ink placeholder:text-muted/70 transition-all duration-200 outline-none focus:border-electric focus:ring-4 focus:ring-electric/10 disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70'

function FieldShell({ id, label, hint, error, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-electric">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

/** Input de texto con icono opcional y soporte para contraseña. */
export const TextField = forwardRef(function TextField(
  { label, hint, error, icon: Icon, type = 'text', className, inputClassName, required, id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted/70"
            aria-hidden
          />
        )}
        <input
          ref={ref}
          id={fieldId}
          type={isPassword && showPassword ? 'text' : type}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(
            fieldBase,
            error ? 'border-red-300' : 'border-line hover:border-electric/30',
            Icon ? 'pl-11' : 'pl-4',
            isPassword ? 'pr-12' : 'pr-4',
            inputClassName,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        )}
      </div>
    </FieldShell>
  )
})

/** Select nativo estilizado. options: [{ value, label }] | string[] */
export const SelectField = forwardRef(function SelectField(
  { label, hint, error, options = [], placeholder, className, required, id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          className={cn(
            fieldBase,
            'cursor-pointer appearance-none pr-11 pl-4',
            error ? 'border-red-300' : 'border-line hover:border-electric/30',
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const o = typeof opt === 'string' ? { value: opt, label: opt } : opt
            return (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            )
          })}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </FieldShell>
  )
})

/** Checkbox personalizado. */
export const CheckboxField = forwardRef(function CheckboxField({ label, error, className, id, ...rest }, ref) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={fieldId} className="group flex cursor-pointer items-start gap-3 text-sm text-muted">
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            className="peer size-5 cursor-pointer appearance-none rounded-md border border-line bg-white transition checked:border-electric checked:bg-electric focus-visible:ring-4 focus-visible:ring-electric/15 group-hover:border-electric/50"
            {...rest}
          />
          <Check
            className="pointer-events-none absolute size-3.5 text-white opacity-0 transition peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden
          />
        </span>
        <span className="leading-relaxed">{label}</span>
      </label>
      {error && <p className="pl-8 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
})
