import { Link } from 'react-router-dom'
import LegalDocument from '../components/legal/LegalDocument'
import { business, responsibleName } from '../config/business'
import { usePageTitle } from '../hooks/usePageTitle'
import { ROUTES } from '../utils/routes'

const PrivacyContact = () =>
  business.privacyEmail ? (
    <a href={`mailto:${business.privacyEmail}`} className="font-semibold text-electric hover:underline">
      {business.privacyEmail}
    </a>
  ) : (
    <span>los medios de contacto publicados en la sección de Ayuda</span>
  )

/**
 * Aviso de privacidad integral (Ley Federal de Protección de Datos Personales en Posesión de los Particulares).
 * Los datos del responsable se configuran con VITE_BUSINESS_* (ver .env.example).
 */
export default function PrivacyPage() {
  usePageTitle('Aviso de privacidad')
  const isPluralResponsible = responsibleName.includes(',') || /\s+y\s+/i.test(responsibleName)

  const sections = [
    {
      id: 'responsable',
      title: 'Identidad y domicilio del responsable',
      content: (
        <>
          <p>
            <strong>{responsibleName}</strong>
            {business.rfc ? ` (RFC ${business.rfc})` : ''}, en adelante “{business.name}”,{' '}
            {isPluralResponsible ? 'son responsables' : 'es responsable'} del uso y protección de los datos personales que nos proporcionas a través de este
            sitio web y de nuestros servicios de reparación.
          </p>
          {business.address && (
            <p>
              Domicilio para oír y recibir notificaciones: <strong>{business.address}</strong>.
            </p>
          )}
          <p>
            Contacto en materia de datos personales: <PrivacyContact />.
          </p>
        </>
      ),
    },
    {
      id: 'datos',
      title: 'Datos personales que recabamos',
      content: (
        <>
          <p>Para las finalidades descritas en este aviso podemos recabar:</p>
          <ul>
            <li>Datos de identificación y contacto: nombre, apellidos, correo electrónico y teléfono.</li>
            <li>Domicilio para la recolección o entrega a domicilio de tu dispositivo, cuando lo solicitas.</li>
            <li>Datos del dispositivo: tipo, marca, modelo y número de serie (opcional).</li>
            <li>Descripción del problema, fotografías del dispositivo y mensajes que intercambias con el técnico.</li>
            <li>Información de pagos: monto, fecha, método y referencia de la operación.</li>
            <li>Datos técnicos necesarios para mantener tu sesión iniciada de forma segura.</li>
          </ul>
          <p>
            <strong>No recabamos datos personales sensibles.</strong> Te pedimos no incluir en las fotografías ni en los mensajes información personal que no
            sea necesaria para la reparación.
          </p>
          <p>
            Los pagos con tarjeta se procesan directamente en la plataforma de <strong>Stripe</strong>: {business.name} no recibe ni almacena el número, la
            fecha de vencimiento ni el código de seguridad de tu tarjeta.
          </p>
        </>
      ),
    },
    {
      id: 'finalidades',
      title: 'Finalidades del tratamiento',
      content: (
        <>
          <p>
            <strong>Finalidades necesarias</strong> para prestar el servicio que solicitas:
          </p>
          <ul>
            <li>Crear y administrar tu cuenta, verificar tu correo e iniciar sesión.</li>
            <li>Recibir, diagnosticar y dar seguimiento a tus solicitudes de reparación.</li>
            <li>Asignarte un técnico y permitir la comunicación entre ambos.</li>
            <li>Elaborar presupuestos, procesar pagos y emitir los comprobantes que correspondan.</li>
            <li>Coordinar la recolección y la entrega de tu dispositivo.</li>
            <li>Enviarte avisos sobre el estado de tu reparación por la plataforma y por correo electrónico.</li>
            <li>Conservar el historial del servicio para atender aclaraciones y garantías.</li>
            <li>Cumplir obligaciones legales y atender requerimientos de autoridades competentes.</li>
          </ul>
          <p>
            <strong>Finalidad adicional:</strong> conocer tu opinión sobre el servicio (calificación) para mejorar nuestra atención. Si no deseas que tus datos
            se usen para esta finalidad, puedes indicarlo escribiendo a <PrivacyContact />; tu negativa no afecta el servicio que solicitaste.
          </p>
        </>
      ),
    },
    {
      id: 'transferencias',
      title: 'Transferencias y proveedores',
      content: (
        <>
          <p>
            No vendemos ni compartimos tus datos personales con terceros para fines propios de ellos. Solo los comunicamos sin tu consentimiento en los casos
            previstos por la ley o por requerimiento de una autoridad competente.
          </p>
          <p>Para operar la plataforma nos apoyamos en proveedores que tratan datos únicamente por cuenta nuestra y bajo nuestras instrucciones:</p>
          <ul>
            <li>Servicios de alojamiento del sitio y de la base de datos.</li>
            <li>Cloudinary, para almacenar las fotografías de los dispositivos.</li>
            <li>Stripe, para procesar los pagos con tarjeta.</li>
            <li>Un proveedor de envío de correo electrónico, para avisos y verificación de cuenta.</li>
          </ul>
          <p>Dentro de {business.name}, solo el técnico asignado a tu solicitud y el personal administrativo autorizado pueden consultar su información.</p>
        </>
      ),
    },
    {
      id: 'arco',
      title: 'Derechos ARCO y revocación del consentimiento',
      content: (
        <>
          <p>
            Tienes derecho a <strong>acceder</strong> a tus datos personales, <strong>rectificarlos</strong> si son inexactos, <strong>cancelarlos</strong>{' '}
            cuando consideres que no se requieren para las finalidades señaladas y <strong>oponerte</strong> a su uso para fines específicos. También puedes
            revocar el consentimiento que nos otorgaste o limitar el uso de tus datos.
          </p>
          <p>
            Para ejercerlos, envía tu solicitud a <PrivacyContact /> indicando: tu nombre y el correo de tu cuenta; un documento que acredite tu identidad (o
            la de tu representante); la descripción clara del derecho que deseas ejercer y de los datos involucrados; y cualquier elemento que facilite su
            localización.
          </p>
          <p>
            Te responderemos en un plazo máximo de 20 días hábiles a partir de la recepción de tu solicitud y, si resulta procedente, la haremos efectiva dentro
            de los 15 días hábiles siguientes.
          </p>
          <p>
            Puedes actualizar tu nombre y teléfono en cualquier momento desde{' '}
            <Link to={ROUTES.MY_ACCOUNT} className="font-semibold text-electric hover:underline">
              Mi cuenta
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      id: 'tecnologias',
      title: 'Cookies y tecnologías similares',
      content: (
        <>
          <p>
            No utilizamos cookies de publicidad ni de rastreo. Usamos el almacenamiento local de tu navegador únicamente para mantener tu sesión iniciada y
            conservar temporalmente el borrador de una solicitud. Puedes eliminar esta información cerrando sesión o borrando los datos del sitio en tu
            navegador.
          </p>
          <p>Las tipografías del sitio se cargan desde Google Fonts, que puede recibir datos técnicos de conexión como tu dirección IP.</p>
        </>
      ),
    },
    {
      id: 'seguridad',
      title: 'Medidas de seguridad',
      content: (
        <p>
          Protegemos tus datos con medidas administrativas, técnicas y físicas: conexiones cifradas (HTTPS), contraseñas almacenadas de forma irreversible,
          acceso restringido según el rol de cada persona y verificación de permisos en cada consulta.
        </p>
      ),
    },
    {
      id: 'cambios',
      title: 'Cambios a este aviso',
      content: (
        <p>
          Este aviso puede modificarse por cambios legales, en nuestros servicios o en nuestras prácticas de privacidad. Publicaremos cualquier cambio en esta
          misma página, indicando la fecha de la última actualización.
        </p>
      ),
    },
    {
      id: 'autoridad',
      title: 'Autoridad competente',
      content: (
        <p>
          Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir ante la autoridad competente en materia de
          protección de datos personales en México.
        </p>
      ),
    },
  ]

  return (
    <LegalDocument
      eyebrow="Información legal"
      title="Aviso de privacidad"
      updated={business.legalUpdated}
      intro={
        <p>
          En {business.name} nos tomamos en serio la privacidad de tus datos. Este aviso explica qué información recabamos, para qué la usamos y cómo puedes
          ejercer tus derechos, en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
        </p>
      }
      sections={sections}
    />
  )
}
