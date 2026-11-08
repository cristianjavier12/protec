import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Logo from '../ui/Logo'
import { Container } from '../ui/Container'
import ContactInfo from './ContactInfo'
import { footerNav } from '../../data/navigation'
import { business } from '../../config/business'
import { ROUTES } from '../../utils/routes'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy-gradient relative overflow-hidden text-white">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-electric/20 blur-3xl" />

      <Container className="relative">
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.3fr_2fr] lg:gap-16">
          <div className="max-w-sm">
            <Logo tone="light" />
            <p className="mt-5 leading-relaxed text-white/65">Tecnología para una reparación más clara, sencilla y transparente.</p>
            <ContactInfo tone="dark" className="mt-6" />
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {footerNav.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold tracking-wide text-white">{col.title}</h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="group inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white">
                        {link.label}
                        <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-white/50 sm:flex-row">
          <div>
            <p>© {year} {business.name}. Todos los derechos reservados.</p>
            {business.legalName && business.legalName !== business.name && (
              <p className="mt-1 text-xs text-white/40">Responsables: {business.legalName}.</p>
            )}
          </div>
          <nav aria-label="Información legal" className="flex shrink-0 items-center gap-5">
            <Link to={ROUTES.TERMS} className="transition hover:text-white">
              Términos y condiciones
            </Link>
            <Link to={ROUTES.PRIVACY} className="transition hover:text-white">
              Aviso de privacidad
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  )
}
