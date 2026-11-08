import { Outlet } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, Activity, MessagesSquare, History } from 'lucide-react'
import { Container } from '../components/ui/Container'
import { LogoMark } from '../components/ui/Logo'

const benefits = [
  { icon: Activity, text: 'Sigue tu reparación en tiempo real' },
  { icon: MessagesSquare, text: 'Comunícate con el técnico asignado' },
  { icon: History, text: 'Conserva el historial de tus servicios' },
]

/**
 * Layout de autenticación: tarjeta dividida en dos columnas (escritorio)
 * y una sola columna en móvil. Las páginas /login y /registro se renderizan en <Outlet />.
 */
export default function AuthLayout() {
  return (
    <section className="relative overflow-hidden bg-surface pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

      <Container className="relative">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-card lg:grid-cols-[1fr_1.05fr]">
          {/* Panel visual (solo escritorio) */}
          <div className="bg-navy-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-electric/30 blur-3xl" />
            <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-aqua/20 blur-3xl" />

            <div className="relative flex items-center gap-2.5">
              <LogoMark className="size-10" />
              <span className="text-xl font-extrabold tracking-tight">
                PRO<span className="text-gradient">TEC</span>
              </span>
            </div>

            <div className="relative mt-auto pt-16">
              <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance xl:text-4xl">
                Tu reparación, <span className="text-gradient">clara y bajo control.</span>
              </h2>
              <ul className="mt-8 flex flex-col gap-4">
                {benefits.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-white/80">
                    <span className="grid size-9 place-items-center rounded-xl bg-white/[0.08] text-aqua ring-1 ring-white/10">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <div className="animate-float mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <CheckCircle2 className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Reparación completada</p>
                  <p className="text-xs text-white/60">#PRO-1025 · Laptop Lenovo</p>
                </div>
              </div>
            </div>

            <p className="relative mt-10 flex items-center gap-2 text-xs text-white/50">
              <ShieldCheck className="size-4" aria-hidden />
              Tus datos se manejan de forma segura.
            </p>
          </div>

          {/* Formulario */}
          <div className="p-6 sm:p-10 lg:p-14">
            <Outlet />
          </div>
        </div>
      </Container>
    </section>
  )
}
