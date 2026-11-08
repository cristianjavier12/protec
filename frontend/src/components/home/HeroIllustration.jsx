import {
  CheckCircle2,
  UserCheck,
  Wrench,
  PackageCheck,
  ScanSearch,
  BatteryFull,
  MonitorX,
  HardDrive,
  Cpu,
  Activity,
} from 'lucide-react'
import { cn } from '../../utils/cn'

/** Tarjeta flotante de estado. */
function StatusCard({ icon: Icon, title, subtitle, tone = 'blue', className, delay = '0s' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-electric/10 text-electric',
    cyan: 'bg-aqua/15 text-[#0899c9]',
    navy: 'bg-navy text-aqua',
  }
  return (
    <div
      className={cn(
        'glass absolute z-20 flex items-center gap-2.5 rounded-2xl border border-white/80 p-2.5 pr-3.5 shadow-card sm:gap-3 sm:p-3 sm:pr-4',
        'animate-float',
        className,
      )}
      style={{ animationDelay: delay }}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl sm:size-10', tones[tone])}>
        <Icon className="size-4 sm:size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight font-bold whitespace-nowrap text-ink sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[10px] leading-tight whitespace-nowrap text-muted sm:text-xs">{subtitle}</p>
      </div>
    </div>
  )
}

/** Fila del panel de diagnóstico en la laptop. */
function CheckRow({ icon: Icon, label, status }) {
  const ok = status === 'ok'
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-1.5 py-1 sm:gap-2 sm:rounded-lg sm:px-2 sm:py-1.5">
      <Icon className={cn('size-2.5 sm:size-3.5', ok ? 'text-aqua' : 'text-amber-300')} aria-hidden />
      <span className="flex-1 truncate text-[7px] text-white/80 sm:text-[10px]">{label}</span>
      <span
        className={cn(
          'rounded px-1 text-[6px] font-semibold sm:rounded-md sm:px-1.5 sm:py-0.5 sm:text-[9px]',
          ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300',
        )}
      >
        {ok ? 'Correcto' : 'Revisar'}
      </span>
    </div>
  )
}

/**
 * Ilustración del Hero construida con HTML/CSS:
 * laptop con panel de diagnóstico + teléfono con estado de reparación
 * + herramientas + tarjetas flotantes de estado.
 */
