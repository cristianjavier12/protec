import { LogoMark } from '../ui/Logo'

/** Indicador mostrado mientras se carga una página (code-splitting). */
export default function PageLoader() {
  return (
    <div className="grid min-h-[70vh] place-items-center pt-20" role="status" aria-label="Cargando">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-12 animate-pulse" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_linear_infinite] rounded-full bg-brand-gradient bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  )
}
