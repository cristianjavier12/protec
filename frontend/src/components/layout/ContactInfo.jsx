import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { business, telHref, whatsappHref } from '../../config/business'
import { cn } from '../../utils/cn'

/**
 * Datos de contacto del negocio (solo los configurados).
 * tone="dark" para fondos azul marino (pie de página).
 */
export default function ContactInfo({ tone = 'light', className }) {
  const items = [
    business.phone && { icon: Phone, label: business.phone, href: telHref(business.phone) },
    business.whatsapp && { icon: MessageCircle, label: 'WhatsApp', href: whatsappHref(business.whatsapp), external: true },
    business.email && { icon: Mail, label: business.email, href: `mailto:${business.email}` },
    business.address && { icon: MapPin, label: business.address },
    business.hours && { icon: Clock, label: business.hours },
  ].filter(Boolean)

  if (!items.length) return null
  const dark = tone === 'dark'

  return (
    <ul className={cn('flex flex-col gap-2.5 text-sm', className)}>
      {items.map(({ icon: Icon, label, href, external }) => {
        const content = (
          <>
            <Icon className={cn('mt-0.5 size-4 shrink-0', dark ? 'text-aqua' : 'text-electric')} aria-hidden />
            <span className="break-words">{label}</span>
          </>
        )
        const cls = cn('flex items-start gap-2.5', dark ? 'text-white/75' : 'text-muted', href && (dark ? 'transition hover:text-white' : 'transition hover:text-electric'))
        return (
          <li key={label}>
            {href ? (
              <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {content}
              </a>
            ) : (
              <p className={cls}>{content}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