export default function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none" aria-hidden>
      {/* Fondo */}
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-electric/15 via-aqua/10 to-transparent blur-2xl" />
      <div className="absolute inset-[14%] rounded-full border border-dashed border-electric/20" />
      <div className="absolute inset-[26%] rounded-full border border-electric/10" />

      {/* Laptop */}
      <div className="absolute top-[22%] left-[3%] w-[76%]">
        <div className="relative aspect-[16/10] rounded-t-[14px] border-[5px] border-b-0 border-[#0d2342] bg-navy p-[4%] shadow-2xl shadow-navy/30 sm:rounded-t-[20px] sm:border-[7px]">
          <div className="flex h-full flex-col overflow-hidden rounded-md bg-gradient-to-br from-[#0c2446] to-[#081a33] p-[4%] sm:rounded-lg">
            {/* barra superior */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="size-1 rounded-full bg-red-400/80 sm:size-1.5" />
                <span className="size-1 rounded-full bg-amber-300/80 sm:size-1.5" />
                <span className="size-1 rounded-full bg-emerald-400/80 sm:size-1.5" />
              </div>
              <span className="text-[6px] font-semibold tracking-wider text-white/40 uppercase sm:text-[9px]">
                Diagnóstico PROTEC
              </span>
            </div>

            <div className="mt-[4%] grid flex-1 grid-cols-[38%_1fr] gap-[4%]">
              {/* anillo de análisis */}
              <div className="flex flex-col items-center justify-center rounded-lg bg-white/[0.04] p-1">
                <div className="relative grid aspect-square w-[80%] place-items-center">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(255 255 255 / .08)" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="url(#hero-ring)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="97.4"
                      strokeDashoffset="24"
                    />
                    <defs>
                      <linearGradient id="hero-ring" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#247CFF" />
                        <stop offset="1" stopColor="#18C8FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="text-center">
                    <p className="text-[9px] leading-none font-bold text-white sm:text-base">75%</p>
                    <p className="mt-0.5 text-[5px] text-white/50 sm:text-[8px]">analizado</p>
                  </div>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[6px] text-aqua sm:text-[9px]">
                  <ScanSearch className="size-2 sm:size-3" /> Escaneando
                </p>
              </div>

              {/* checks */}
              <div className="flex flex-col justify-between gap-[3%]">
                <CheckRow icon={BatteryFull} label="Batería" status="ok" />
                <CheckRow icon={HardDrive} label="Almacenamiento" status="ok" />
                <CheckRow icon={MonitorX} label="Señal de video" status="warn" />
                <CheckRow icon={Cpu} label="Procesador" status="ok" />
              </div>
            </div>
          </div>
        </div>
        {/* base */}
        <div className="relative -mx-[7%] h-[10px] rounded-b-2xl bg-gradient-to-b from-[#dfe7f1] to-[#b8c5d6] shadow-lg sm:h-[14px]">
          <div className="absolute top-0 left-1/2 h-[40%] w-[16%] -translate-x-1/2 rounded-b-md bg-[#c6d2e1]" />
        </div>
      </div>

      {/* Teléfono */}
      <div className="absolute right-[3%] bottom-[11%] z-10 w-[29%]">
        <div className="aspect-[9/18.5] rounded-[18px] border-[4px] border-[#0d2342] bg-navy p-[3px] shadow-2xl shadow-navy/40 sm:rounded-[28px] sm:border-[6px]">
          <div className="relative flex h-full flex-col overflow-hidden rounded-[13px] bg-white p-[9%] sm:rounded-[20px]">
            <div className="mx-auto mb-[8%] h-[3%] w-[34%] rounded-full bg-navy/90" />
            <p className="text-[6px] font-semibold text-muted sm:text-[9px]">Solicitud</p>
            <p className="text-[8px] font-bold text-ink sm:text-xs">#PRO-1025</p>

            <div className="mt-[8%] rounded-lg bg-surface p-[8%]">
              <div className="flex items-center justify-between">
                <span className="text-[6px] font-semibold text-ink sm:text-[9px]">Progreso</span>
                <span className="text-[6px] font-bold text-electric sm:text-[9px]">60%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-line sm:h-1.5">
                <div className="h-full w-[60%] rounded-full bg-brand-gradient" />
              </div>
            </div>

            <div className="mt-[10%] flex flex-1 flex-col gap-[7%]">
              {['Diagnóstico', 'Técnico', 'Recibido', 'Reparando'].map((step, i) => (
                <div key={step} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'grid size-2.5 shrink-0 place-items-center rounded-full sm:size-3.5',
                      i < 3 ? 'bg-emerald-500' : 'animate-pulse-ring bg-electric',
                    )}
                  >
                    {i < 3 && <CheckCircle2 className="size-2 text-white sm:size-2.5" />}
                  </span>
                  <span className={cn('text-[6px] sm:text-[9px]', i < 3 ? 'text-muted' : 'font-semibold text-ink')}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-center gap-1 rounded-lg bg-brand-gradient py-[6%] text-[6px] font-semibold text-white sm:text-[9px]">
              <Activity className="size-2 sm:size-3" /> En vivo
            </div>
          </div>
        </div>
      </div>

      {/* Herramientas */}
      <div
        className="animate-float-slow absolute top-[17%] left-[44%] z-10 grid size-[11%] place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
        style={{ animationDelay: '1.2s' }}
      >
        <Wrench className="size-[45%]" />
      </div>
      <div
        className="animate-float-slow absolute right-[30%] bottom-[6%] z-0 grid size-[9%] place-items-center rounded-xl border border-line bg-white text-electric shadow-soft"
        style={{ animationDelay: '2.4s' }}
      >
        <Cpu className="size-[50%]" />
      </div>

      {/* Tarjetas flotantes */}
      <StatusCard
        icon={CheckCircle2}
        tone="green"
        title="Diagnóstico completado"
        subtitle="Falla identificada"
        className="top-[5%] left-0"
        delay="0s"
      />
      <StatusCard
        icon={UserCheck}
        tone="blue"
        title="Técnico asignado"
        subtitle="Carlos M."
        className="top-[9%] right-0"
        delay="1.5s"
      />
      <StatusCard
        icon={Wrench}
        tone="cyan"
        title="En reparación"
        subtitle="Reemplazo en curso"
        className="bottom-[15%] left-0"
        delay="0.8s"
      />
      <StatusCard
        icon={PackageCheck}
        tone="navy"
        title="Listo para entrega"
        subtitle="Próxima etapa"
        className="right-[35%] bottom-0"
        delay="2.2s"
      />
    </div>
  )
}
